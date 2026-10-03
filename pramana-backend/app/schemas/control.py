from pydantic import BaseModel


class ControlCreate(BaseModel):
    framework_version_id: int
    control_code: str
    title: str
    description: str | None = None


class ControlResponse(BaseModel):
    id: int
    framework_version_id: int
    control_code: str
    title: str
    description: str | None

    class Config:
        from_attributes = True