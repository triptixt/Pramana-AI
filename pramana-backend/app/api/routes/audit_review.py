from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_review import AuditReview
from app.models.audit import Audit
from app.models.user import User
from app.core.dependencies import get_current_user
from app.services.rbac_service import get_user_effective_permissions
from app.schemas.audit_review import (
    AuditReviewCreate,
    AuditReviewResponse
)

router = APIRouter(
    prefix="/audit-reviews",
    tags=["Audit Reviews"]
)


@router.post("/", response_model=AuditReviewResponse)
def create_review(
    review_data: AuditReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_audits" not in perms and "review_ai_results" not in perms:
        raise HTTPException(status_code=403, detail="Permission denied: 'manage_audits' or 'review_ai_results' required")

    # Verify audit exists and belongs to current user's organization
    audit = db.query(Audit).filter(Audit.id == review_data.audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if current_user.role != "super_admin" and audit.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Cannot review audit from another organization")

    new_review = AuditReview(
        audit_id=review_data.audit_id,
        reviewer_id=current_user.id,
        status=review_data.status,
        comments=review_data.comments,
        reviewed_at=review_data.reviewed_at
    )

    db.add(new_review)
    db.commit()
    db.refresh(new_review)

    return new_review


@router.get("/", response_model=list[AuditReviewResponse])
def get_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_audits" not in perms and "view_evidence" not in perms and "view_reports" not in perms:
        raise HTTPException(status_code=403, detail="Permission denied to view audit reviews")

    query = db.query(AuditReview).join(Audit, AuditReview.audit_id == Audit.id)
    if current_user.role != "super_admin":
        query = query.filter(Audit.organization_id == current_user.organization_id)

    return query.all()


@router.get("/{review_id}", response_model=AuditReviewResponse)
def get_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_audits" not in perms and "view_evidence" not in perms and "view_reports" not in perms:
        raise HTTPException(status_code=403, detail="Permission denied to view audit reviews")

    review = (
        db.query(AuditReview)
        .join(Audit, AuditReview.audit_id == Audit.id)
        .filter(AuditReview.id == review_id)
        .first()
    )

    if review is None:
        raise HTTPException(status_code=404, detail="Audit review not found")

    if current_user.role != "super_admin":
        audit = db.query(Audit).filter(Audit.id == review.audit_id).first()
        if audit and audit.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Access denied to audit review from another organization")

    return review


@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_audits" not in perms:
        raise HTTPException(status_code=403, detail="Permission denied: 'manage_audits' required")

    review = db.query(AuditReview).filter(AuditReview.id == review_id).first()
    if review is None:
        raise HTTPException(status_code=404, detail="Audit review not found")

    if current_user.role != "super_admin":
        audit = db.query(Audit).filter(Audit.id == review.audit_id).first()
        if audit and audit.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Access denied to audit review from another organization")

    db.delete(review)
    db.commit()

    return {"message": "Audit review deleted successfully"}