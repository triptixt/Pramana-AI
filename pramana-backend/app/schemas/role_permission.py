from pydantic import BaseModel


class RolePermissionCreate(BaseModel):
    role_id: int
    permission_id: int


class RolePermissionResponse(BaseModel):
    role_id: int
    permission_id: int

    class Config:
        from_attributes = True