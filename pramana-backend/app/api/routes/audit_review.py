from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.audit_review import AuditReview
from app.schemas.audit_review import (
    AuditReviewCreate,
    AuditReviewResponse
)

router = APIRouter(
    prefix="/audit-reviews",
    tags=["Audit Reviews"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=AuditReviewResponse)
def create_review(
    review_data: AuditReviewCreate,
    db: Session = Depends(get_db)
):
    new_review = AuditReview(
        audit_id=review_data.audit_id,
        reviewer_id=review_data.reviewer_id,
        status=review_data.status,
        comments=review_data.comments,
        reviewed_at=review_data.reviewed_at
    )

    db.add(new_review)
    db.commit()
    db.refresh(new_review)

    return new_review


@router.get("/", response_model=list[AuditReviewResponse])
def get_reviews(db: Session = Depends(get_db)):
    return db.query(AuditReview).all()


@router.get("/{review_id}", response_model=AuditReviewResponse)
def get_review(
    review_id: int,
    db: Session = Depends(get_db)
):
    review = db.query(AuditReview).filter(
        AuditReview.id == review_id
    ).first()

    if review is None:
        raise HTTPException(
            status_code=404,
            detail="Audit review not found"
        )

    return review


@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    db: Session = Depends(get_db)
):
    review = db.query(AuditReview).filter(
        AuditReview.id == review_id
    ).first()

    if review is None:
        raise HTTPException(
            status_code=404,
            detail="Audit review not found"
        )

    db.delete(review)
    db.commit()

    return {"message": "Audit review deleted successfully"}