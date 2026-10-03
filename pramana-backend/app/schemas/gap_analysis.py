from pydantic import BaseModel
from datetime import datetime


class GapAnalysisCreate(BaseModel):
    organization_id: int
    control_id: int
    status: str = "open"
    severity: str = "medium"
    findings: str | None = None
    recommendation: str | None = None


class GapAnalysisResponse(BaseModel):
    id: int
    organization_id: int
    control_id: int
    status: str
    severity: str
    findings: str | None
    recommendation: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True