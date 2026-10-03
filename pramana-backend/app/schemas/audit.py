from pydantic import BaseModel
from datetime import datetime


class AuditCreate(BaseModel):
    organization_id: int
    framework_id: int
    created_by: int
    name: str
    description: str | None = None
    status: str = "draft"
    start_date: datetime | None = None
    end_date: datetime | None = None


class AuditResponse(BaseModel):
    id: int
    organization_id: int
    framework_id: int
    created_by: int
    name: str
    description: str | None
    status: str
    start_date: datetime | None
    end_date: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True
