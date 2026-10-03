from pydantic import BaseModel


class FrameworkCreate(BaseModel):
    name: str
    code: str
    description: str | None = None


class FrameworkResponse(BaseModel):
    id: int
    name: str
    code: str
    description: str | None

    class Config:
        from_attributes = True