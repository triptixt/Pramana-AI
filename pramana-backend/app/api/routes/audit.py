from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.audit import Audit
from app.schemas.audit import (
    AuditCreate,
    AuditResponse
)

router = APIRouter(
    prefix="/audits",
    tags=["Audits"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


from app.models.user import User
from app.core.dependencies import get_current_user
from app.services.rbac_service import get_user_effective_permissions


@router.post("/", response_model=AuditResponse)
def create_audit(
    audit_data: AuditCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_audits" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_audits' required"
        )

    target_org_id = audit_data.organization_id or current_user.organization_id
    if "manage_organizations" not in perms and target_org_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Cannot create audits for another organization")

    new_audit = Audit(
        organization_id=target_org_id,
        framework_id=audit_data.framework_id,
        created_by=current_user.id,
        name=audit_data.name,
        description=audit_data.description,
        status=audit_data.status,
        start_date=audit_data.start_date,
        end_date=audit_data.end_date
    )

    db.add(new_audit)
    db.commit()
    db.refresh(new_audit)

    return new_audit


@router.get("/", response_model=list[AuditResponse])
def get_audits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "view_reports" not in perms and "manage_audits" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'view_reports' or 'manage_audits' required"
        )

    if "manage_organizations" in perms:
        return db.query(Audit).all()

    return db.query(Audit).filter(
        Audit.organization_id == current_user.organization_id
    ).all()


@router.get("/{audit_id}", response_model=AuditResponse)
def get_audit(
    audit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    audit = db.query(Audit).filter(
        Audit.id == audit_id
    ).first()

    if audit is None:
        raise HTTPException(
            status_code=404,
            detail="Audit not found"
        )

    perms = get_user_effective_permissions(current_user, db)
    if "manage_organizations" not in perms and audit.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied to audit from another organization"
        )

    return audit


@router.put("/{audit_id}", response_model=AuditResponse)
def update_audit(
    audit_id: int,
    audit_data: AuditCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_audits" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_audits' required"
        )

    audit = db.query(Audit).filter(
        Audit.id == audit_id
    ).first()

    if audit is None:
        raise HTTPException(
            status_code=404,
            detail="Audit not found"
        )

    if "manage_organizations" not in perms and audit.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied to audit from another organization"
        )

    audit.organization_id = audit_data.organization_id
    audit.framework_id = audit_data.framework_id
    audit.name = audit_data.name
    audit.description = audit_data.description
    audit.status = audit_data.status
    audit.start_date = audit_data.start_date
    audit.end_date = audit_data.end_date

    db.commit()
    db.refresh(audit)

    return audit


@router.delete("/{audit_id}")
def delete_audit(
    audit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_audits" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_audits' required"
        )

    audit = db.query(Audit).filter(
        Audit.id == audit_id
    ).first()

    if audit is None:
        raise HTTPException(
            status_code=404,
            detail="Audit not found"
        )

    if "manage_organizations" not in perms and audit.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied to audit from another organization"
        )

    db.delete(audit)
    db.commit()

    return {"message": "Audit deleted successfully"}