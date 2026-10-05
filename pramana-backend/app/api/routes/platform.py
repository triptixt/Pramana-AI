from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.organization import Organization
from app.models.user import User
from app.models.framework import Framework
from app.models.evidence import Evidence
from app.models.gap_analysis import GapAnalysis
from app.core.dependencies import require_super_admin

router = APIRouter(
    prefix="/platform",
    tags=["Platform Super Admin"]
)

@router.get("/overview", dependencies=[Depends(require_super_admin)])
def get_platform_overview(db: Session = Depends(get_db)):
    total_organizations = db.query(func.count(Organization.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_frameworks = db.query(func.count(Framework.id)).scalar() or 0
    total_evidence = db.query(func.count(Evidence.id)).scalar() or 0
    open_gaps = db.query(func.count(GapAnalysis.id)).filter(GapAnalysis.status != "resolved").scalar() or 0

    return {
        "status": "success",
        "data": {
            "total_organizations": total_organizations,
            "total_users": total_users,
            "total_frameworks": total_frameworks,
            "total_evidence": total_evidence,
            "open_gaps": open_gaps
        }
    }
