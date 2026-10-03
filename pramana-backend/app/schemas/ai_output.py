from pydantic import BaseModel
from datetime import datetime


class AIOutputCreate(BaseModel):
    ai_run_id: int
    output_type: str
    content: str


class AIOutputResponse(BaseModel):
    id: int
    ai_run_id: int
    output_type: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True