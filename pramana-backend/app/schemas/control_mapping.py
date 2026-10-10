from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class EvidenceSummary(BaseModel):
    id: int
    organization_id: int
    file_name: str
    file_type: Optional[str] = None
    description: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


class ControlBriefSummary(BaseModel):
    id: int
    framework_version_id: int
    control_code: str
    title: str
    category: Optional[str] = None
    requirement: Optional[str] = None
    framework_id: Optional[int] = None
    framework_name: Optional[str] = None
    framework_code: Optional[str] = None
    framework_version: Optional[str] = None

    class Config:
        from_attributes = True


class EvidenceControlMappingCreate(BaseModel):
    evidence_id: int
    control_id: int
    mapping_type: str = "manual" # "manual" | "ai_suggested"
    confidence_score: Optional[float] = None
    mapping_status: str = "pending" # "pending" | "approved" | "rejected"
    notes: Optional[str] = None
    ai_explanation: Optional[str] = None
    requirement_supported: Optional[str] = None
    unsupported_requirements: Optional[str] = None


class EvidenceControlMappingReviewRequest(BaseModel):
    mapping_status: str # "approved" | "rejected" | "pending"
    notes: Optional[str] = None


class EvidenceControlMappingGenerateRequest(BaseModel):
    evidence_id: int
    framework_version_id: Optional[int] = None
    control_id: Optional[int] = None
    top_k: Optional[int] = 3


class EvidenceControlMappingResponse(BaseModel):
    id: int
    evidence_id: int
    control_id: int
    mapping_type: str
    confidence_score: Optional[float] = None
    mapping_status: str
    notes: Optional[str] = None
    ai_explanation: Optional[str] = None
    requirement_supported: Optional[str] = None
    unsupported_requirements: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    evidence: Optional[EvidenceSummary] = None
    control: Optional[ControlBriefSummary] = None

    class Config:
        from_attributes = True