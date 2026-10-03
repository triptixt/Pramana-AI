from pydantic import BaseModel
from datetime import datetime


class AIRunCreate(BaseModel):
    organization_id: int
    evidence_id: int | None = None
    triggered_by: int | None = None
    run_type: str
    status: str = "pending"
    model_name: str | None = None
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None


class AIRunResponse(BaseModel):
    id: int
    organization_id: int
    evidence_id: int | None
    triggered_by: int | None
    run_type: str
    status: str
    model_name: str | None
    error_message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True