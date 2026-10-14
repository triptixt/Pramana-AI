from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, is_super_admin
from app.services.rbac_service import get_user_effective_permissions
from app.models.ai_run import AIRun
from app.models.user import User
from app.schemas.ai_run import (
    AIRunCreate,
    AIRunResponse
)

router = APIRouter(
    prefix="/ai-runs",
    tags=["AI Runs"]
)


@router.post("/", response_model=AIRunResponse)
def create_ai_run(
    run_data: AIRunCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "run_ai_analysis" not in perms:
        raise HTTPException(status_code=403, detail="Permission denied: 'run_ai_analysis' required")

    # Enforce organization boundary
    target_org_id = current_user.organization_id if not is_super_admin(current_user) else (run_data.organization_id or current_user.organization_id)

    new_run = AIRun(
        organization_id=target_org_id,
        evidence_id=run_data.evidence_id,
        triggered_by=current_user.id,
        run_type=run_data.run_type,
        status=run_data.status or "pending",
        model_name=run_data.model_name,
        error_message=run_data.error_message,
        started_at=run_data.started_at,
        completed_at=run_data.completed_at
    )

    db.add(new_run)
    db.commit()
    db.refresh(new_run)

    return new_run


@router.get("/", response_model=List[AIRunResponse])
def get_ai_runs(
    run_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns AI runs strictly scoped to the authenticated user's organization.
    Super Admins can view runs across all organizations.
    """
    query = db.query(AIRun)

    if not is_super_admin(current_user):
        query = query.filter(AIRun.organization_id == current_user.organization_id)

    if run_type:
        query = query.filter(AIRun.run_type == run_type)

    if status:
        query = query.filter(AIRun.status == status)

    return query.order_by(AIRun.id.desc()).all()


@router.get("/{run_id}", response_model=AIRunResponse)
def get_ai_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AIRun).filter(AIRun.id == run_id)

    if not is_super_admin(current_user):
        query = query.filter(AIRun.organization_id == current_user.organization_id)

    run = query.first()

    if run is None:
        raise HTTPException(
            status_code=404,
            detail="AI run not found in your organization."
        )

    return run


@router.delete("/{run_id}")
def delete_ai_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AIRun).filter(AIRun.id == run_id)

    if not is_super_admin(current_user):
        query = query.filter(AIRun.organization_id == current_user.organization_id)

    run = query.first()

    if run is None:
        raise HTTPException(
            status_code=404,
            detail="AI run not found in your organization."
        )

    db.delete(run)
    db.commit()

    return {"message": "AI run deleted successfully"}