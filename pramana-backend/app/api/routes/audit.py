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


@router.post("/", response_model=AuditResponse)
def create_audit(
    audit_data: AuditCreate,
    db: Session = Depends(get_db)
):
    new_audit = Audit(
        organization_id=audit_data.organization_id,
        framework_id=audit_data.framework_id,
        created_by=audit_data.created_by,
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
def get_audits(db: Session = Depends(get_db)):
    return db.query(Audit).all()


@router.get("/{audit_id}", response_model=AuditResponse)
def get_audit(
    audit_id: int,
    db: Session = Depends(get_db)
):
    audit = db.query(Audit).filter(
        Audit.id == audit_id
    ).first()

    if audit is None:
        raise HTTPException(
            status_code=404,
            detail="Audit not found"
        )

    return audit
@router.put("/{audit_id}", response_model=AuditResponse)
def update_audit(
    audit_id: int,
    audit_data: AuditCreate,
    db: Session = Depends(get_db)
):
    audit = db.query(Audit).filter(
        Audit.id == audit_id
    ).first()

    if audit is None:
        raise HTTPException(
            status_code=404,
            detail="Audit not found"
        )

    audit.organization_id = audit_data.organization_id
    audit.framework_id = audit_data.framework_id
    audit.created_by = audit_data.created_by
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
    db: Session = Depends(get_db)
):
    audit = db.query(Audit).filter(
        Audit.id == audit_id
    ).first()

    if audit is None:
        raise HTTPException(
            status_code=404,
            detail="Audit not found"
        )

    db.delete(audit)
    db.commit()

    return {"message": "Audit deleted successfully"}