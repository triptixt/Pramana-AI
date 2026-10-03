from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.ai_run import AIRun
from app.schemas.ai_run import (
    AIRunCreate,
    AIRunResponse
)


router = APIRouter(
    prefix="/ai-runs",
    tags=["AI Runs"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=AIRunResponse)
def create_ai_run(
    run_data: AIRunCreate,
    db: Session = Depends(get_db)
):
    new_run = AIRun(
        organization_id=run_data.organization_id,
        evidence_id=run_data.evidence_id,
        triggered_by=run_data.triggered_by,
        run_type=run_data.run_type,
        status=run_data.status,
        model_name=run_data.model_name,
        error_message=run_data.error_message,
        started_at=run_data.started_at,
        completed_at=run_data.completed_at
    )

    db.add(new_run)
    db.commit()
    db.refresh(new_run)

    return new_run


@router.get("/", response_model=list[AIRunResponse])
def get_ai_runs(db: Session = Depends(get_db)):
    return db.query(AIRun).all()


@router.get("/{run_id}", response_model=AIRunResponse)
def get_ai_run(
    run_id: int,
    db: Session = Depends(get_db)
):
    run = db.query(AIRun).filter(
        AIRun.id == run_id
    ).first()

    if run is None:
        raise HTTPException(
            status_code=404,
            detail="AI run not found"
        )

    return run


@router.delete("/{run_id}")
def delete_ai_run(
    run_id: int,
    db: Session = Depends(get_db)
):
    run = db.query(AIRun).filter(
        AIRun.id == run_id
    ).first()

    if run is None:
        raise HTTPException(
            status_code=404,
            detail="AI run not found"
        )

    db.delete(run)
    db.commit()

    return {"message": "AI run deleted successfully"}