from pydantic import BaseModel
from datetime import datetime


class AuditLogCreate(BaseModel):
    organization_id: int
    user_id: int | None = None
    action: str
    entity_type: str
    entity_id: int | None = None
    details: str | None = None


class AuditLogResponse(BaseModel):
    id: int
    organization_id: int
    user_id: int | None
    action: str
    entity_type: str
    entity_id: int | None
    details: str | None
    created_at: datetime

    class Config:
        from_attributes = True