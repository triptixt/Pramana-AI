from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    organization_id: int
    name: str
    email: EmailStr


class UserResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    email: EmailStr
    is_active: bool

    class Config:
        from_attributes = True