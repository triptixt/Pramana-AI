from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, aliased
from sqlalchemy import or_, and_, func

from app.database import get_db
from app.models.control_relationship import ControlRelationship
from app.models.control import Control
from app.models.framework import Framework
from app.models.framework_version import FrameworkVersion
from app.models.audit_log import AuditLog
from app.models.user import User
from app.core.dependencies import get_current_user
from app.schemas.control_relationship import (
    ControlRelationshipCreate,
    ControlRelationshipResponse,
    ControlRelationshipGenerateRequest,
    ControlRelationshipReviewRequest,
    ControlSummary,
)
from app.services.mapping_service import generate_control_relationships_pipeline

router = APIRouter(
    prefix="/control-relationships",
    tags=["Control Relationships"]
)


def enrich_relationship(rel: ControlRelationship, db: Session) -> dict:
    """Enriches a ControlRelationship instance with source and target control & framework metadata."""
    src = db.query(Control).filter(Control.id == rel.source_control_id).first()
    tgt = db.query(Control).filter(Control.id == rel.target_control_id).first()

    src_summary = None
    if src:
        src_ver = db.query(FrameworkVersion).filter(FrameworkVersion.id == src.framework_version_id).first()
        src_fw = db.query(Framework).filter(Framework.id == src_ver.framework_id).first() if src_ver else None
        src_summary = ControlSummary(
            id=src.id,
            framework_version_id=src.framework_version_id,
            control_code=src.control_code,
            title=src.title,
            category=src.category,
            description=src.description,
            requirement=src.requirement or src.description,
            framework_id=src_fw.id if src_fw else None,
            framework_name=src_fw.name if src_fw else "Framework",
            framework_code=src_fw.code if src_fw else "FW",
            framework_version=src_ver.version if src_ver else "1.0",
        )

    tgt_summary = None
    if tgt:
        tgt_ver = db.query(FrameworkVersion).filter(FrameworkVersion.id == tgt.framework_version_id).first()
        tgt_fw = db.query(Framework).filter(Framework.id == tgt_ver.framework_id).first() if tgt_ver else None
        tgt_summary = ControlSummary(
            id=tgt.id,
            framework_version_id=tgt.framework_version_id,
            control_code=tgt.control_code,
            title=tgt.title,
            category=tgt.category,
            description=tgt.description,
            requirement=tgt.requirement or tgt.description,
            framework_id=tgt_fw.id if tgt_fw else None,
            framework_name=tgt_fw.name if tgt_fw else "Framework",
            framework_code=tgt_fw.code if tgt_fw else "FW",
            framework_version=tgt_ver.version if tgt_ver else "1.0",
        )

    return {
        "id": rel.id,
        "source_control_id": rel.source_control_id,
        "target_control_id": rel.target_control_id,
        "relationship_type": rel.relationship_type,
        "source_reference": rel.source_reference,
        "mapping_confidence": rel.mapping_confidence,
        "status": rel.status or "proposed",
        "mapping_source": rel.mapping_source or "ai_generated",
        "ai_explanation": rel.ai_explanation,
        "overlap_summary": rel.overlap_summary,
        "differences_summary": rel.differences_summary,
        "reviewed_by": rel.reviewed_by,
        "reviewed_at": rel.reviewed_at,
        "created_at": rel.created_at,
        "updated_at": rel.updated_at,
        "source_control": src_summary,
        "target_control": tgt_summary,
    }


@router.get("/", response_model=List[ControlRelationshipResponse])
def get_relationships(
    source_framework_id: Optional[int] = Query(None),
    source_framework_version_id: Optional[int] = Query(None),
    target_framework_id: Optional[int] = Query(None),
    target_framework_version_id: Optional[int] = Query(None),
    source_control_id: Optional[int] = Query(None),
    target_control_id: Optional[int] = Query(None),
    control_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    relationship_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List real control relationships with dynamic multi-dimensional filtering.
    """
    query = db.query(ControlRelationship)

    if status and status.lower() != "all":
        query = query.filter(func.lower(ControlRelationship.status) == status.lower().strip())

    if relationship_type and relationship_type.lower() != "all":
        query = query.filter(func.lower(ControlRelationship.relationship_type) == relationship_type.lower().strip())

    if control_id is not None:
        query = query.filter(
            (ControlRelationship.source_control_id == control_id) |
            (ControlRelationship.target_control_id == control_id)
        )
    else:
        if source_control_id is not None:
            query = query.filter(ControlRelationship.source_control_id == source_control_id)
        if target_control_id is not None:
            query = query.filter(ControlRelationship.target_control_id == target_control_id)

    # Source framework / version filtering
    if source_framework_version_id is not None:
        query = query.join(Control, Control.id == ControlRelationship.source_control_id).filter(
            Control.framework_version_id == source_framework_version_id
        )
    elif source_framework_id is not None:
        src_vers = db.query(FrameworkVersion.id).filter(FrameworkVersion.framework_id == source_framework_id).all()
        src_ver_ids = [v[0] for v in src_vers]
        if src_ver_ids:
            query = query.join(Control, Control.id == ControlRelationship.source_control_id).filter(
                Control.framework_version_id.in_(src_ver_ids)
            )
        else:
            return []

    # Target framework / version filtering
    if target_framework_version_id is not None:
        tgt_alias = aliased(Control)
        query = query.join(tgt_alias, tgt_alias.id == ControlRelationship.target_control_id).filter(
            tgt_alias.framework_version_id == target_framework_version_id
        )
    elif target_framework_id is not None:
        tgt_vers = db.query(FrameworkVersion.id).filter(FrameworkVersion.framework_id == target_framework_id).all()
        tgt_ver_ids = [v[0] for v in tgt_vers]
        if tgt_ver_ids:
            tgt_alias = aliased(Control)
            query = query.join(tgt_alias, tgt_alias.id == ControlRelationship.target_control_id).filter(
                tgt_alias.framework_version_id.in_(tgt_ver_ids)
            )
        else:
            return []

    # Text search
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                ControlRelationship.relationship_type.ilike(search_pattern),
                ControlRelationship.ai_explanation.ilike(search_pattern),
                ControlRelationship.overlap_summary.ilike(search_pattern),
                ControlRelationship.source_reference.ilike(search_pattern)
            )
        )

    relationships = query.order_by(ControlRelationship.id.desc()).all()
    return [enrich_relationship(rel, db) for rel in relationships]


@router.post("/generate", response_model=List[ControlRelationshipResponse])
def generate_relationships(
    request_data: ControlRelationshipGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executes AI/RAG Control Mapping across or within framework versions.
    Persists proposed relationships to PostgreSQL and preserves existing approved decisions.
    """
    # Permission check: CISO, GRC, Super Admin, Auditors
    allowed_roles = {"super_admin", "ciso", "grc", "internal_auditor", "external_auditor"}
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: Role is not authorized to generate control mappings."
        )

    results = generate_control_relationships_pipeline(
        db=db,
        source_framework_version_id=request_data.source_framework_version_id,
        target_framework_version_id=request_data.target_framework_version_id,
        source_control_id=request_data.source_control_id,
        min_confidence=request_data.min_confidence or 0.5,
        top_k=request_data.top_k or 3,
        current_user=current_user
    )

    return [enrich_relationship(rel, db) for rel in results]


@router.put("/{relationship_id}/review", response_model=ControlRelationshipResponse)
def review_relationship(
    relationship_id: int,
    review_data: ControlRelationshipReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Human review sign-off on AI-proposed control relationships (Approve / Reject / Edit).
    Persists decision in PostgreSQL and records immutable Audit Trail log.
    """
    allowed_roles = {"super_admin", "ciso", "grc", "internal_auditor", "external_auditor"}
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: Role is not authorized to review control relationships."
        )

    rel = db.query(ControlRelationship).filter(ControlRelationship.id == relationship_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Control relationship not found")

    status_val = review_data.status.lower().strip()
    if status_val not in ["approved", "rejected", "proposed"]:
        raise HTTPException(status_code=400, detail="Invalid review status. Must be 'approved', 'rejected', or 'proposed'.")

    prev_status = rel.status
    rel.status = status_val
    rel.reviewed_by = current_user.id
    rel.reviewed_at = datetime.now(timezone.utc)

    if review_data.relationship_type:
        rel.relationship_type = review_data.relationship_type.lower().strip()

    if review_data.notes:
        rel.differences_summary = f"{rel.differences_summary or ''}\nAuditor Note: {review_data.notes}".strip()

    db.commit()
    db.refresh(rel)

    # Record Audit Log
    try:
        audit = AuditLog(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action=f"Control Mapping {status_val.capitalize()}",
            entity_type="ControlRelationship",
            entity_id=rel.id,
            details=f"User {current_user.name} reviewed mapping between control #{rel.source_control_id} and #{rel.target_control_id} (Status: {prev_status} -> {status_val})."
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

    return enrich_relationship(rel, db)


@router.post("/", response_model=ControlRelationshipResponse)
def create_relationship(
    relationship_data: ControlRelationshipCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually create a control-to-control relationship.
    """
    src = db.query(Control).filter(Control.id == relationship_data.source_control_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Source control not found")

    tgt = db.query(Control).filter(Control.id == relationship_data.target_control_id).first()
    if not tgt:
        raise HTTPException(status_code=404, detail="Target control not found")

    if relationship_data.source_control_id == relationship_data.target_control_id:
        raise HTTPException(status_code=400, detail="Cannot create self-referencing relationship")

    # Check for duplicate
    existing = db.query(ControlRelationship).filter(
        ControlRelationship.source_control_id == relationship_data.source_control_id,
        ControlRelationship.target_control_id == relationship_data.target_control_id
    ).first()

    if existing:
        existing.relationship_type = relationship_data.relationship_type
        existing.status = relationship_data.status or "approved"
        existing.mapping_source = "manual"
        db.commit()
        db.refresh(existing)
        return enrich_relationship(existing, db)

    new_relationship = ControlRelationship(
        source_control_id=relationship_data.source_control_id,
        target_control_id=relationship_data.target_control_id,
        relationship_type=relationship_data.relationship_type,
        source_reference=relationship_data.source_reference or "Manual Configuration",
        mapping_confidence=relationship_data.mapping_confidence or 1.0,
        status=relationship_data.status or "approved",
        mapping_source="manual",
        ai_explanation=relationship_data.ai_explanation or "Manually configured control mapping.",
        overlap_summary=relationship_data.overlap_summary,
        differences_summary=relationship_data.differences_summary,
        reviewed_by=current_user.id,
        reviewed_at=datetime.now(timezone.utc)
    )

    db.add(new_relationship)
    db.commit()
    db.refresh(new_relationship)

    # Audit log
    try:
        audit = AuditLog(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="Control Mapping Created",
            entity_type="ControlRelationship",
            entity_id=new_relationship.id,
            details=f"Manually mapped control {src.control_code} to {tgt.control_code} as '{relationship_data.relationship_type}'."
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

    return enrich_relationship(new_relationship, db)


@router.get("/{relationship_id}", response_model=ControlRelationshipResponse)
def get_relationship(
    relationship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    relationship = db.query(ControlRelationship).filter(
        ControlRelationship.id == relationship_id
    ).first()

    if relationship is None:
        raise HTTPException(
            status_code=404,
            detail="Control relationship not found"
        )

    return enrich_relationship(relationship, db)


@router.delete("/{relationship_id}")
def delete_relationship(
    relationship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    allowed_roles = {"super_admin", "ciso", "grc"}
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Permission denied: Insufficient permissions to delete control mapping.")

    relationship = db.query(ControlRelationship).filter(
        ControlRelationship.id == relationship_id
    ).first()

    if relationship is None:
        raise HTTPException(
            status_code=404,
            detail="Control relationship not found"
        )

    db.delete(relationship)
    db.commit()

    try:
        audit = AuditLog(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="Control Mapping Deleted",
            entity_type="ControlRelationship",
            entity_id=relationship_id,
            details=f"User {current_user.name} removed control relationship #{relationship_id}."
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

    return {
        "message": "Control relationship deleted successfully"
    }