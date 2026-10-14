from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_decision import AuditDecision
from app.models.audit import Audit
from app.models.user import User
from app.core.dependencies import get_current_user
from app.services.rbac_service import get_user_effective_permissions
from app.schemas.audit_decision import (
    AuditDecisionCreate,
    AuditDecisionResponse
)


router = APIRouter(
    prefix="/audit-decisions",
    tags=["Audit Decisions"]
)


@router.post("/", response_model=AuditDecisionResponse)
def create_decision(
    decision_data: AuditDecisionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_audits" not in perms:
        raise HTTPException(status_code=403, detail="Permission denied: 'manage_audits' required")

    # Verify audit exists and belongs to current user's organization
    audit = db.query(Audit).filter(Audit.id == decision_data.audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if current_user.role != "super_admin" and audit.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Cannot create decision for audit from another organization")

    new_decision = AuditDecision(
        audit_id=decision_data.audit_id,
        decided_by=current_user.id,
        decision=decision_data.decision,
        comments=decision_data.comments
    )

    db.add(new_decision)
    db.commit()
    db.refresh(new_decision)

    return new_decision


@router.get("/", response_model=list[AuditDecisionResponse])
def get_decisions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_audits" not in perms and "view_evidence" not in perms and "view_reports" not in perms:
        raise HTTPException(status_code=403, detail="Permission denied to view audit decisions")

    query = db.query(AuditDecision).join(Audit, AuditDecision.audit_id == Audit.id)
    if current_user.role != "super_admin":
        query = query.filter(Audit.organization_id == current_user.organization_id)

    return query.all()


@router.get("/{decision_id}", response_model=AuditDecisionResponse)
def get_decision(
    decision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_audits" not in perms and "view_evidence" not in perms and "view_reports" not in perms:
        raise HTTPException(status_code=403, detail="Permission denied to view audit decisions")

    decision = (
        db.query(AuditDecision)
        .join(Audit, AuditDecision.audit_id == Audit.id)
        .filter(AuditDecision.id == decision_id)
        .first()
    )

    if decision is None:
        raise HTTPException(status_code=404, detail="Audit decision not found")

    if current_user.role != "super_admin":
        audit = db.query(Audit).filter(Audit.id == decision.audit_id).first()
        if audit and audit.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Access denied to audit decision from another organization")

    return decision


@router.delete("/{decision_id}")
def delete_decision(
    decision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_audits" not in perms:
        raise HTTPException(status_code=403, detail="Permission denied: 'manage_audits' required")

    decision = db.query(AuditDecision).filter(AuditDecision.id == decision_id).first()
    if decision is None:
        raise HTTPException(status_code=404, detail="Audit decision not found")

    if current_user.role != "super_admin":
        audit = db.query(Audit).filter(Audit.id == decision.audit_id).first()
        if audit and audit.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Access denied to audit decision from another organization")

    db.delete(decision)
    db.commit()

    return {"message": "Audit decision deleted successfully"}