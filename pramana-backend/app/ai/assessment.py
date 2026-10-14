import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.models.organization import Organization
from app.models.framework import Framework
from app.models.framework_version import FrameworkVersion
from app.models.organization_framework import OrganizationFramework
from app.models.control import Control
from app.models.ai_run import AIRun
from app.models.ai_output import AIOutput
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.gap_analysis import GapAnalysis
from app.models.evidence import Evidence
from app.models.evidence_control_mapping import EvidenceControlMapping
from app.services.evidence_processor import process_evidence_document
from app.services.mapping_service import generate_evidence_mappings_pipeline
from app.services.rbac_service import get_user_effective_permissions
from app.core.dependencies import is_super_admin
from app.ai.rag import execute_rag_for_control

from app.services.scoring_service import determine_gap_severity, RequirementAssessment

logger = logging.getLogger("pramana.ai.assessment")


def sync_control_gap_analysis(
    db: Session,
    organization_id: int,
    control_id: int,
    status: str,
    explanation: str,
    gaps: List[str],
    recommendations: List[str],
    evidence_id: Optional[int] = None,
    control: Optional[Control] = None,
    has_contradictions: bool = False,
    coverage_score: Optional[float] = None,
    requirements: Optional[List[RequirementAssessment]] = None,
    audit_id: Optional[int] = None
) -> Optional[GapAnalysis]:
    """
    Synchronizes the gap_analysis table for a control based on compliance assessment results.
    - Satisfied / COMPLIANT: marks existing gap as remediated.
    - Non-compliant / Partial / Insufficient evidence: creates or updates open gap with
      deterministic, risk-based severity and explicit severity_reason.
    """
    try:
        gap = db.query(GapAnalysis).filter(
            GapAnalysis.organization_id == organization_id,
            GapAnalysis.control_id == control_id
        ).first()

        now = datetime.now(timezone.utc)
        ev_context = f" (Evidence #{evidence_id})" if evidence_id else ""

        is_remediated = status in ["Satisfied", "COMPLIANT"]

        if is_remediated:
            if gap and gap.status == "open":
                gap.status = "remediated"
                gap.findings = f"Remediated{ev_context}: {explanation[:400]}"
                gap.recommendation = "Maintain regular audit evidence and periodic operational review."
                gap.severity_reason = "Control requirements verified satisfied; compliance gap closed."
                if audit_id is not None:
                    gap.audit_id = audit_id
                gap.updated_at = now
                db.commit()
            return gap

        # Look up control if not provided
        if not control:
            control = db.query(Control).filter(Control.id == control_id).first()

        # Compute deterministic, risk-based severity and explicit justification
        severity, severity_reason = determine_gap_severity(
            status=status,
            control_category=control.category if control else None,
            control_title=control.title if control else None,
            control_code=control.control_code if control else None,
            has_contradictions=has_contradictions,
            coverage_score=coverage_score,
            requirements=requirements,
            missing_requirements=gaps
        )

        findings_text = "; ".join(gaps) if gaps else explanation
        rec_text = "; ".join(recommendations) if recommendations else "Submit verified policy and operational artifacts."

        if gap:
            gap.status = "open"
            gap.severity = severity
            gap.severity_reason = severity_reason
            gap.findings = findings_text
            gap.recommendation = rec_text
            if audit_id is not None:
                gap.audit_id = audit_id
            gap.updated_at = now
        else:
            gap = GapAnalysis(
                organization_id=organization_id,
                control_id=control_id,
                audit_id=audit_id,
                status="open",
                severity=severity,
                severity_reason=severity_reason,
                findings=findings_text,
                recommendation=rec_text,
                created_at=now,
                updated_at=now
            )
            db.add(gap)

        db.commit()
        return gap
    except Exception as e:
        logger.warning(f"Failed to sync gap analysis for control {control_id}: {e}")
        db.rollback()
        return None


def run_framework_assessment(
    db: Session,
    organization_id: int,
    user_id: int,
    framework_id: Optional[int] = None,
    framework_version_id: Optional[int] = None,
    audit_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Executes the complete, enterprise-grade AI assessment pipeline for all active controls
    in an authorized, enrolled framework version.
    
    Strict Security & Authorization Rules:
    1. Organization exists and is valid.
    2. User exists, is active, and is authorized for the organization with 'run_ai_analysis' permission.
    3. Organization is actively enrolled in the selected framework and version.
    4. Framework is globally active and available.
    5. Framework and framework-version belong to each other.
    6. Only active controls from the authorized version are assessed.
    7. All evidence retrieved is strictly bounded by tenant organization.
    8. AIRun and AIOutput records are transactionally committed with per-control resilience.
    """
    # 1. Validate Organization
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    # 2. Validate User & Permissions
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User account not found or inactive.")

    user_perms = get_user_effective_permissions(user, db)
    is_admin = is_super_admin(user) or ("manage_organizations" in user_perms)
    if not is_admin and user.organization_id != organization_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: You do not have permission to trigger assessments for this organization."
        )

    if not is_admin and "run_ai_analysis" not in user_perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'run_ai_analysis' required to execute compliance assessments."
        )

    # 3. Resolve and Validate Framework & Enrollment
    if not framework_id and not framework_version_id:
        raise HTTPException(
            status_code=400,
            detail="Either framework_id or framework_version_id must be provided to run an assessment."
        )

    target_fw_id = framework_id
    target_ver_id = framework_version_id

    # If version specified, resolve parent framework
    if target_ver_id:
        fw_ver = db.query(FrameworkVersion).filter(FrameworkVersion.id == target_ver_id).first()
        if not fw_ver:
            raise HTTPException(status_code=404, detail="Framework version not found.")

        if target_fw_id and fw_ver.framework_id != target_fw_id:
            raise HTTPException(
                status_code=400,
                detail=f"Version ID {target_ver_id} does not belong to Framework ID {target_fw_id}."
            )
        target_fw_id = fw_ver.framework_id

    # Verify Framework exists and is active globally
    framework = db.query(Framework).filter(Framework.id == target_fw_id).first()
    if not framework:
        raise HTTPException(status_code=404, detail="Framework not found.")

    if not framework.is_active:
        raise HTTPException(
            status_code=400,
            detail=f"Framework '{framework.name}' is currently off-role (inactive globally) and cannot be assessed."
        )

    # Enforce Organization Enrollment
    org_fw = db.query(OrganizationFramework).filter(
        OrganizationFramework.organization_id == organization_id,
        OrganizationFramework.framework_id == target_fw_id,
        OrganizationFramework.status == "active"
    ).first()

    if not org_fw:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Organization '{org.name}' is not actively enrolled in framework '{framework.name}'. "
                "Please assign and activate this framework in Organization Settings before assessing."
            )
        )

    # Resolve target version ID if not explicitly provided
    if not target_ver_id:
        if org_fw.framework_version_id:
            target_ver_id = org_fw.framework_version_id
        else:
            latest_ver = db.query(FrameworkVersion).filter(
                FrameworkVersion.framework_id == target_fw_id,
                FrameworkVersion.status == "active"
            ).order_by(FrameworkVersion.id.desc()).first()
            if not latest_ver:
                raise HTTPException(status_code=400, detail="No active versions found for this framework.")
            target_ver_id = latest_ver.id

    # 4. Fetch Active Controls for the specific version
    controls = db.query(Control).filter(
        Control.framework_version_id == target_ver_id,
        Control.is_active == True
    ).order_by(Control.id.asc()).all()

    if not controls:
        return {
            "message": f"No active controls found for framework '{framework.name}' (Version ID: {target_ver_id}).",
            "results": [],
            "status": "completed"
        }

    # 5. Initialize AI Run record
    ai_run = AIRun(
        organization_id=organization_id,
        audit_id=audit_id,
        triggered_by=user_id,
        run_type="framework_assessment",
        status="running",
        model_name=settings.ollama_model,
        started_at=datetime.now(timezone.utc)
    )
    db.add(ai_run)
    db.commit()
    db.refresh(ai_run)

    results: List[Dict[str, Any]] = []
    success_count = 0
    fail_count = 0

    # 6. Execute RAG Assessment for each control with per-control fault tolerance
    try:
        for control in controls:
            try:
                rag_result = execute_rag_for_control(
                    db=db,
                    organization_id=organization_id,
                    control=control,
                    framework=framework
                )

                # Persist successful control assessment output
                req_evals = []
                for req in (rag_result.requirements_evaluations or []):
                    if hasattr(req, "dict"):
                        req_evals.append(req.dict())
                    elif hasattr(req, "model_dump"):
                        req_evals.append(req.model_dump())
                    elif isinstance(req, dict):
                        req_evals.append(req)

                # Synchronize gap analysis table with risk-based severity
                has_contra = bool(getattr(rag_result, "has_contradictions", False))
                gap_rec = sync_control_gap_analysis(
                    db=db,
                    organization_id=organization_id,
                    control_id=control.id,
                    status=rag_result.assessment_status,
                    explanation=rag_result.reasoning or rag_result.explanation,
                    gaps=rag_result.missing_requirements or rag_result.gaps,
                    recommendations=rag_result.recommendations,
                    control=control,
                    has_contradictions=has_contra,
                    coverage_score=rag_result.coverage_score,
                    requirements=rag_result.requirements_evaluations,
                    audit_id=audit_id
                )

                output_payload = {
                    "control_id": control.id,
                    "control_code": control.control_code,
                    "title": control.title,
                    "assessment_status": rag_result.assessment_status,
                    "compliance_status": rag_result.assessment_status,  # backward compatibility
                    "coverage_score": rag_result.coverage_score,
                    "confidence": rag_result.confidence,
                    "confidence_score": rag_result.confidence,  # backward compatibility
                    "confidence_method": rag_result.confidence_method,
                    "reasoning": rag_result.reasoning,
                    "explanation": rag_result.explanation,  # backward compatibility
                    "supporting_evidence": rag_result.supporting_evidence,
                    "missing_requirements": rag_result.missing_requirements,
                    "evidence_chunk_ids": rag_result.evidence_chunk_ids,
                    "citations": rag_result.citations,
                    "gaps": rag_result.gaps,
                    "gap_severity": gap_rec.severity if gap_rec else None,
                    "severity_reason": gap_rec.severity_reason if gap_rec else None,
                    "recommendations": rag_result.recommendations,
                    "requirements_evaluations": req_evals
                }

                ai_output = AIOutput(
                    ai_run_id=ai_run.id,
                    control_id=control.id,
                    output_type="control_assessment",
                    content=json.dumps(output_payload)
                )
                db.add(ai_output)

                # Also update any existing evidence_control_mappings for this control
                existing_mappings = (
                    db.query(EvidenceControlMapping)
                    .join(Evidence, EvidenceControlMapping.evidence_id == Evidence.id)
                    .filter(
                        Evidence.organization_id == organization_id,
                        EvidenceControlMapping.control_id == control.id
                    ).all()
                )
                for em in existing_mappings:
                    em.coverage_score = rag_result.coverage_score
                    em.confidence_score = rag_result.confidence

                db.commit()
                success_count += 1

                results.append({
                    "control_id": control.id,
                    "control_code": control.control_code,
                    "title": control.title,
                    "assessment_status": rag_result.assessment_status,
                    "status": rag_result.assessment_status,
                    "coverage_score": rag_result.coverage_score,
                    "confidence": rag_result.confidence,
                    "confidence_method": rag_result.confidence_method,
                    "reasoning": rag_result.reasoning,
                    "citations_count": len(rag_result.citations),
                    "gaps_count": len(rag_result.missing_requirements or rag_result.gaps),
                    "gap_severity": gap_rec.severity if gap_rec else None,
                    "severity_reason": gap_rec.severity_reason if gap_rec else None
                })

            except Exception as ctrl_err:
                db.rollback()
                fail_count += 1
                logger.error(f"Per-control assessment failed for [{control.control_code}]: {ctrl_err}")

                err_payload = {
                    "control_id": control.id,
                    "control_code": control.control_code,
                    "title": control.title,
                    "assessment_status": "Insufficient evidence",
                    "compliance_status": "ERROR",
                    "coverage_score": None,
                    "confidence": None,
                    "confidence_score": None,
                    "confidence_method": None,
                    "reasoning": "Assessment execution failed for this control due to an internal processing error.",
                    "explanation": "Assessment execution failed for this control due to an internal processing error.",
                    "supporting_evidence": [],
                    "missing_requirements": ["Control assessment could not be finalized."],
                    "evidence_chunk_ids": [],
                    "citations": [],
                    "gaps": ["Control assessment could not be finalized."],
                    "recommendations": ["Re-run the assessment or check LLM server logs."],
                    "requirements_evaluations": []
                }

                ai_output = AIOutput(
                    ai_run_id=ai_run.id,
                    control_id=control.id,
                    output_type="control_assessment_error",
                    content=json.dumps(err_payload)
                )
                db.add(ai_output)
                db.commit()

                results.append({
                    "control_id": control.id,
                    "control_code": control.control_code,
                    "title": control.title,
                    "assessment_status": "Insufficient evidence",
                    "status": "ERROR",
                    "coverage_score": None,
                    "confidence": None,
                    "error": "Evaluation error"
                })

        # 7. Finalize Run Status
        if fail_count == 0:
            ai_run.status = "completed"
        elif success_count > 0:
            ai_run.status = "partially_failed"
            ai_run.error_message = f"{fail_count} of {len(controls)} controls failed during assessment."
        else:
            ai_run.status = "failed"
            ai_run.error_message = f"All {len(controls)} controls failed assessment."

        ai_run.completed_at = datetime.now(timezone.utc)
        db.commit()

        # 8. Record System Audit Log
        try:
            audit_log = AuditLog(
                organization_id=organization_id,
                user_id=user_id,
                action="Framework Assessment Run",
                entity_type="AIRun",
                entity_id=ai_run.id,
                details=(
                    f"AI Assessment run #{ai_run.id} for framework '{framework.name}' completed "
                    f"with status '{ai_run.status}' ({success_count} succeeded, {fail_count} failed)."
                )
            )
            db.add(audit_log)
            db.commit()
        except Exception:
            db.rollback()

        return {
            "run_id": ai_run.id,
            "status": ai_run.status,
            "framework_id": framework.id,
            "framework_name": framework.name,
            "framework_version_id": target_ver_id,
            "total_controls": len(controls),
            "assessed_successfully": success_count,
            "failed_controls": fail_count,
            "results": results
        }

    except Exception as critical_err:
        db.rollback()
        ai_run.status = "failed"
        ai_run.error_message = "Critical assessment pipeline interruption."
        ai_run.completed_at = datetime.now(timezone.utc)
        db.commit()
        logger.error(f"Critical assessment interruption: {critical_err}")
        raise HTTPException(
            status_code=500,
            detail="The AI compliance assessment pipeline encountered an unexpected error. Please check server logs."
        )


def assess_evidence_across_frameworks(
    db: Session,
    evidence_id: int,
    organization_id: int,
    user_id: int,
    framework_ids: Optional[List[int]] = None,
    audit_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Executes the One Evidence -> Multiple Frameworks -> Multiple Controls assessment pipeline.

    1. Reuses stored evidence chunks and embeddings without duplicate generation.
    2. Retrieves active enrolled frameworks for the organization.
    3. Identifies controls mapped to this evidence across all requested/enrolled frameworks.
    4. Evaluates each framework independently via RAG.
    5. Persists AIRun and AIOutput records per framework.
    6. Synchronizes GapAnalysis records (open / remediated) linked to control and assessment context.
    7. Strictly enforces organization tenant boundaries.
    """
    # 1. Validate Organization & User
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User account not found or inactive.")

    user_perms = get_user_effective_permissions(user, db)
    is_admin = is_super_admin(user) or ("manage_organizations" in user_perms)
    if not is_admin and user.organization_id != organization_id:
        raise HTTPException(status_code=403, detail="Access denied: Cross-organization action prohibited.")

    if not is_admin and "run_ai_analysis" not in user_perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'run_ai_analysis' required to execute compliance assessments."
        )

    # 2. Validate Evidence
    evidence = db.query(Evidence).filter(
        Evidence.id == evidence_id,
        Evidence.organization_id == organization_id
    ).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence document not found in your organization.")

    if evidence.status != "processed":
        process_evidence_document(db=db, evidence_id=evidence.id, organization_id=organization_id, user_id=user_id)
        db.refresh(evidence)

    # 3. Retrieve Enrolled Frameworks for the organization
    org_fws_query = db.query(OrganizationFramework).filter(
        OrganizationFramework.organization_id == organization_id,
        OrganizationFramework.status == "active"
    )
    if framework_ids:
        org_fws_query = org_fws_query.filter(OrganizationFramework.framework_id.in_(framework_ids))

    org_fws = org_fws_query.all()
    if not org_fws:
        raise HTTPException(
            status_code=400,
            detail="No active framework enrollments match the assessment criteria for this organization."
        )

    framework_evaluations: List[Dict[str, Any]] = []
    total_controls_assessed = 0
    total_gaps_identified = 0
    total_compliant = 0

    for of in org_fws:
        fw = db.query(Framework).filter(Framework.id == of.framework_id, Framework.is_active == True).first()
        if not fw:
            continue

        # Resolve framework version
        ver_id = of.framework_version_id
        if not ver_id:
            ver = db.query(FrameworkVersion).filter(
                FrameworkVersion.framework_id == fw.id,
                FrameworkVersion.status == "active"
            ).order_by(FrameworkVersion.id.desc()).first()
            ver_id = ver.id if ver else None

        if not ver_id:
            continue

        ver_obj = db.query(FrameworkVersion).filter(FrameworkVersion.id == ver_id).first()

        # Find mapped controls for this framework version
        mapped_pairs = (
            db.query(EvidenceControlMapping, Control)
            .join(Control, EvidenceControlMapping.control_id == Control.id)
            .filter(
                EvidenceControlMapping.evidence_id == evidence.id,
                EvidenceControlMapping.mapping_status != "rejected",
                Control.framework_version_id == ver_id,
                Control.is_active == True
            )
            .all()
        )

        # If no mappings exist for this framework, attempt auto-mapping for this framework
        if not mapped_pairs:
            generate_evidence_mappings_pipeline(
                db=db,
                evidence_id=evidence.id,
                organization_id=organization_id,
                framework_version_id=ver_id,
                current_user=user
            )
            mapped_pairs = (
                db.query(EvidenceControlMapping, Control)
                .join(Control, EvidenceControlMapping.control_id == Control.id)
                .filter(
                    EvidenceControlMapping.evidence_id == evidence.id,
                    EvidenceControlMapping.mapping_status != "rejected",
                    Control.framework_version_id == ver_id,
                    Control.is_active == True
                )
                .all()
            )

        if not mapped_pairs:
            framework_evaluations.append({
                "framework_id": fw.id,
                "framework_name": fw.name,
                "framework_code": fw.code,
                "version_id": ver_id,
                "version_name": ver_obj.version if ver_obj else "1.0",
                "status": "skipped",
                "message": "No relevant controls mapped from this evidence.",
                "controls_assessed": 0,
                "controls": []
            })
            continue

        # Initialize AIRun for this framework and evidence
        ai_run = AIRun(
            organization_id=organization_id,
            evidence_id=evidence.id,
            audit_id=audit_id,
            triggered_by=user.id,
            run_type="evidence_cross_framework_assessment",
            status="running",
            model_name=settings.ollama_model,
            started_at=datetime.now(timezone.utc)
        )
        db.add(ai_run)
        db.commit()
        db.refresh(ai_run)

        fw_controls_results: List[Dict[str, Any]] = []
        fw_success = 0
        fw_failed = 0

        for mapping, control in mapped_pairs:
            try:
                rag_res = execute_rag_for_control(
                    db=db,
                    organization_id=organization_id,
                    control=control,
                    framework=fw,
                    evidence_id=evidence.id
                )

                req_evals = []
                for req in (rag_res.requirements_evaluations or []):
                    if hasattr(req, "dict"):
                        req_evals.append(req.dict())
                    elif hasattr(req, "model_dump"):
                        req_evals.append(req.model_dump())
                    elif isinstance(req, dict):
                        req_evals.append(req)

                # Sync gap analysis finding with risk-based severity
                has_contra = bool(getattr(rag_res, "has_contradictions", False))
                gap_rec = sync_control_gap_analysis(
                    db=db,
                    organization_id=organization_id,
                    control_id=control.id,
                    status=rag_res.assessment_status,
                    explanation=rag_res.reasoning or rag_res.explanation,
                    gaps=rag_res.missing_requirements or rag_res.gaps,
                    recommendations=rag_res.recommendations,
                    evidence_id=evidence.id,
                    control=control,
                    has_contradictions=has_contra,
                    coverage_score=rag_res.coverage_score,
                    requirements=rag_res.requirements_evaluations,
                    audit_id=audit_id
                )

                output_payload = {
                    "framework_id": fw.id,
                    "framework_name": fw.name,
                    "framework_code": fw.code,
                    "control_id": control.id,
                    "control_code": control.control_code,
                    "title": control.title,
                    "evidence_id": evidence.id,
                    "mapping_id": mapping.id,
                    "assessment_status": rag_res.assessment_status,
                    "compliance_status": rag_res.assessment_status,  # backward compatibility
                    "coverage_score": rag_res.coverage_score,
                    "confidence": rag_res.confidence,
                    "confidence_score": rag_res.confidence,  # backward compatibility
                    "confidence_method": rag_res.confidence_method,
                    "reasoning": rag_res.reasoning,
                    "explanation": rag_res.explanation,  # backward compatibility
                    "supporting_evidence": rag_res.supporting_evidence,
                    "missing_requirements": rag_res.missing_requirements,
                    "evidence_chunk_ids": rag_res.evidence_chunk_ids,
                    "citations": rag_res.citations,
                    "gaps": rag_res.gaps,
                    "gap_severity": gap_rec.severity if gap_rec else None,
                    "severity_reason": gap_rec.severity_reason if gap_rec else None,
                    "recommendations": rag_res.recommendations,
                    "requirements_evaluations": req_evals
                }

                ai_output = AIOutput(
                    ai_run_id=ai_run.id,
                    control_id=control.id,
                    output_type="control_assessment",
                    content=json.dumps(output_payload)
                )
                db.add(ai_output)

                # Persist updated coverage score and confidence on evidence_control_mappings
                mapping.coverage_score = rag_res.coverage_score
                mapping.confidence_score = rag_res.confidence
                mapping.ai_explanation = rag_res.reasoning or rag_res.explanation
                if rag_res.supporting_evidence:
                    mapping.requirement_supported = "; ".join(rag_res.supporting_evidence)
                if rag_res.missing_requirements:
                    mapping.unsupported_requirements = "; ".join(rag_res.missing_requirements)
                db.commit()

                fw_success += 1
                total_controls_assessed += 1
                if rag_res.assessment_status in ["Satisfied", "COMPLIANT"]:
                    total_compliant += 1
                else:
                    total_gaps_identified += 1

                fw_controls_results.append({
                    "control_id": control.id,
                    "control_code": control.control_code,
                    "title": control.title,
                    "assessment_status": rag_res.assessment_status,
                    "compliance_status": rag_res.assessment_status,
                    "coverage_score": rag_res.coverage_score,
                    "confidence": rag_res.confidence,
                    "confidence_score": rag_res.confidence,
                    "confidence_method": rag_res.confidence_method,
                    "reasoning": rag_res.reasoning,
                    "explanation": rag_res.explanation,
                    "citations": rag_res.citations,
                    "gaps": rag_res.gaps,
                    "recommendations": rag_res.recommendations,
                    "requirements_evaluations": req_evals,
                    "gap_status": gap_rec.status if gap_rec else None,
                    "gap_severity": gap_rec.severity if gap_rec else None,
                    "severity_reason": gap_rec.severity_reason if gap_rec else None
                })

            except Exception as ctrl_err:
                db.rollback()
                fw_failed += 1
                logger.error(f"Assessment error for [{control.control_code}] in framework {fw.code}: {ctrl_err}")
                fw_controls_results.append({
                    "control_id": control.id,
                    "control_code": control.control_code,
                    "title": control.title,
                    "assessment_status": "Insufficient evidence",
                    "compliance_status": "ERROR",
                    "coverage_score": None,
                    "confidence": None,
                    "confidence_score": None,
                    "confidence_method": None,
                    "reasoning": f"Evaluation error: {str(ctrl_err)}",
                    "explanation": f"Evaluation error: {str(ctrl_err)}",
                    "citations": [],
                    "gaps": ["Assessment failed due to processing error."],
                    "recommendations": ["Re-run evaluation."]
                })

        # Finalize AIRun status
        ai_run.status = "completed" if fw_failed == 0 else ("partially_failed" if fw_success > 0 else "failed")
        ai_run.completed_at = datetime.now(timezone.utc)
        db.commit()

        framework_evaluations.append({
            "framework_id": fw.id,
            "framework_name": fw.name,
            "framework_code": fw.code,
            "version_id": ver_id,
            "version_name": ver_obj.version if ver_obj else "1.0",
            "run_id": ai_run.id,
            "status": ai_run.status,
            "controls_assessed": len(fw_controls_results),
            "controls": fw_controls_results
        })

    # Record Audit Log
    try:
        audit = AuditLog(
            organization_id=organization_id,
            user_id=user.id,
            action="Evidence Cross-Framework Assessment",
            entity_type="Evidence",
            entity_id=evidence.id,
            details=(
                f"Assessed evidence '{evidence.file_name}' across {len(framework_evaluations)} frameworks. "
                f"Controls assessed: {total_controls_assessed}, Compliant: {total_compliant}, Gaps: {total_gaps_identified}."
            )
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

    return {
        "message": f"Successfully assessed evidence '{evidence.file_name}' across {len(framework_evaluations)} frameworks.",
        "evidence_id": evidence.id,
        "evidence_file": evidence.file_name,
        "total_frameworks": len(framework_evaluations),
        "total_controls_assessed": total_controls_assessed,
        "total_compliant": total_compliant,
        "total_gaps_identified": total_gaps_identified,
        "frameworks": framework_evaluations
    }
