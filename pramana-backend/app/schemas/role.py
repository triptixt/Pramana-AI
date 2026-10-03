from pydantic import BaseModel


class RoleCreate(BaseModel):
    organization_id: int
    name: str
    description: str | None = None


class RoleResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    description: str | None

    class Config:
        from_attributes = True