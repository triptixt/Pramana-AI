from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization

from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    ResetPasswordRequest,
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
    clean_email = (user_data.email or "").strip().lower()
    # -----------------------------------------------------
    # Check if email already exists
    # -----------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(func.lower(func.trim(User.email)) == clean_email)
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

    from app.services.rbac_service import initialize_rbac
    from app.models.role import Role
    from app.models.user_role import UserRole

    # Seed all standard roles and permissions for the new organization
    initialize_rbac(db)

    # Assign CISO role to the newly registered founding user
    ciso_role = db.query(Role).filter(
        Role.organization_id == organization.id,
        Role.name == "ciso"
    ).first()

    if ciso_role:
        existing_ur = db.query(UserRole).filter(UserRole.user_id == new_user.id).first()
        if not existing_ur:
            db.add(UserRole(user_id=new_user.id, role_id=ciso_role.id))
            new_user.role = "ciso"
            db.commit()


    token = create_access_token(
        data={
            "sub": str(new_user.id),
            "email": new_user.email,
            "organization_id": organization.id,
            "role": new_user.role or "ciso",
        }
    )

    return {
        "message": "User registered successfully",
        "user_id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "organization_id": organization.id,
        "organization_name": organization.name,
        "access_token": token,
        "token_type": "bearer",
    }


# =========================================================
# LOGIN
# =========================================================

@router.post("/login", response_model=TokenResponse)
def login_user(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    clean_email = (login_data.email or "").strip().lower()
    if not clean_email or not login_data.password:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    # -----------------------------------------------------
    # Find user (case-insensitive & trimmed)
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(func.lower(func.trim(User.email)) == clean_email)
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
            detail="Invalid email or password",
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
    # Create JWT with role and org claims
    # -----------------------------------------------------

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "organization_id": user.organization_id,
            "role": user.role or "ciso",
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# =========================================================
# RESET / SET PASSWORD
# =========================================================

@router.post("/reset-password")
def reset_password(
    reset_data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    clean_email = (reset_data.email or "").strip().lower()
    if not clean_email or not reset_data.new_password:
        raise HTTPException(
            status_code=400,
            detail="Email and new password are required",
        )

    if len(reset_data.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters long",
        )

    user = (
        db.query(User)
        .filter(func.lower(func.trim(User.email)) == clean_email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found with this email",
        )

    user.password_hash = hash_password(reset_data.new_password)
    db.commit()
    db.refresh(user)

    return {
        "message": f"Password reset successfully for {user.email}",
        "email": user.email,
    }


# =========================================================
# CURRENT USER
# =========================================================

@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.services.rbac_service import get_user_effective_permissions
    from app.models.role import Role
    from app.models.user_role import UserRole

    # Load actual role from database
    user_role_record = (
        db.query(Role)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(UserRole.user_id == current_user.id)
        .first()
    )

    role_name = user_role_record.name if user_role_record else (current_user.role or "viewer")
    role_id = user_role_record.id if user_role_record else None

    permissions = sorted(list(get_user_effective_permissions(current_user, db)))
    
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "organization_id": current_user.organization_id,
        "organization_name": current_user.organization_name,
        "is_active": current_user.is_active,
        "role": role_name,
        "role_info": {
            "id": role_id,
            "name": role_name,
        },
        "permissions": permissions,
    }


# =========================================================
# IMPERSONATE USER ("Log in as") - Super Admin only
# =========================================================

@router.post("/impersonate/{user_id}", response_model=TokenResponse)
def impersonate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.core.dependencies import require_super_admin
    from app.models.audit_log import AuditLog

    # Enforce Super Admin authorization
    require_super_admin(current_user, db)

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    if not target_user.is_active:
        raise HTTPException(status_code=400, detail="Cannot impersonate an inactive user")

    # Record impersonation in PostgreSQL Audit Logs
    audit_entry = AuditLog(
        organization_id=target_user.organization_id,
        user_id=current_user.id,
        action="User Impersonated",
        entity_type="User",
        entity_id=target_user.id,
        details=f"Super Admin '{current_user.email}' impersonated user '{target_user.email}' (ID {target_user.id})."
    )
    db.add(audit_entry)
    db.commit()

    # Generate a scoped access token for the target user
    impersonation_token = create_access_token(
        data={
            "sub": str(target_user.id),
            "email": target_user.email,
            "organization_id": target_user.organization_id,
            "impersonated_by": current_user.id
        }
    )

    return {
        "access_token": impersonation_token,
        "token_type": "bearer",
    }


# =========================================================
# LOGOUT
# =========================================================

@router.post("/logout")
def logout_user(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out successfully"}


# =========================================================
# REFRESH TOKEN
# =========================================================

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(current_user: User = Depends(get_current_user)):
    new_token = create_access_token(
        data={
            "sub": str(current_user.id),
            "email": current_user.email,
            "organization_id": current_user.organization_id,
        }
    )
    return {
        "access_token": new_token,
        "token_type": "bearer",
    }