from pydantic import BaseModel


class EvidenceControlMappingCreate(BaseModel):
    evidence_id: int
    control_id: int
    mapping_type: str = "manual"
    confidence_score: float | None = None
    mapping_status: str = "pending"
    notes: str | None = None


class EvidenceControlMappingResponse(BaseModel):
    id: int
    evidence_id: int
    control_id: int
    mapping_type: str
    confidence_score: float | None
    mapping_status: str
    notes: str | None

    class Config:
        from_attributes = True