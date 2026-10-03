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


@router.post("/", response_model=AuditLogResponse)
def create_audit_log(
    log_data: AuditLogCreate,
    db: Session = Depends(get_db)
):
    new_log = AuditLog(
        organization_id=log_data.organization_id,
        user_id=log_data.user_id,
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
def get_audit_logs(db: Session = Depends(get_db)):
    return db.query(AuditLog).all()


@router.get("/{log_id}", response_model=AuditLogResponse)
def get_audit_log(
    log_id: int,
    db: Session = Depends(get_db)
):
    log = db.query(AuditLog).filter(
        AuditLog.id == log_id
    ).first()

    if log is None:
        raise HTTPException(
            status_code=404,
            detail="Audit log not found"
        )

    return log


@router.delete("/{log_id}")
def delete_audit_log(
    log_id: int,
    db: Session = Depends(get_db)
):
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