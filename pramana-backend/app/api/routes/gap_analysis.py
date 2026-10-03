from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.gap_analysis import GapAnalysis
from app.schemas.gap_analysis import (
    GapAnalysisCreate,
    GapAnalysisResponse
)

router = APIRouter(
    prefix="/gap-analysis",
    tags=["Gap Analysis"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=GapAnalysisResponse)
def create_gap(
    gap_data: GapAnalysisCreate,
    db: Session = Depends(get_db)
):
    new_gap = GapAnalysis(
        organization_id=gap_data.organization_id,
        control_id=gap_data.control_id,
        status=gap_data.status,
        severity=gap_data.severity,
        findings=gap_data.findings,
        recommendation=gap_data.recommendation
    )

    db.add(new_gap)
    db.commit()
    db.refresh(new_gap)

    return new_gap


@router.get("/", response_model=list[GapAnalysisResponse])
def get_gaps(db: Session = Depends(get_db)):
    return db.query(GapAnalysis).all()


@router.get("/{gap_id}", response_model=GapAnalysisResponse)
def get_gap(
    gap_id: int,
    db: Session = Depends(get_db)
):
    gap = db.query(GapAnalysis).filter(
        GapAnalysis.id == gap_id
    ).first()

    if gap is None:
        raise HTTPException(
            status_code=404,
            detail="Gap analysis not found"
        )

    return gap
@router.put("/{gap_id}", response_model=GapAnalysisResponse)
def update_gap(
    gap_id: int,
    gap_data: GapAnalysisCreate,
    db: Session = Depends(get_db)
):
    gap = db.query(GapAnalysis).filter(
        GapAnalysis.id == gap_id
    ).first()

    if gap is None:
        raise HTTPException(
            status_code=404,
            detail="Gap analysis not found"
        )

    gap.organization_id = gap_data.organization_id
    gap.control_id = gap_data.control_id
    gap.status = gap_data.status
    gap.severity = gap_data.severity
    gap.findings = gap_data.findings
    gap.recommendation = gap_data.recommendation

    db.commit()
    db.refresh(gap)

    return gap


@router.delete("/{gap_id}")
def delete_gap(
    gap_id: int,
    db: Session = Depends(get_db)
):
    gap = db.query(GapAnalysis).filter(
        GapAnalysis.id == gap_id
    ).first()

    if gap is None:
        raise HTTPException(
            status_code=404,
            detail="Gap analysis not found"
        )

    db.delete(gap)
    db.commit()

    return {"message": "Gap analysis deleted successfully"}