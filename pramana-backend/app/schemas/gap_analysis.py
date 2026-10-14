from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class GapAnalysisCreate(BaseModel):
    organization_id: int
    control_id: int
    audit_id: Optional[int] = None
    status: str = "open"
    severity: Optional[str] = "medium"
    severity_reason: Optional[str] = None
    findings: Optional[str] = None
    recommendation: Optional[str] = None


class GapAnalysisResponse(BaseModel):
    id: int
    organization_id: int
    control_id: int
    audit_id: Optional[int] = None
    status: str
    severity: Optional[str] = None
    severity_reason: Optional[str] = None
    findings: Optional[str] = None
    recommendation: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True