from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class ControlSummary(BaseModel):
    id: int
    framework_version_id: int
    control_code: str
    title: str
    category: Optional[str] = None
    description: Optional[str] = None
    requirement: Optional[str] = None
    framework_id: Optional[int] = None
    framework_name: Optional[str] = None
    framework_code: Optional[str] = None
    framework_version: Optional[str] = None

    class Config:
        from_attributes = True


class ControlRelationshipCreate(BaseModel):
    source_control_id: int
    target_control_id: int
    relationship_type: str
    source_reference: Optional[str] = None
    mapping_confidence: Optional[float] = 1.0
    status: Optional[str] = "proposed"
    mapping_source: Optional[str] = "manual"
    ai_explanation: Optional[str] = None
    overlap_summary: Optional[str] = None
    differences_summary: Optional[str] = None


class ControlRelationshipReviewRequest(BaseModel):
    status: str # "approved" | "rejected" | "proposed"
    relationship_type: Optional[str] = None
    notes: Optional[str] = None


class ControlRelationshipGenerateRequest(BaseModel):
    source_framework_version_id: int
    target_framework_version_id: Optional[int] = None
    source_control_id: Optional[int] = None
    min_confidence: Optional[float] = 0.5
    top_k: Optional[int] = 3


class ControlRelationshipResponse(BaseModel):
    id: int
    source_control_id: int
    target_control_id: int
    relationship_type: str
    source_reference: Optional[str] = None
    mapping_confidence: Optional[float] = None
    status: str = "proposed"
    mapping_source: Optional[str] = "ai_generated"
    ai_explanation: Optional[str] = None
    overlap_summary: Optional[str] = None
    differences_summary: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    source_control: Optional[ControlSummary] = None
    target_control: Optional[ControlSummary] = None

    class Config:
        from_attributes = True