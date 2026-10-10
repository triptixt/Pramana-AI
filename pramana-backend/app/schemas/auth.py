from typing import Optional
from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    organization_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str
    reset_token: Optional[str] = None
    otp_code: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str