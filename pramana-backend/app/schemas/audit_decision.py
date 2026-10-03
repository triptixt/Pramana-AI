from pydantic import BaseModel
from datetime import datetime


class AuditDecisionCreate(BaseModel):
    audit_id: int
    decided_by: int
    decision: str
    comments: str | None = None


class AuditDecisionResponse(BaseModel):
    id: int
    audit_id: int
    decided_by: int
    decision: str
    comments: str | None
    decided_at: datetime

    class Config:
        from_attributes = True