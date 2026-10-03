from pydantic import BaseModel
from datetime import datetime


class AuditReviewCreate(BaseModel):
    audit_id: int
    reviewer_id: int
    status: str = "pending"
    comments: str | None = None
    reviewed_at: datetime | None = None


class AuditReviewResponse(BaseModel):
    id: int
    audit_id: int
    reviewer_id: int
    status: str
    comments: str | None
    reviewed_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True