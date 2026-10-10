from pydantic import BaseModel, EmailStr
from typing import Optional


class UserCreate(BaseModel):
    organization_id: Optional[int] = None
    name: str
    email: EmailStr
    role: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = True


class UserUpdate(BaseModel):
    organization_id: Optional[int] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    organization_id: int
    organization_name: Optional[str] = None
    name: str
    email: EmailStr
    is_active: bool
    role: Optional[str] = None

    class Config:
        from_attributes = True