from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FrameworkCreate(BaseModel):
    name: str
    code: str
    version: Optional[str] = "1.0"
    description: Optional[str] = None
    category: Optional[str] = "Information Security & Cyber"


class FrameworkResponse(BaseModel):
    id: int
    name: str
    code: str
    version: Optional[str] = "1.0"
    description: Optional[str] = None
    category: Optional[str] = "Information Security & Cyber"
    is_active: bool = True
    file_name: Optional[str] = None
    status: Optional[str] = "completed"
    error_message: Optional[str] = None
    total_controls: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True