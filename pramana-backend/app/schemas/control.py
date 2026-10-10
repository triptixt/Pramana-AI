from pydantic import BaseModel
from typing import Optional


class ControlCreate(BaseModel):
    framework_version_id: int
    control_code: str
    title: str
    description: Optional[str] = None
    requirement: Optional[str] = None
    category: Optional[str] = None
    guidance: Optional[str] = None
    source_reference: Optional[str] = None


class ControlResponse(BaseModel):
    id: int
    framework_version_id: int
    control_code: str
    title: str
    description: Optional[str] = None
    requirement: Optional[str] = None
    category: Optional[str] = None
    guidance: Optional[str] = None
    source_reference: Optional[str] = None
    is_active: bool = True
    framework_code: Optional[str] = None
    framework_name: Optional[str] = None

    class Config:
        from_attributes = True
