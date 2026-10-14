
import logging
import shutil
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
)
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user

from app.models.evidence import Evidence
from app.models.evidence_control_mapping import EvidenceControlMapping
from app.models.control import Control
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.framework import Framework
from app.models.framework_version import FrameworkVersion
from app.models.organization_framework import OrganizationFramework
from app.models.ai_run import AIRun
from app.models.ai_output import AIOutput
from app.models.gap_analysis import GapAnalysis
from app.models.evidence_chunk import EvidenceChunk
from app.models.evidence_version import EvidenceVersion
import json

from app.schemas.evidence import (
    EvidenceCreate,
    EvidenceResponse,
)


logger = logging.getLogger("pramana.routes.evidence")

router = APIRouter(
    prefix="/evidence",
    tags=["Evidence"],
)


# ---------------------------------------------------------
# Upload directory
# ---------------------------------------------------------

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# =========================================================
from app.services.rbac_service import get_user_effective_permissions

# =========================================================
# CREATE EVIDENCE
# =========================================================

@router.post("/", response_model=EvidenceResponse)
def create_evidence(
    evidence_data: EvidenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create evidence for the currently logged-in user's organization.

    organization_id and uploaded_by are NOT trusted from frontend data.
    They are always taken from the authenticated user.
    """
    perms = get_user_effective_permissions(current_user, db)
    if "upload_evidence" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'upload_evidence' required"
        )

    new_evidence = Evidence(
        organization_id=current_user.organization_id,
        uploaded_by=current_user.id,
        file_name=evidence_data.file_name,
        file_path=evidence_data.file_path,
        file_type=evidence_data.file_type,
        description=evidence_data.description,
        status=evidence_data.status,
    )

    db.add(new_evidence)
    db.commit()
    db.refresh(new_evidence)

    # -----------------------------------------------------
    # Audit Log
    # -----------------------------------------------------

    log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="Evidence Created",
        entity_type="Evidence",
        entity_id=new_evidence.id,
        details=f"Evidence file {new_evidence.file_name} created",
    )

    db.add(log)
    db.commit()

    return new_evidence


# =========================================================
# UPLOAD EVIDENCE FILE
# =========================================================

@router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    description: str = Form(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload evidence for the currently authenticated user.

    uploaded_by and organization_id are automatically taken
    from the authenticated JWT user.
    """
    perms = get_user_effective_permissions(current_user, db)
    if "upload_evidence" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'upload_evidence' required"
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="File name is required",
        )

    # -----------------------------------------------------
    # Validate file extension and size
    # -----------------------------------------------------
    raw_filename = Path(file.filename).name
    ext = raw_filename.split(".")[-1].lower() if "." in raw_filename else ""
    allowed_exts = ["pdf", "docx", "txt", "json", "csv"]

    if ext == "doc":
        raise HTTPException(
            status_code=400,
            detail="Legacy binary Word (.doc) format is not supported. Please convert file to modern .docx or .pdf."
        )

    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '.{ext}'. Supported formats: {', '.join(allowed_exts)}."
        )

    # -----------------------------------------------------
    # Save file safely with organization namespacing
    # -----------------------------------------------------
    org_upload_dir = UPLOAD_DIR / f"org_{current_user.organization_id}"
    org_upload_dir.mkdir(parents=True, exist_ok=True)
    safe_file_path = org_upload_dir / raw_filename

    try:
        with open(safe_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(error)}",
        )

    # -----------------------------------------------------
    # Create Evidence Record
    # -----------------------------------------------------
    new_evidence = Evidence(
        organization_id=current_user.organization_id,
        uploaded_by=current_user.id,
        file_name=raw_filename,
        file_path=str(safe_file_path),
        file_type=ext,
        description=(
            description
            or f"Uploaded compliance evidence: {raw_filename}"
        ),
        status="uploaded",
    )

    db.add(new_evidence)
    db.commit()
    db.refresh(new_evidence)

    # -----------------------------------------------------
    # Audit Log
    # -----------------------------------------------------
    log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="Evidence Uploaded",
        entity_type="Evidence",
        entity_id=new_evidence.id,
        details=(
            f"File {raw_filename} uploaded by user "
            f"{current_user.id} for organization "
            f"{current_user.organization_id}."
        ),
    )
    db.add(log)
    db.commit()

    # -----------------------------------------------------
    # Trigger Ingestion Pipeline (Extract, Chunk, Embed)
    # -----------------------------------------------------
    processing_info = {}
    try:
        from app.services.evidence_processor import process_evidence_document
        proc_result = process_evidence_document(
            db=db,
            evidence_id=new_evidence.id,
            organization_id=current_user.organization_id,
            user_id=current_user.id
        )
        processing_info = proc_result
        db.refresh(new_evidence)
    except Exception as proc_err:
        # Document was stored safely; mark failure status for frontend visibility
        db.refresh(new_evidence)
        processing_info = {
            "error": str(proc_err),
            "status": new_evidence.status
        }

    # -----------------------------------------------------
    # Trigger AI Control Mapping Pipeline
    # -----------------------------------------------------
    mapping_payloads = []
    if new_evidence.status == "processed":
        try:
            from app.services.mapping_service import generate_evidence_mappings_pipeline
            from app.api.routes.evidence_control_mappings import enrich_evidence_mapping
            mapping_objs = generate_evidence_mappings_pipeline(
                db=db,
                evidence_id=new_evidence.id,
                organization_id=current_user.organization_id,
                current_user=current_user
            )
            mapping_payloads = [enrich_evidence_mapping(m, db) for m in mapping_objs]
            logger.info(f"Auto-mapped evidence #{new_evidence.id} to {len(mapping_payloads)} compliance controls.")
        except Exception as map_err:
            logger.error(f"Auto-mapping for evidence #{new_evidence.id} failed: {map_err}")

    return {
        "id": new_evidence.id,
        "organization_id": new_evidence.organization_id,
        "uploaded_by": new_evidence.uploaded_by,
        "file_name": new_evidence.file_name,
        "file_path": new_evidence.file_path,
        "file_type": new_evidence.file_type,
        "description": new_evidence.description,
        "status": new_evidence.status,
        "chunks": processing_info.get("chunks", 0),
        "message": processing_info.get("message", "File uploaded and registered."),
        "processing": processing_info,
        "mappings": mapping_payloads
    }



# =========================================================
# GET ALL EVIDENCE
# =========================================================

@router.get("/", response_model=list[EvidenceResponse])
def get_evidence(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return only evidence belonging to the logged-in user's
    organization.
    """
    perms = get_user_effective_permissions(current_user, db)
    if "view_evidence" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'view_evidence' required"
        )

    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.organization_id == current_user.organization_id
        )
        .order_by(Evidence.id.desc())
        .all()
    )

    return evidence


# =========================================================
# GET SINGLE EVIDENCE
# =========================================================

@router.get("/{evidence_id}", response_model=EvidenceResponse)
def get_single_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return evidence only if it belongs to the current user's
    organization.
    """
    perms = get_user_effective_permissions(current_user, db)
    if "view_evidence" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'view_evidence' required"
        )

    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.id == evidence_id,
            Evidence.organization_id == current_user.organization_id,
        )
        .first()
    )

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found",
        )

    return evidence


# =========================================================
# UPDATE EVIDENCE
# =========================================================

@router.put("/{evidence_id}", response_model=EvidenceResponse)
def update_evidence(
    evidence_id: int,
    evidence_data: EvidenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update evidence only within the current user's organization.
    """
    perms = get_user_effective_permissions(current_user, db)
    if "upload_evidence" not in perms and "manage_frameworks" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'upload_evidence' required"
        )

    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.id == evidence_id,
            Evidence.organization_id == current_user.organization_id,
        )
        .first()
    )

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found",
        )

    evidence.file_name = evidence_data.file_name
    evidence.file_path = evidence_data.file_path
    evidence.file_type = evidence_data.file_type
    evidence.description = evidence_data.description
    evidence.status = evidence_data.status

    db.commit()
    db.refresh(evidence)

    # -----------------------------------------------------
    # Audit Log
    # -----------------------------------------------------

    log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="Evidence Updated",
        entity_type="Evidence",
        entity_id=evidence.id,
        details=f"Evidence file {evidence.file_name} updated",
    )

    db.add(log)
    db.commit()

    return evidence


# =========================================================
# DELETE EVIDENCE
# =========================================================

@router.delete("/{evidence_id}")
def delete_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete evidence only from the current user's organization.
    """
    perms = get_user_effective_permissions(current_user, db)
    if "upload_evidence" not in perms and "manage_frameworks" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'upload_evidence' required"
        )

    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.id == evidence_id,
            Evidence.organization_id == current_user.organization_id,
        )
        .first()
    )

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found",
        )

    # -----------------------------------------------------
    # Delete physical file
    # -----------------------------------------------------

    file_path = Path(evidence.file_path)

    if file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass

    # -----------------------------------------------------
    # Audit Log
    # -----------------------------------------------------

    log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="Evidence Deleted",
        entity_type="Evidence",
        entity_id=evidence.id,
        details=f"Evidence file {evidence.file_name} deleted",
    )

    db.add(log)

    db.delete(evidence)
    db.commit()

    return {
        "message": "Evidence deleted successfully",
        "evidence_id": evidence_id,
    }


# =========================================================
# PROCESS EVIDENCE (AI)
# =========================================================

from app.services.evidence_processor import process_evidence_document

@router.post("/{evidence_id}/process")
def process_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Triggers the AI ingestion pipeline and control mapping for the given evidence.
    """
    perms = get_user_effective_permissions(current_user, db)
    if "run_ai_analysis" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'run_ai_analysis' required"
        )

    evidence = db.query(Evidence).filter(
        Evidence.id == evidence_id,
        Evidence.organization_id == current_user.organization_id
    ).first()

    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found in organization")

    proc_result = process_evidence_document(db, evidence_id, current_user.organization_id, current_user.id)

    mapping_payloads = []
    try:
        from app.services.mapping_service import generate_evidence_mappings_pipeline
        from app.api.routes.evidence_control_mappings import enrich_evidence_mapping
        mapping_objs = generate_evidence_mappings_pipeline(
            db=db,
            evidence_id=evidence.id,
            organization_id=current_user.organization_id,
            current_user=current_user
        )
        mapping_payloads = [enrich_evidence_mapping(m, db) for m in mapping_objs]
        logger.info(f"Process endpoint auto-mapped evidence #{evidence.id} to {len(mapping_payloads)} controls.")
    except Exception as map_err:
        logger.error(f"Process endpoint mapping failed for evidence #{evidence.id}: {map_err}")

    return {
        **proc_result,
        "mappings": mapping_payloads
    }


# =========================================================
# SUMMARIZE EVIDENCE (AI)
# =========================================================

@router.post("/{evidence_id}/summarize")
def summarize_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generates an AI executive summary and key takeaways for an uploaded piece of evidence.
    """
    evidence = db.query(Evidence).filter(
        Evidence.id == evidence_id,
        Evidence.organization_id == current_user.organization_id
    ).first()

    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found in organization")

    chunks = (
        db.query(EvidenceChunk)
        .join(EvidenceVersion, EvidenceChunk.evidence_version_id == EvidenceVersion.id)
        .filter(EvidenceVersion.evidence_id == evidence.id)
        .order_by(EvidenceChunk.chunk_index.asc())
        .limit(8)
        .all()
    )

    combined_text = "\n\n".join([c.content for c in chunks if c.content])
    if not combined_text:
        combined_text = evidence.description or evidence.file_name

    from app.ai.llm import get_llm, extract_json_from_text
    from app.config import settings

    prompt = (
        "You are a senior compliance and audit professional. Analyze this compliance evidence document excerpt "
        "and produce an executive summary with key audit takeaways.\n\n"
        f"File: {evidence.file_name}\n"
        f"Excerpt:\n{combined_text[:3000]}\n\n"
        "Return ONLY a valid JSON object matching this schema:\n"
        "{\n"
        '  "document_type": "<e.g. Information Security Policy, Access Control Standard, Vendor Due Diligence>",\n'
        '  "summary": "<2-3 sentence executive summary of document purpose and controls established>",\n'
        '  "key_takeaways": ["<Key security provision 1>", "<Key security provision 2>", "<Key security provision 3>"]\n'
        "}\n"
        "No conversational preamble, no markdown formatting."
    )

    try:
        llm = get_llm()
        res = llm.invoke(prompt)
        raw_text = res.content if hasattr(res, "content") else str(res)
        clean_json = extract_json_from_text(raw_text)
        data = json.loads(clean_json)
        return {
            "evidence_id": evidence.id,
            "file_name": evidence.file_name,
            "document_type": data.get("document_type", "Compliance Evidence Document"),
            "summary": data.get("summary", "Document analyzed successfully."),
            "key_takeaways": data.get("key_takeaways", []),
            "model_name": settings.ollama_model
        }
    except Exception as e:
        logger.error(f"[Evidence #{evidence.id}] AI summarization failed: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"AI document summarization failed via LLM ({settings.ollama_model}): {str(e)}"
        )


# =========================================================
# CROSS-FRAMEWORK EVIDENCE ASSESSMENT MATRIX
# =========================================================

@router.get("/{evidence_id}/framework-assessments")
def get_evidence_framework_assessments(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the comprehensive One Evidence -> Multiple Frameworks -> Multiple Controls
    matrix for an uploaded piece of evidence. Grouped by framework with individual control
    statuses, AI citations, explanations, and gap analysis findings.
    """
    evidence = db.query(Evidence).filter(
        Evidence.id == evidence_id,
        Evidence.organization_id == current_user.organization_id
    ).first()

    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence document not found in your organization.")

    # 1. Total chunks count for evidence traceability
    chunk_count = (
        db.query(EvidenceChunk)
        .join(EvidenceVersion, EvidenceChunk.evidence_version_id == EvidenceVersion.id)
        .filter(EvidenceVersion.evidence_id == evidence.id)
        .count()
    )

    # 2. Retrieve authorized frameworks for the organization
    org_fws = db.query(OrganizationFramework).filter(
        OrganizationFramework.organization_id == current_user.organization_id,
        OrganizationFramework.status == "active"
    ).all()

    authorized_frameworks = []
    framework_sections = []
    total_compliant = 0
    total_gaps = 0

    # Pre-fetch all AI outputs for this evidence
    ai_outputs = (
        db.query(AIOutput)
        .join(AIRun, AIOutput.ai_run_id == AIRun.id)
        .filter(
            AIRun.evidence_id == evidence.id,
            AIRun.organization_id == current_user.organization_id
        )
        .order_by(AIOutput.id.desc())
        .all()
    )

    output_by_control_id = {}
    for out in ai_outputs:
        try:
            parsed = json.loads(out.content)
            c_id = parsed.get("control_id")
            if c_id and c_id not in output_by_control_id:
                output_by_control_id[c_id] = parsed
        except Exception:
            continue

    # Pre-fetch all gaps for the organization
    org_gaps = db.query(GapAnalysis).filter(
        GapAnalysis.organization_id == current_user.organization_id
    ).all()
    gap_by_control_id = {g.control_id: g for g in org_gaps}

    for of in org_fws:
        fw = db.query(Framework).filter(Framework.id == of.framework_id, Framework.is_active == True).first()
        if not fw:
            continue

        ver_id = of.framework_version_id
        if not ver_id:
            ver = db.query(FrameworkVersion).filter(
                FrameworkVersion.framework_id == fw.id,
                FrameworkVersion.status == "active"
            ).order_by(FrameworkVersion.id.desc()).first()
            ver_id = ver.id if ver else None

        ver_obj = db.query(FrameworkVersion).filter(FrameworkVersion.id == ver_id).first() if ver_id else None

        authorized_frameworks.append({
            "id": fw.id,
            "code": fw.code,
            "name": fw.name,
            "version_id": ver_id,
            "version": ver_obj.version if ver_obj else "1.0",
        })

        if not ver_id:
            continue

        # Find mapped controls for this framework version
        mappings = (
            db.query(EvidenceControlMapping, Control)
            .join(Control, EvidenceControlMapping.control_id == Control.id)
            .filter(
                EvidenceControlMapping.evidence_id == evidence.id,
                Control.framework_version_id == ver_id,
                Control.is_active == True
            )
            .order_by(Control.id.asc())
            .all()
        )

        # Get latest AIRun for this evidence and framework if any
        latest_run = (
            db.query(AIRun)
            .filter(
                AIRun.evidence_id == evidence.id,
                AIRun.organization_id == current_user.organization_id
            )
            .order_by(AIRun.id.desc())
            .first()
        )

        controls_data = []
        for mapping, control in mappings:
            # Check latest assessment output
            assessment_data = output_by_control_id.get(control.id)
            if assessment_data:
                comp_status = assessment_data.get("compliance_status", "INSUFFICIENT_EVIDENCE")
                if comp_status == "COMPLIANT":
                    total_compliant += 1
                else:
                    total_gaps += 1
            else:
                comp_status = "PENDING_ASSESSMENT"

            # Check gap analysis
            gap_item = gap_by_control_id.get(control.id)

            controls_data.append({
                "control_id": control.id,
                "control_code": control.control_code,
                "title": control.title,
                "category": control.category,
                "requirement": control.requirement or control.description,
                "mapping": {
                    "id": mapping.id,
                    "mapping_status": mapping.mapping_status,
                    "mapping_type": mapping.mapping_type,
                    "confidence_score": mapping.confidence_score,
                    "coverage_score": mapping.coverage_score,
                    "ai_explanation": mapping.ai_explanation,
                    "requirement_supported": mapping.requirement_supported,
                    "unsupported_requirements": mapping.unsupported_requirements,
                    "notes": mapping.notes,
                    "reviewed_at": mapping.reviewed_at.isoformat() if mapping.reviewed_at else None,
                },
                "assessment": {
                    "compliance_status": comp_status,
                    "coverage_score": assessment_data.get("coverage_score") if assessment_data else None,
                    "confidence_score": assessment_data.get("confidence_score") if assessment_data else None,
                    "explanation": assessment_data.get("explanation", "Assessment pending.") if assessment_data else "Assessment pending.",
                    "citations": assessment_data.get("citations", []) if assessment_data else [],
                    "gaps": assessment_data.get("gaps", []) if assessment_data else [],
                    "recommendations": assessment_data.get("recommendations", []) if assessment_data else [],
                } if assessment_data else None,
                "gap": {
                    "id": gap_item.id,
                    "status": gap_item.status,
                    "severity": gap_item.severity,
                    "severity_reason": getattr(gap_item, "severity_reason", None),
                    "findings": gap_item.findings,
                    "recommendation": gap_item.recommendation,
                } if gap_item else None
            })

        framework_sections.append({
            "framework_id": fw.id,
            "framework_code": fw.code,
            "framework_name": fw.name,
            "version_id": ver_id,
            "version": ver_obj.version if ver_obj else "1.0",
            "run": {
                "id": latest_run.id,
                "status": latest_run.status,
                "completed_at": latest_run.completed_at.isoformat() if latest_run.completed_at else None,
            } if latest_run else None,
            "controls_count": len(controls_data),
            "controls": controls_data,
        })

    return {
        "evidence": {
            "id": evidence.id,
            "organization_id": evidence.organization_id,
            "file_name": evidence.file_name,
            "file_type": evidence.file_type,
            "description": evidence.description,
            "status": evidence.status,
            "chunks_count": chunk_count,
            "created_at": evidence.created_at.isoformat() if evidence.created_at else None,
        },
        "stats": {
            "total_mapped_controls": sum(len(f["controls"]) for f in framework_sections),
            "total_frameworks_mapped": sum(1 for f in framework_sections if len(f["controls"]) > 0),
            "total_compliant": total_compliant,
            "total_gaps": total_gaps,
        },
        "authorized_frameworks": authorized_frameworks,
        "frameworks": framework_sections,
    }

