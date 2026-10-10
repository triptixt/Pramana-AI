from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.audit_log import AuditLog
from app.schemas.audit_log import (
    AuditLogCreate,
    AuditLogResponse
)


router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


from app.models.user import User
from app.core.dependencies import get_current_user, is_super_admin
from app.services.rbac_service import get_user_effective_permissions


@router.post("/", response_model=AuditLogResponse)
def create_audit_log(
    log_data: AuditLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_org_id = log_data.organization_id or current_user.organization_id
    
    # Do not add actions performed by superadmin to organization audit trails
    if is_super_admin(current_user) or target_org_id == 1:
        # Return transient response without persisting to organization audit log table
        return AuditLogResponse(
            id=0,
            organization_id=target_org_id,
            user_id=current_user.id,
            action=log_data.action,
            entity_type=log_data.entity_type,
            entity_id=log_data.entity_id,
            details="Super Admin actions are excluded from tenant audit trail."
        )

    perms = get_user_effective_permissions(current_user, db)
    if "manage_organizations" not in perms and target_org_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Cannot create audit logs for another organization")

    new_log = AuditLog(
        organization_id=target_org_id,
        user_id=log_data.user_id or current_user.id,
        action=log_data.action,
        entity_type=log_data.entity_type,
        entity_id=log_data.entity_id,
        details=log_data.details
    )

    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    return new_log


@router.get("/", response_model=list[AuditLogResponse])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "view_audit_logs" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'view_audit_logs' required"
        )

    # Exclude any superadmin user actions - only tenant organization users' actions
    super_admin_user_ids = [
        u.id for u in db.query(User.id).filter(User.role.in_(["super_admin", "superadmin", "admin"])).all()
    ]

    query = db.query(AuditLog)
    if super_admin_user_ids:
        query = query.filter(~AuditLog.user_id.in_(super_admin_user_ids))

    if not is_super_admin(current_user):
        query = query.filter(AuditLog.organization_id == current_user.organization_id)

    return query.order_by(AuditLog.id.desc()).all()


@router.get("/{log_id}", response_model=AuditLogResponse)
def get_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "view_audit_logs" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'view_audit_logs' required"
        )

    log = db.query(AuditLog).filter(
        AuditLog.id == log_id
    ).first()

    if log is None:
        raise HTTPException(
            status_code=404,
            detail="Audit log not found"
        )

    if "manage_organizations" not in perms and log.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied to audit log from another organization"
        )

    return log


@router.delete("/{log_id}")
def delete_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_organizations" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_organizations' required to delete audit logs"
        )

    log = db.query(AuditLog).filter(
        AuditLog.id == log_id
    ).first()

    if log is None:
        raise HTTPException(
            status_code=404,
            detail="Audit log not found"
        )

    db.delete(log)
    db.commit()

    return {"message": "Audit log deleted successfully"}