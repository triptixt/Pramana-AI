import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.models.user import User
from app.models.ai_run import AIRun
from app.models.ai_output import AIOutput
from app.ai.assessment import run_framework_assessment, assess_evidence_across_frameworks

router = APIRouter(
    prefix="/assessments",
    tags=["Assessments"]
)


class AssessmentTriggerRequest(BaseModel):
    framework_id: Optional[int] = None
    framework_version_id: Optional[int] = None
    audit_id: Optional[int] = None


class EvidenceAssessmentRequest(BaseModel):
    framework_ids: Optional[List[int]] = None
    audit_id: Optional[int] = None


@router.post("/")
def create_assessment(
    framework_id: Optional[int] = Query(None),
    framework_version_id: Optional[int] = Query(None),
    audit_id: Optional[int] = Query(None),
    body: Optional[AssessmentTriggerRequest] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("run_ai_analysis"))
):
    """
    Triggers a full evidence-based AI assessment for an authorized framework.
    Accepts framework_id, framework_version_id, and audit_id via query parameters or JSON body.
    Strictly verifies organization enrollment, active framework status, and tenant isolation.
    """
    # Prefer body if provided, fallback to query parameters
    effective_fw_id = (body.framework_id if body and body.framework_id else framework_id)
    effective_ver_id = (body.framework_version_id if body and body.framework_version_id else framework_version_id)
    effective_audit_id = (body.audit_id if body and body.audit_id else audit_id)

    if not effective_fw_id and not effective_ver_id:
        raise HTTPException(
            status_code=400,
            detail="Either framework_id or framework_version_id must be provided."
        )

    return run_framework_assessment(
        db=db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        framework_id=effective_fw_id,
        framework_version_id=effective_ver_id,
        audit_id=effective_audit_id
    )


@router.post("/evidence/{evidence_id}")
def assess_evidence_cross_framework(
    evidence_id: int,
    body: Optional[EvidenceAssessmentRequest] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("run_ai_analysis"))
):
    """
    Triggers cross-framework compliance assessment for a single piece of evidence.
    Assesses controls across all active enrolled frameworks (or specified framework_ids).
    Persists AIRun, AIOutput, and syncs GapAnalysis findings.
    """
    framework_ids = body.framework_ids if body else None
    audit_id = body.audit_id if body else None
    return assess_evidence_across_frameworks(
        db=db,
        evidence_id=evidence_id,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        framework_ids=framework_ids,
        audit_id=audit_id
    )


@router.get("/runs")
def list_assessment_runs(
    audit_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List AI assessment runs strictly scoped to the authenticated user's organization.
    Supports filtering by audit_id.
    """
    query = db.query(AIRun).filter(
        AIRun.run_type.in_(["framework_assessment", "evidence_cross_framework_assessment"])
    )

    if current_user.role != "super_admin":
        query = query.filter(AIRun.organization_id == current_user.organization_id)

    if audit_id is not None:
        query = query.filter(AIRun.audit_id == audit_id)

    runs = query.order_by(AIRun.id.desc()).all()
    return runs


@router.get("/runs/{run_id}")
def get_assessment_run_details(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch details and control outputs of an assessment run, enforcing organization isolation.
    """
    run = db.query(AIRun).filter(AIRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Assessment run not found.")

    if current_user.role != "super_admin" and run.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Access denied to another organization's assessment run.")

    outputs = db.query(AIOutput).filter(AIOutput.ai_run_id == run.id).all()
    parsed_outputs = []
    for out in outputs:
        try:
            parsed_content = json.loads(out.content)
        except Exception:
            parsed_content = {"raw_content": out.content}
        parsed_outputs.append({
            "id": out.id,
            "control_id": out.control_id,
            "output_type": out.output_type,
            "created_at": out.created_at,
            "content": parsed_content
        })

    return {
        "id": run.id,
        "organization_id": run.organization_id,
        "audit_id": run.audit_id,
        "triggered_by": run.triggered_by,
        "run_type": run.run_type,
        "status": run.status,
        "model_name": run.model_name,
        "error_message": run.error_message,
        "started_at": run.started_at,
        "completed_at": run.completed_at,
        "outputs": parsed_outputs
    }
