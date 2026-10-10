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


from app.models.user import User
from app.core.dependencies import get_current_user
from app.services.rbac_service import get_user_effective_permissions


@router.post("/", response_model=GapAnalysisResponse)
def create_gap(
    gap_data: GapAnalysisCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_frameworks" not in perms and "manage_controls" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_frameworks' required"
        )

    target_org_id = gap_data.organization_id or current_user.organization_id
    if "manage_organizations" not in perms and target_org_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Cannot create gap analysis for another organization")

    new_gap = GapAnalysis(
        organization_id=target_org_id,
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
def get_gaps(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_organizations" in perms:
        return db.query(GapAnalysis).all()
    return db.query(GapAnalysis).filter(GapAnalysis.organization_id == current_user.organization_id).all()


@router.get("/{gap_id}", response_model=GapAnalysisResponse)
def get_gap(
    gap_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    gap = db.query(GapAnalysis).filter(
        GapAnalysis.id == gap_id
    ).first()

    if gap is None:
        raise HTTPException(
            status_code=404,
            detail="Gap analysis not found"
        )

    perms = get_user_effective_permissions(current_user, db)
    if "manage_organizations" not in perms and gap.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied to gap analysis from another organization"
        )

    return gap


@router.put("/{gap_id}", response_model=GapAnalysisResponse)
def update_gap(
    gap_id: int,
    gap_data: GapAnalysisCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_frameworks" not in perms and "manage_controls" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_frameworks' required"
        )

    gap = db.query(GapAnalysis).filter(
        GapAnalysis.id == gap_id
    ).first()

    if gap is None:
        raise HTTPException(
            status_code=404,
            detail="Gap analysis not found"
        )

    if "manage_organizations" not in perms and gap.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied to gap analysis from another organization"
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_frameworks" not in perms and "manage_controls" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_frameworks' required"
        )

    gap = db.query(GapAnalysis).filter(
        GapAnalysis.id == gap_id
    ).first()

    if gap is None:
        raise HTTPException(
            status_code=404,
            detail="Gap analysis not found"
        )

    if "manage_organizations" not in perms and gap.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied to gap analysis from another organization"
        )

    db.delete(gap)
    db.commit()

    return {"message": "Gap analysis deleted successfully"}