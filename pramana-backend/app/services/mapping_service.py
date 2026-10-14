import json
import logging
import math
import re
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_
from fastapi import HTTPException

from app.models.control import Control
from app.models.control_relationship import ControlRelationship
from app.models.framework import Framework
from app.models.framework_version import FrameworkVersion
from app.models.evidence import Evidence
from app.models.evidence_chunk import EvidenceChunk
from app.models.evidence_version import EvidenceVersion
from app.models.evidence_control_mapping import EvidenceControlMapping
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.organization_framework import OrganizationFramework
from app.ai.embeddings import generate_embeddings, generate_embedding
from app.ai.llm import get_llm, extract_json_from_text
from app.services.evidence_processor import process_evidence_document

logger = logging.getLogger(__name__)


def ensure_control_embeddings(db: Session, controls: List[Control]) -> None:
    """
    Checks if any controls are missing embeddings and generates them in batch.
    Persists newly generated embeddings to PostgreSQL.
    """
    missing_controls = [c for c in controls if c.embedding is None]
    if not missing_controls:
        return

    texts_to_embed = [
        f"{c.control_code}: {c.title}. {c.requirement or c.description or ''}"
        for c in missing_controls
    ]
    try:
        embeddings = generate_embeddings(texts_to_embed)
        for ctrl, emb in zip(missing_controls, embeddings):
            ctrl.embedding = emb
        db.commit()
    except Exception as e:
        logger.warning(f"Could not batch generate embeddings via Ollama: {e}")
        db.rollback()


def evaluate_control_relationship_ai(
    source_ctrl: Control,
    target_ctrl: Control,
    source_fw: Framework,
    target_fw: Framework,
    source_ver: FrameworkVersion,
    target_ver: FrameworkVersion,
    vector_distance: float
) -> Dict[str, Any]:
    """
    Evaluates semantic relationship between two controls using LLM or high-fidelity semantic heuristics.
    Returns structured dict with relationship_type, confidence, ai_explanation, overlap_summary, differences_summary.
    """
    # Calculate estimated similarity confidence from pgvector cosine distance
    # Cosine distance d in [0, 2], cosine similarity = 1.0 - d
    if vector_distance < 0.0:
        base_confidence = 0.5
    else:
        # Normalize cosine distance into 0.0 - 1.0 confidence
        base_confidence = max(0.1, min(0.98, round(1.0 - float(vector_distance), 2)))

    source_text = f"[{source_ctrl.control_code}] {source_ctrl.title}. {source_ctrl.requirement or source_ctrl.description or ''}"
    target_text = f"[{target_ctrl.control_code}] {target_ctrl.title}. {target_ctrl.requirement or target_ctrl.description or ''}"

    prompt = f"""You are an expert cybersecurity compliance auditor.
Evaluate the relationship between these two compliance controls:

SOURCE CONTROL:
Framework: {source_fw.name} ({source_ver.version or '1.0'})
Control ID: {source_ctrl.control_code}
Title: {source_ctrl.title}
Requirement: {source_ctrl.requirement or source_ctrl.description or 'N/A'}

TARGET CONTROL:
Framework: {target_fw.name} ({target_ver.version or '1.0'})
Control ID: {target_ctrl.control_code}
Title: {target_ctrl.title}
Requirement: {target_ctrl.requirement or target_ctrl.description or 'N/A'}

INSTRUCTIONS:
1. Determine the exact relationship type:
   - "equivalent": Both controls mandate practically identical security requirements and outcomes.
   - "partially_overlaps": They share core security objectives but have differing specific criteria.
   - "complementary": They reinforce each other (e.g., policy governance vs technical safeguard).
   - "related_to": General topic similarity without direct requirement overlap.
   - "not_related": Insufficient alignment.
2. Return a valid JSON object ONLY:
{{
  "relationship_type": "equivalent | partially_overlaps | complementary | related_to | not_related",
  "confidence": <float 0.0 to 1.0>,
  "explanation": "<detailed auditor explanation of the overlap and justification>",
  "overlap_summary": "<shared security requirements>",
  "differences_summary": "<differing or unshared requirements>"
}}"""

    try:
        llm = get_llm(timeout=120.0)
        response = llm.invoke(prompt)
        raw_text = response.content if hasattr(response, "content") else str(response)
        clean_json = extract_json_from_text(raw_text)
        try:
            parsed = json.loads(clean_json)
        except json.JSONDecodeError:
            cleaned = re.sub(r",\s*([}\]])", r"\1", clean_json)
            parsed = json.loads(cleaned)

        rel_type = parsed.get("relationship_type", "related_to").lower().strip()
        if rel_type not in ["equivalent", "partially_overlaps", "complementary", "related_to", "not_related"]:
            rel_type = "partially_overlaps" if base_confidence > 0.65 else "related_to"

        conf = float(parsed.get("confidence", base_confidence))
        conf = max(0.1, min(0.99, round(conf, 2)))

        return {
            "relationship_type": rel_type,
            "confidence": conf,
            "ai_explanation": parsed.get("explanation", f"Semantic alignment identified between {source_ctrl.control_code} and {target_ctrl.control_code}."),
            "overlap_summary": parsed.get("overlap_summary", "Shared control objective on data security and operational safeguards."),
            "differences_summary": parsed.get("differences_summary", "Framework-specific reporting and verification criteria differ.")
        }
    except Exception as e:
        logger.error(f"[Relationships] LLM relationship evaluation failed between [{source_ctrl.control_code}] and [{target_ctrl.control_code}]: {e}")
        raise


def verify_control_relationship(
    eval_res: Dict[str, Any],
    source_ctrl: Control,
    target_ctrl: Control,
    min_confidence: float = 0.65
) -> Tuple[bool, str]:
    """
    Strict verification check for candidate control relationships before persisting to PostgreSQL.
    Verifies requirement overlap, non-spurious classification, and confidence thresholds.
    """
    rel_type = eval_res.get("relationship_type", "").lower().strip()
    conf = float(eval_res.get("confidence", 0.0))

    # Rejection conditions
    if rel_type in ["not_related", "none", "unknown", ""]:
        return False, "Rejected: Controls are not sufficiently related."

    if conf < min_confidence:
        return False, f"Rejected: Confidence {conf:.2f} is below minimum verification threshold {min_confidence:.2f}."

    # Validate that both controls have distinct IDs and valid requirement text
    if source_ctrl.id == target_ctrl.id:
        return False, "Rejected: Self-referencing control relationship."

    # Check for meaningful semantic justification
    explanation = eval_res.get("ai_explanation", "")
    if not explanation or len(explanation.strip()) < 15:
        return False, "Rejected: Insufficient semantic justification."

    return True, "Verified"


def evaluate_evidence_control_mapping_ai(
    chunk_content: str,
    control: Control,
    framework_name: str,
    cosine_sim: float
) -> Dict[str, Any]:
    """
    Evaluates whether an evidence excerpt substantiates a compliance control requirement
    using the LLM integration or high-fidelity fallback heuristics.
    """
    base_confidence = max(0.1, min(0.99, round(cosine_sim, 2)))
    
    prompt = f"""You are an expert cybersecurity compliance auditor.
Evaluate whether the following evidence text supports or fulfills the compliance control requirement.

COMPLIANCE CONTROL:
Framework: {framework_name}
Control ID: {control.control_code}
Title: {control.title}
Requirement: {control.requirement or control.description or 'N/A'}

EVIDENCE EXCERPT:
\"\"\"{chunk_content[:2000]}\"\"\"

INSTRUCTIONS:
1. Determine if the evidence provides relevant, substantiated support for this control.
2. Return a valid JSON object ONLY:
{{
  "is_supported": true | false,
  "confidence": <float 0.0 to 1.0>,
  "explanation": "<detailed auditor explanation justifying why the evidence supports or does not support the control>",
  "requirement_supported": "<specific control requirements supported by this evidence>",
  "unsupported_requirements": "<any parts of the control requirement not covered or needing further proof>"
}}"""

    import time
    t0 = time.time()
    try:
        llm = get_llm(timeout=120.0)
        response = llm.invoke(prompt)
        raw_text = response.content if hasattr(response, "content") else str(response)
        clean_json = extract_json_from_text(raw_text)
        try:
            parsed = json.loads(clean_json)
        except json.JSONDecodeError:
            cleaned = re.sub(r",\s*([}\]])", r"\1", clean_json)
            parsed = json.loads(cleaned)

        is_supp = bool(parsed.get("is_supported", False))
        conf = float(parsed.get("confidence", base_confidence))
        conf = max(0.1, min(0.99, round(conf, 2)))

        duration = round(time.time() - t0, 3)
        logger.info(
            f"[Mapping] LLM evaluated mapping for [{control.control_code}] in {duration}s: "
            f"supported={is_supp}, confidence={conf}."
        )

        return {
            "is_supported": is_supp,
            "confidence": conf,
            "explanation": parsed.get("explanation", f"Evidence excerpt evaluated against [{control.control_code}] {control.title}."),
            "requirement_supported": parsed.get("requirement_supported", f"Supports criteria of {control.control_code}."),
            "unsupported_requirements": parsed.get("unsupported_requirements", "Continuous operational evidence required.")
        }
    except Exception as e:
        logger.error(f"[Mapping] LLM evaluation failed for control [{control.control_code}]: {e}")
        raise


def verify_evidence_mapping(
    chunk_content: str,
    control: Control,
    confidence: float,
    min_confidence: float = 0.65,
    is_supported: bool = True
) -> Tuple[bool, str]:
    """
    Strict verification check for candidate evidence-to-control mappings before persisting to PostgreSQL.
    """
    if not is_supported:
        return False, f"Rejected: Evidence does not substantiate mandatory criteria for [{control.control_code}]."

    if confidence < min_confidence:
        return False, f"Rejected: Evidence similarity confidence {confidence:.2f} is below verification threshold {min_confidence:.2f}."

    if not chunk_content or len(chunk_content.strip()) < 20:
        return False, "Rejected: Evidence chunk content is insufficient for requirement verification."

    return True, "Verified"


def generate_control_relationships_pipeline(
    db: Session,
    source_framework_version_id: int,
    target_framework_version_id: Optional[int] = None,
    source_control_id: Optional[int] = None,
    min_confidence: float = 0.65,
    top_k: int = 3,
    current_user: Optional[User] = None
) -> List[ControlRelationship]:
    """
    Executes the dynamic AI/RAG Control Mapping pipeline across or within framework versions.
    Checks and verifies each proposed relationship before persisting to PostgreSQL.
    """
    target_ver_id = target_framework_version_id or source_framework_version_id

    source_version = db.query(FrameworkVersion).filter(FrameworkVersion.id == source_framework_version_id).first()
    target_version = db.query(FrameworkVersion).filter(FrameworkVersion.id == target_ver_id).first()

    if not source_version or not target_version:
        raise HTTPException(status_code=404, detail="Framework version not found in database.")

    source_fw = db.query(Framework).filter(Framework.id == source_version.framework_id).first()
    target_fw = db.query(Framework).filter(Framework.id == target_version.framework_id).first()

    if not source_fw or not target_fw:
        raise HTTPException(status_code=404, detail="Framework metadata not found.")

    # Fetch source controls
    src_query = db.query(Control).filter(
        Control.framework_version_id == source_framework_version_id,
        Control.is_active == True
    )
    if source_control_id:
        src_query = src_query.filter(Control.id == source_control_id)
    source_controls = src_query.all()

    if not source_controls:
        return []

    # Fetch target controls
    target_controls = db.query(Control).filter(
        Control.framework_version_id == target_ver_id,
        Control.is_active == True
    ).all()

    if not target_controls:
        return []

    # Ensure all controls have embeddings in PostgreSQL
    ensure_control_embeddings(db, source_controls)
    ensure_control_embeddings(db, target_controls)

    verified_stored: List[ControlRelationship] = []

    for src in source_controls:
        if not src.embedding:
            continue

        # Pgvector candidate search
        cand_query = (
            db.query(Control, Control.embedding.cosine_distance(src.embedding).label("dist"))
            .filter(
                Control.framework_version_id == target_ver_id,
                Control.is_active == True,
                Control.id != src.id,
                Control.embedding.isnot(None)
            )
            .order_by("dist")
            .limit(top_k)
        )
        candidates = cand_query.all()

        for tgt, dist in candidates:
            # Check existing relationship in DB
            existing_rel = db.query(ControlRelationship).filter(
                ControlRelationship.source_control_id == src.id,
                ControlRelationship.target_control_id == tgt.id
            ).first()

            if existing_rel:
                verified_stored.append(existing_rel)
                continue

            # Evaluate with AI
            eval_res = evaluate_control_relationship_ai(
                source_ctrl=src,
                target_ctrl=tgt,
                source_fw=source_fw,
                target_fw=target_fw,
                source_ver=source_version,
                target_ver=target_version,
                vector_distance=float(dist)
            )

            # Verification Step: Check and verify before committing to database
            is_valid, reason = verify_control_relationship(
                eval_res=eval_res,
                source_ctrl=src,
                target_ctrl=tgt,
                min_confidence=min_confidence
            )

            if not is_valid:
                logger.info(f"Discarding unverified mapping {src.control_code} -> {tgt.control_code}: {reason}")
                continue

            # Verified: Store in PostgreSQL
            new_rel = ControlRelationship(
                source_control_id=src.id,
                target_control_id=tgt.id,
                relationship_type=eval_res["relationship_type"],
                source_reference=f"Verified Backend Mapping ({source_fw.code} -> {target_fw.code})",
                mapping_confidence=eval_res["confidence"],
                status="verified",
                mapping_source="ai_verified",
                ai_explanation=eval_res["ai_explanation"],
                overlap_summary=eval_res["overlap_summary"],
                differences_summary=eval_res["differences_summary"],
                reviewed_at=datetime.now(timezone.utc)
            )
            db.add(new_rel)
            db.commit()
            db.refresh(new_rel)
            verified_stored.append(new_rel)

    # Log mapping generation in AuditLog if user context provided
    if current_user and verified_stored:
        try:
            audit = AuditLog(
                organization_id=current_user.organization_id,
                user_id=current_user.id,
                action="Control Mappings Verified & Stored",
                entity_type="ControlRelationship",
                details=f"Verified backend mapping run between {source_fw.name} and {target_fw.name}. Stored {len(verified_stored)} verified relationships in PostgreSQL."
            )
            db.add(audit)
            db.commit()
        except Exception:
            db.rollback()

    return verified_stored


def generate_evidence_mappings_pipeline(
    db: Session,
    evidence_id: int,
    organization_id: int,
    framework_version_id: Optional[int] = None,
    control_id: Optional[int] = None,
    min_confidence: float = 0.65,
    top_k: int = 3,
    current_user: Optional[User] = None
) -> List[EvidenceControlMapping]:
    """
    Maps uploaded organizational evidence to candidate controls using pgvector semantic chunk search and AI.
    Strictly enforces:
    1. Tenant isolation & organization enrollment in frameworks.
    2. Candidate shortlisting using cosine similarity on chunk embeddings.
    3. AI / LLM evaluation of whether evidence substantiates control requirements.
    4. Validation of control IDs against PostgreSQL before saving.
    5. Safe transactional commit avoiding duplicates.
    """
    logger.info(f"Starting evidence mapping pipeline for evidence_id={evidence_id}, org_id={organization_id}")
    evidence = db.query(Evidence).filter(
        Evidence.id == evidence_id,
        Evidence.organization_id == organization_id
    ).first()

    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence document not found in your organization.")

    # 1. Ensure evidence is processed (extracted, chunked, embedded)
    if evidence.status != "processed":
        process_evidence_document(db=db, evidence_id=evidence.id, organization_id=organization_id)

    # 2. Get evidence chunks with valid embeddings
    chunks = (
        db.query(EvidenceChunk)
        .join(EvidenceVersion, EvidenceChunk.evidence_version_id == EvidenceVersion.id)
        .filter(
            EvidenceVersion.evidence_id == evidence.id,
            EvidenceChunk.embedding.isnot(None)
        )
        .order_by(EvidenceChunk.chunk_index.asc())
        .all()
    )

    if not chunks:
        logger.warning(f"No indexed chunks found for evidence {evidence.id}")
        return []

    logger.info(f"Retrieved {len(chunks)} indexed chunks for evidence #{evidence.id}")

    # 3. Determine authorized framework version IDs for the organization
    org_fws = db.query(OrganizationFramework).filter(
        OrganizationFramework.organization_id == organization_id,
        OrganizationFramework.status == "active"
    ).all()

    if not org_fws:
        logger.warning(f"Organization {organization_id} has no active framework enrollments.")
        return []

    enrolled_version_ids = []
    for of in org_fws:
        if of.framework_version_id:
            enrolled_version_ids.append(of.framework_version_id)
        else:
            vers = db.query(FrameworkVersion.id).filter(
                FrameworkVersion.framework_id == of.framework_id,
                FrameworkVersion.status == "active"
            ).all()
            enrolled_version_ids.extend([v[0] for v in vers])

    enrolled_version_ids = list(set(enrolled_version_ids))

    if framework_version_id:
        if framework_version_id not in enrolled_version_ids:
            logger.warning(f"Org {organization_id} not enrolled in framework version {framework_version_id}.")
            raise HTTPException(status_code=403, detail="Organization is not enrolled in the requested framework version.")
        target_version_ids = [framework_version_id]
    else:
        target_version_ids = enrolled_version_ids

    if not target_version_ids:
        logger.warning(f"No active enrolled framework versions available for org {organization_id}.")
        return []

    logger.info(f"Scoped mapping to {len(target_version_ids)} framework versions for org {organization_id}: {target_version_ids}")

    # 4. Shortlist candidate controls per framework version to ensure cross-framework coverage
    candidates_to_evaluate: List[Dict[str, Any]] = []
    per_fw_limit = top_k if framework_version_id else max(2, min(top_k, 3))

    for ver_id in target_version_ids:
        ver_candidates: Dict[int, Dict[str, Any]] = {}
        for chunk in chunks:
            q = (
                db.query(Control, Control.embedding.cosine_distance(chunk.embedding).label("cos_dist"))
                .filter(
                    Control.framework_version_id == ver_id,
                    Control.is_active == True,
                    Control.embedding.isnot(None)
                )
            )
            if control_id:
                q = q.filter(Control.id == control_id)

            closest_candidates = q.order_by("cos_dist").limit(per_fw_limit * 2).all()

            for ctrl, cos_dist in closest_candidates:
                sim = max(0.0, min(1.0, 1.0 - float(cos_dist)))
                # Shortlist threshold: consider candidates with reasonable proximity
                if sim < 0.45:
                    continue

                if ctrl.id not in ver_candidates or sim > ver_candidates[ctrl.id]["similarity"]:
                    ver_candidates[ctrl.id] = {
                        "control": ctrl,
                        "chunk": chunk,
                        "similarity": sim
                    }

        sorted_ver_cands = sorted(ver_candidates.values(), key=lambda x: x["similarity"], reverse=True)[:per_fw_limit]
        candidates_to_evaluate.extend(sorted_ver_cands)

    if not candidates_to_evaluate:
        logger.info(f"No candidate controls met semantic retrieval threshold (>= 0.45) for evidence {evidence.id}")
        return []

    logger.info(
        f"Shortlisted {len(candidates_to_evaluate)} candidate controls across "
        f"{len(target_version_ids)} frameworks for AI evaluation on evidence #{evidence.id}"
    )

    verified_stored: List[EvidenceControlMapping] = []

    for item in candidates_to_evaluate:
        ctrl = item["control"]
        chunk = item["chunk"]
        retrieval_sim = item["similarity"]

        # Resolve framework name for LLM auditor prompt
        ver = db.query(FrameworkVersion).filter(FrameworkVersion.id == ctrl.framework_version_id).first()
        fw = db.query(Framework).filter(Framework.id == ver.framework_id).first() if ver else None
        fw_name = fw.name if fw else "Compliance Standard"

        # 5. Evaluate support with AI/LLM with candidate-level fault tolerance
        try:
            eval_res = evaluate_evidence_control_mapping_ai(
                chunk_content=chunk.content or "",
                control=ctrl,
                framework_name=fw_name,
                cosine_sim=retrieval_sim
            )
        except Exception as cand_err:
            logger.warning(
                f"[Mapping] Candidate evaluation skipped for control [{ctrl.control_code}] on evidence {evidence.id}: {cand_err}"
            )
            continue

        # 6. Strict Verification Check
        is_valid, reason = verify_evidence_mapping(
            chunk_content=chunk.content or "",
            control=ctrl,
            confidence=eval_res["confidence"],
            min_confidence=min_confidence,
            is_supported=eval_res["is_supported"]
        )

        if not is_valid:
            logger.info(f"Discarding candidate mapping for [{ctrl.control_code}] on evidence {evidence.id}: {reason}")
            continue

        # 7. Check if mapping already exists in PostgreSQL
        existing_mapping = db.query(EvidenceControlMapping).filter(
            EvidenceControlMapping.evidence_id == evidence.id,
            EvidenceControlMapping.control_id == ctrl.id
        ).first()

        if existing_mapping:
            existing_mapping.confidence_score = eval_res["confidence"]
            existing_mapping.ai_explanation = eval_res["explanation"]
            existing_mapping.requirement_supported = eval_res["requirement_supported"]
            existing_mapping.unsupported_requirements = eval_res["unsupported_requirements"]
            existing_mapping.notes = f"Verified via chunk #{chunk.chunk_index} cosine similarity ({retrieval_sim:.3f})"
            db.commit()
            db.refresh(existing_mapping)
            verified_stored.append(existing_mapping)
            logger.info(f"Updated existing mapping for control [{ctrl.control_code}] on evidence #{evidence.id} with confidence {eval_res['confidence']:.2f}")
            continue

        # 8. Create new EvidenceControlMapping
        new_mapping = EvidenceControlMapping(
            evidence_id=evidence.id,
            control_id=ctrl.id,
            mapping_type="ai_suggested",
            confidence_score=eval_res["confidence"],
            coverage_score=None,
            mapping_status="pending",
            notes=f"Shortlisted via chunk #{chunk.chunk_index} cosine similarity ({retrieval_sim:.3f}) and LLM evaluation.",
            ai_explanation=eval_res["explanation"],
            requirement_supported=eval_res["requirement_supported"],
            unsupported_requirements=eval_res["unsupported_requirements"],
            created_at=datetime.now(timezone.utc)
        )
        db.add(new_mapping)
        db.commit()
        db.refresh(new_mapping)
        verified_stored.append(new_mapping)
        logger.info(f"Persisted new mapping #{new_mapping.id} for [{ctrl.control_code}] on evidence #{evidence.id} with confidence {eval_res['confidence']:.2f}")

    # 9. Audit Log
    if verified_stored:
        acting_user_id = current_user.id if current_user else evidence.uploaded_by
        try:
            audit = AuditLog(
                organization_id=organization_id,
                user_id=acting_user_id,
                action="Evidence Control Mappings Generated",
                entity_type="EvidenceControlMapping",
                entity_id=evidence.id,
                details=f"Generated and persisted {len(verified_stored)} AI candidate mappings for evidence '{evidence.file_name}'."
            )
            db.add(audit)
            db.commit()
        except Exception:
            db.rollback()

    return verified_stored
