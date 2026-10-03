from pydantic import BaseModel


class EvidenceCreate(BaseModel):
    organization_id: int
    uploaded_by: int
    file_name: str
    file_path: str
    file_type: str | None = None
    description: str | None = None
    status: str = "uploaded"


class EvidenceResponse(BaseModel):
    id: int
    organization_id: int
    uploaded_by: int
    file_name: str
    file_path: str
    file_type: str | None
    description: str | None
    status: str

    class Config:
        from_attributes = True