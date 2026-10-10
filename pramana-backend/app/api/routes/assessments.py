from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.ai.assessment import run_framework_assessment

router = APIRouter(
    prefix="/assessments",
    tags=["Assessments"]
)

@router.post("/")
def create_assessment(
    framework_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Triggers a full AI assessment for the given framework using organization evidence.
    """
    return run_framework_assessment(
        db=db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        framework_id=framework_id
    )
