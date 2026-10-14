from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, is_super_admin
from app.models.ai_output import AIOutput
from app.models.ai_run import AIRun
from app.models.user import User
from app.schemas.ai_output import (
    AIOutputCreate,
    AIOutputResponse
)

router = APIRouter(
    prefix="/ai-outputs",
    tags=["AI Outputs"]
)


@router.post("/", response_model=AIOutputResponse)
def create_ai_output(
    output: AIOutputCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify that the parent AI run belongs to the user's organization
    run = db.query(AIRun).filter(AIRun.id == output.ai_run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Parent AI run not found.")

    if not is_super_admin(current_user) and run.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Cannot create output for another organization's run.")

    new_output = AIOutput(
        ai_run_id=output.ai_run_id,
        control_id=output.control_id,
        output_type=output.output_type,
        content=output.content
    )

    db.add(new_output)
    db.commit()
    db.refresh(new_output)

    return new_output


@router.get("/", response_model=List[AIOutputResponse])
def get_ai_outputs(
    ai_run_id: Optional[int] = Query(None),
    control_id: Optional[int] = Query(None),
    output_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns AI outputs strictly scoped to runs belonging to the user's organization.
    Supports filtering by ai_run_id, control_id, and output_type.
    """
    query = (
        db.query(AIOutput)
        .join(AIRun, AIOutput.ai_run_id == AIRun.id)
    )

    if not is_super_admin(current_user):
        query = query.filter(AIRun.organization_id == current_user.organization_id)

    if ai_run_id:
        query = query.filter(AIOutput.ai_run_id == ai_run_id)

    if control_id:
        query = query.filter(AIOutput.control_id == control_id)

    if output_type:
        query = query.filter(AIOutput.output_type == output_type)

    return query.order_by(AIOutput.id.desc()).all()


@router.get("/{output_id}", response_model=AIOutputResponse)
def get_ai_output(
    output_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = (
        db.query(AIOutput)
        .join(AIRun, AIOutput.ai_run_id == AIRun.id)
        .filter(AIOutput.id == output_id)
    )

    if not is_super_admin(current_user):
        query = query.filter(AIRun.organization_id == current_user.organization_id)

    output = query.first()

    if not output:
        raise HTTPException(
            status_code=404,
            detail="AI Output not found in your organization."
        )

    return output


@router.delete("/{output_id}")
def delete_ai_output(
    output_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = (
        db.query(AIOutput)
        .join(AIRun, AIOutput.ai_run_id == AIRun.id)
        .filter(AIOutput.id == output_id)
    )

    if not is_super_admin(current_user):
        query = query.filter(AIRun.organization_id == current_user.organization_id)

    output = query.first()

    if not output:
        raise HTTPException(
            status_code=404,
            detail="AI Output not found in your organization."
        )

    db.delete(output)
    db.commit()

    return {"message": "AI Output deleted successfully"}