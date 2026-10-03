from pydantic import BaseModel


class FrameworkVersionCreate(BaseModel):
    framework_id: int
    version: str
    description: str | None = None


class FrameworkVersionResponse(BaseModel):
    id: int
    framework_id: int
    version: str
    description: str | None

    class Config:
        from_attributes = True