from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization

from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
)

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)

from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# =========================================================
# REGISTER
# =========================================================

@router.post("/register")
def register_user(
    user_data: RegisterRequest,
    db: Session = Depends(get_db),
):
    # -----------------------------------------------------
    # Check if email already exists
    # -----------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    # -----------------------------------------------------
    # Create Organization
    # -----------------------------------------------------

    organization = Organization(
        name=user_data.organization_name
    )

    db.add(organization)
    db.flush()

    # -----------------------------------------------------
    # Create User
    # -----------------------------------------------------

    new_user = User(
        organization_id=organization.id,
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        is_active=True,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "organization_id": organization.id,
        "organization_name": organization.name,
    }


# =========================================================
# LOGIN
# =========================================================

@router.post("/login", response_model=TokenResponse)
def login_user(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    # -----------------------------------------------------
    # Find user
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(User.email == login_data.email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    # -----------------------------------------------------
    # Check active status
    # -----------------------------------------------------

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="User account is inactive",
        )

    # -----------------------------------------------------
    # Check password
    # -----------------------------------------------------

    if not user.password_hash:
        raise HTTPException(
            status_code=401,
            detail="Password is not configured for this user",
        )

    if not verify_password(
        login_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    # -----------------------------------------------------
    # Create JWT
    # -----------------------------------------------------

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "organization_id": user.organization_id,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# =========================================================
# CURRENT USER
# =========================================================

@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "organization_id": current_user.organization_id,
        "is_active": current_user.is_active,
    }