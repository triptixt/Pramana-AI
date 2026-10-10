from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class OrganizationCreate(BaseModel):
    name: str


class OrganizationResponse(BaseModel):
    id: int
    name: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True