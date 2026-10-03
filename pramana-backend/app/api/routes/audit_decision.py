from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.audit_decision import AuditDecision
from app.schemas.audit_decision import (
    AuditDecisionCreate,
    AuditDecisionResponse
)


router = APIRouter(
    prefix="/audit-decisions",
    tags=["Audit Decisions"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=AuditDecisionResponse)
def create_decision(
    decision_data: AuditDecisionCreate,
    db: Session = Depends(get_db)
):
    new_decision = AuditDecision(
        audit_id=decision_data.audit_id,
        decided_by=decision_data.decided_by,
        decision=decision_data.decision,
        comments=decision_data.comments
    )

    db.add(new_decision)
    db.commit()
    db.refresh(new_decision)

    return new_decision


@router.get("/", response_model=list[AuditDecisionResponse])
def get_decisions(db: Session = Depends(get_db)):
    return db.query(AuditDecision).all()


@router.get("/{decision_id}", response_model=AuditDecisionResponse)
def get_decision(
    decision_id: int,
    db: Session = Depends(get_db)
):
    decision = db.query(AuditDecision).filter(
        AuditDecision.id == decision_id
    ).first()

    if decision is None:
        raise HTTPException(
            status_code=404,
            detail="Audit decision not found"
        )

    return decision


@router.delete("/{decision_id}")
def delete_decision(
    decision_id: int,
    db: Session = Depends(get_db)
):
    decision = db.query(AuditDecision).filter(
        AuditDecision.id == decision_id
    ).first()

    if decision is None:
        raise HTTPException(
            status_code=404,
            detail="Audit decision not found"
        )

    db.delete(decision)
    db.commit()

    return {"message": "Audit decision deleted successfully"}