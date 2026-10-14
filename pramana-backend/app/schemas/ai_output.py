from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AIOutputCreate(BaseModel):
    ai_run_id: int
    control_id: Optional[int] = None
    output_type: str
    content: str


class AIOutputResponse(BaseModel):
    id: int
    ai_run_id: int
    control_id: Optional[int] = None
    output_type: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True