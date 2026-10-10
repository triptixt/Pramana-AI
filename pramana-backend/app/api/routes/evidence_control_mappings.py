from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.evidence_control_mapping import EvidenceControlMapping
from app.models.evidence import Evidence
from app.models.control import Control
from app.models.framework import Framework
from app.models.framework_version import FrameworkVersion
from app.models.audit_log import AuditLog
from app.models.user import User
from app.core.dependencies import get_current_user
from app.schemas.control_mapping import (
    EvidenceControlMappingCreate,
    EvidenceControlMappingResponse,
    EvidenceControlMappingReviewRequest,
    EvidenceControlMappingGenerateRequest,
    EvidenceSummary,
    ControlBriefSummary,
)
from app.services.mapping_service import generate_evidence_mappings_pipeline

router = APIRouter(
    prefix="/evidence-control-mappings",
    tags=["Evidence Control Mappings"]
)


def enrich_evidence_mapping(mapping: EvidenceControlMapping, db: Session) -> dict:
    """Enriches an EvidenceControlMapping with nested evidence and control summaries."""
    evi = db.query(Evidence).filter(Evidence.id == mapping.evidence_id).first()
    ctrl = db.query(Control).filter(Control.id == mapping.control_id).first()

    evi_summary = None
    if evi:
        evi_summary = EvidenceSummary(
            id=evi.id,
            organization_id=evi.organization_id,
            file_name=evi.file_name,
            file_type=evi.file_type,
            description=evi.description,
            status=evi.status,
        )

    ctrl_summary = None
    if ctrl:
        ver = db.query(FrameworkVersion).filter(FrameworkVersion.id == ctrl.framework_version_id).first()
        fw = db.query(Framework).filter(Framework.id == ver.framework_id).first() if ver else None
        ctrl_summary = ControlBriefSummary(
            id=ctrl.id,
            framework_version_id=ctrl.framework_version_id,
            control_code=ctrl.control_code,
            title=ctrl.title,
            category=ctrl.category,
            requirement=ctrl.requirement or ctrl.description or ctrl.title,
            framework_id=fw.id if fw else None,
            framework_name=fw.name if fw else "Framework",
            framework_code=fw.code if fw else "FW",
            framework_version=ver.version if ver else "1.0",
        )

    return {
        "id": mapping.id,
        "evidence_id": mapping.evidence_id,
        "control_id": mapping.control_id,
        "mapping_type": mapping.mapping_type,
        "confidence_score": mapping.confidence_score,
        "mapping_status": mapping.mapping_status,
        "notes": mapping.notes,
        "ai_explanation": mapping.ai_explanation,
        "requirement_supported": mapping.requirement_supported,
        "unsupported_requirements": mapping.unsupported_requirements,
        "reviewed_by": mapping.reviewed_by,
        "reviewed_at": mapping.reviewed_at,
        "created_at": mapping.created_at,
        "updated_at": mapping.updated_at,
        "evidence": evi_summary,
        "control": ctrl_summary,
    }


@router.get("/", response_model=List[EvidenceControlMappingResponse])
def get_mappings(
    evidence_id: Optional[int] = Query(None),
    control_id: Optional[int] = Query(None),
    mapping_status: Optional[str] = Query(None),
    framework_version_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List real evidence-to-control mappings strictly scoped to the current user's organization.
    """
    query = (
        db.query(EvidenceControlMapping)
        .join(Evidence, EvidenceControlMapping.evidence_id == Evidence.id)
        .filter(Evidence.organization_id == current_user.organization_id)
    )

    if evidence_id:
        query = query.filter(EvidenceControlMapping.evidence_id == evidence_id)

    if control_id:
        query = query.filter(EvidenceControlMapping.control_id == control_id)

    if mapping_status and mapping_status.lower() != "all":
        query = query.filter(func.lower(EvidenceControlMapping.mapping_status) == mapping_status.lower().strip())

    if framework_version_id:
        query = query.join(Control, EvidenceControlMapping.control_id == Control.id).filter(
            Control.framework_version_id == framework_version_id
        )

    mappings = query.order_by(EvidenceControlMapping.id.desc()).all()
    return [enrich_evidence_mapping(m, db) for m in mappings]


@router.post("/generate", response_model=List[EvidenceControlMappingResponse])
def generate_evidence_mappings(
    request_data: EvidenceControlMappingGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    AI Evidence-to-Control mapping using pgvector semantic chunk similarity.
    """
    allowed_roles = {"super_admin", "ciso", "grc", "evidence_contributor", "internal_auditor", "external_auditor"}
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Permission denied to map evidence.")

    results = generate_evidence_mappings_pipeline(
        db=db,
        evidence_id=request_data.evidence_id,
        organization_id=current_user.organization_id,
        framework_version_id=request_data.framework_version_id,
        control_id=request_data.control_id,
        top_k=request_data.top_k or 3,
        current_user=current_user
    )

    return [enrich_evidence_mapping(m, db) for m in results]


@router.put("/{mapping_id}/review", response_model=EvidenceControlMappingResponse)
def review_evidence_mapping(
    mapping_id: int,
    review_data: EvidenceControlMappingReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Auditor review and approval of evidence-to-control mappings.
    """
    allowed_roles = {"super_admin", "ciso", "grc", "internal_auditor", "external_auditor"}
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Permission denied to review evidence mappings.")

    mapping = (
        db.query(EvidenceControlMapping)
        .join(Evidence, EvidenceControlMapping.evidence_id == Evidence.id)
        .filter(
            EvidenceControlMapping.id == mapping_id,
            Evidence.organization_id == current_user.organization_id
        )
        .first()
    )

    if not mapping:
        raise HTTPException(status_code=404, detail="Evidence mapping not found.")

    status_val = review_data.mapping_status.lower().strip()
    if status_val not in ["approved", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'approved', 'rejected', or 'pending'.")

    mapping.mapping_status = status_val
    mapping.reviewed_by = current_user.id
    mapping.reviewed_at = datetime.now(timezone.utc)
    if review_data.notes:
        mapping.notes = f"{mapping.notes or ''}\nAuditor: {review_data.notes}".strip()

    db.commit()
    db.refresh(mapping)

    # Audit log
    try:
        audit = AuditLog(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action=f"Evidence Mapping {status_val.capitalize()}",
            entity_type="EvidenceControlMapping",
            entity_id=mapping.id,
            details=f"Auditor {current_user.name} set evidence mapping #{mapping.id} status to '{status_val}'."
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

    return enrich_evidence_mapping(mapping, db)


@router.post("/", response_model=EvidenceControlMappingResponse)
def create_mapping(
    mapping_data: EvidenceControlMappingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually create an evidence-to-control mapping.
    """
    evidence = db.query(Evidence).filter(
        Evidence.id == mapping_data.evidence_id,
        Evidence.organization_id == current_user.organization_id
    ).first()

    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found in organization.")

    control = db.query(Control).filter(Control.id == mapping_data.control_id).first()
    if not control:
        raise HTTPException(status_code=404, detail="Control not found.")

    existing = db.query(EvidenceControlMapping).filter(
        EvidenceControlMapping.evidence_id == mapping_data.evidence_id,
        EvidenceControlMapping.control_id == mapping_data.control_id
    ).first()

    if existing:
        existing.mapping_status = mapping_data.mapping_status or "approved"
        existing.mapping_type = "manual"
        if mapping_data.notes:
            existing.notes = mapping_data.notes
        db.commit()
        db.refresh(existing)
        return enrich_evidence_mapping(existing, db)

    new_mapping = EvidenceControlMapping(
        evidence_id=mapping_data.evidence_id,
        control_id=mapping_data.control_id,
        mapping_type=mapping_data.mapping_type or "manual",
        confidence_score=mapping_data.confidence_score or 1.0,
        mapping_status=mapping_data.mapping_status or "approved",
        notes=mapping_data.notes or "Manually mapped by user",
        ai_explanation=mapping_data.ai_explanation or f"Manual mapping assigned to control {control.control_code}.",
        requirement_supported=mapping_data.requirement_supported,
        unsupported_requirements=mapping_data.unsupported_requirements,
        reviewed_by=current_user.id,
        reviewed_at=datetime.now(timezone.utc)
    )

    db.add(new_mapping)
    db.commit()
    db.refresh(new_mapping)

    # Audit log
    try:
        audit = AuditLog(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="Evidence Mapping Created",
            entity_type="EvidenceControlMapping",
            entity_id=new_mapping.id,
            details=f"User {current_user.name} mapped evidence '{evidence.file_name}' to control {control.control_code}."
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

    return enrich_evidence_mapping(new_mapping, db)


@router.get("/{mapping_id}", response_model=EvidenceControlMappingResponse)
def get_mapping(
    mapping_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mapping = (
        db.query(EvidenceControlMapping)
        .join(Evidence, EvidenceControlMapping.evidence_id == Evidence.id)
        .filter(
            EvidenceControlMapping.id == mapping_id,
            Evidence.organization_id == current_user.organization_id
        )
        .first()
    )

    if mapping is None:
        raise HTTPException(
            status_code=404,
            detail="Mapping not found in organization"
        )

    return enrich_evidence_mapping(mapping, db)


@router.delete("/{mapping_id}")
def delete_mapping(
    mapping_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    allowed_roles = {"super_admin", "ciso", "grc"}
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Permission denied to delete evidence mapping.")

    mapping = (
        db.query(EvidenceControlMapping)
        .join(Evidence, EvidenceControlMapping.evidence_id == Evidence.id)
        .filter(
            EvidenceControlMapping.id == mapping_id,
            Evidence.organization_id == current_user.organization_id
        )
        .first()
    )

    if mapping is None:
        raise HTTPException(
            status_code=404,
            detail="Mapping not found"
        )

    db.delete(mapping)
    db.commit()

    try:
        audit = AuditLog(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="Evidence Mapping Deleted",
            entity_type="EvidenceControlMapping",
            entity_id=mapping_id,
            details=f"User {current_user.name} removed evidence mapping #{mapping_id}."
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

    return {"message": "Mapping deleted successfully"}