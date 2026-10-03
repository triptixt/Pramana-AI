from pydantic import BaseModel


class ControlRelationshipCreate(BaseModel):
    source_control_id: int
    target_control_id: int
    relationship_type: str


class ControlRelationshipResponse(BaseModel):
    id: int
    source_control_id: int
    target_control_id: int
    relationship_type: str

    class Config:
        from_attributes = True