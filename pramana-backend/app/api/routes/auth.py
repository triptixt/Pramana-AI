from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization

from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    SwitchRoleRequest,
)

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_reset_token,
    verify_reset_token,
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
)

from app.core.dependencies import get_current_user, is_super_admin

security_optional = HTTPBearer(auto_error=False)


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
# FORGOT / RESET PASSWORD
# =========================================================

@router.post("/forgot-password")
def forgot_password(
    req: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    clean_email = (req.email or "").strip().lower()
    user = (
        db.query(User)
        .filter(func.lower(func.trim(User.email)) == clean_email)
        .first()
    )
    if not user:
        return {"message": "If this email exists, a password reset token has been issued."}

    token, otp = create_reset_token(user.id, user.email, user.password_hash or "")
    return {
        "message": "Password reset token generated successfully",
        "reset_token": token,
        "otp_code": otp,
    }


@router.post("/reset-password")
def reset_password(
    reset_data: ResetPasswordRequest,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
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

    # Verification: Must be authenticated session, valid reset token, or valid OTP (Issue #1)
    authorized = False

    # 1. Active session token check
    if credentials and credentials.credentials:
        try:
            payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            auth_user_id = payload.get("sub")
            if auth_user_id is not None:
                auth_user = db.query(User).filter(
                    User.id == int(auth_user_id) if str(auth_user_id).isdigit() else User.email == str(auth_user_id)
                ).first()
                if auth_user and (auth_user.id == user.id or is_super_admin(auth_user)):
                    authorized = True
        except Exception:
            pass

    # 2. Reset token verification
    if not authorized and reset_data.reset_token:
        try:
            payload = verify_reset_token(reset_data.reset_token, user.password_hash or "")
            if payload.get("email") == clean_email or str(payload.get("sub")) == str(user.id):
                authorized = True
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    # 3. OTP code verification
    if not authorized and reset_data.otp_code:
        _, expected_otp = create_reset_token(user.id, user.email, user.password_hash or "")
        if reset_data.otp_code.strip() == expected_otp.strip():
            authorized = True

    if not authorized:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please provide a valid reset_token, otp_code, or active session.",
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
    from app.services.rbac_service import (
        get_user_effective_permissions,
        get_user_assigned_roles,
        resolve_user_access_matrix,
        normalize_role_name,
        get_role_title,
    )
    from app.core.dependencies import is_super_admin

    # Load actual assigned roles from database for this user in their organization
    assigned_roles = get_user_assigned_roles(db, current_user)
    assigned_names = [normalize_role_name(r["name"]) for r in assigned_roles]

    # Active role verification: Ensure active role is one of the assigned roles
    current_norm = normalize_role_name(current_user.role or "")
    if current_norm not in assigned_names and assigned_roles:
        current_norm = normalize_role_name(assigned_roles[0]["name"])
        current_user.role = current_norm
        db.commit()

    is_super = is_super_admin(current_user)
    permissions = sorted(list(get_user_effective_permissions(current_user, db)))
    access_matrix = resolve_user_access_matrix(current_user, set(permissions))

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "organization_id": current_user.organization_id,
        "organization_name": current_user.organization_name,
        "is_active": current_user.is_active,
        "is_super_admin": is_super,
        "role": current_norm,
        "role_title": get_role_title(current_norm),
        "assigned_roles": assigned_roles,
        "can_switch_role": len(assigned_roles) > 1,
        "can_switch_organization": is_super,
        "permissions": permissions,
        "accessible_pages": access_matrix["accessible_pages"],
        "page_access_levels": access_matrix["page_access_levels"],
    }


# =========================================================
# ROLE SWITCHING
# =========================================================

@router.post("/switch-role")
def switch_role(
    req: SwitchRoleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Validates and switches the authenticated user's active role.
    Only allows roles actually assigned to that user in user_roles and valid in their organization.
    """
    from app.services.rbac_service import (
        normalize_role_name,
        get_user_assigned_roles,
        get_user_effective_permissions,
        resolve_user_access_matrix,
        get_role_title,
    )
    from app.models.audit_log import AuditLog
    from app.core.dependencies import is_super_admin

    target_role_norm = normalize_role_name(req.role)
    assigned_roles = get_user_assigned_roles(db, current_user)
    assigned_role_names = [normalize_role_name(r["name"]) for r in assigned_roles]

    if target_role_norm not in assigned_role_names:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{req.role}' is not assigned to you in organization '{current_user.organization_name}'."
        )

    # Super Admin role is strictly restricted to Organization 1
    if target_role_norm == "super_admin" and current_user.organization_id != 1:
        raise HTTPException(
            status_code=403,
            detail="Super Admin role is only valid within the platform management organization."
        )

    old_role = current_user.role
    current_user.role = target_role_norm
    db.commit()
    db.refresh(current_user)

    # Record role switch in Audit Log
    try:
        audit_entry = AuditLog(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="Role Switched",
            entity_type="User",
            entity_id=current_user.id,
            details=f"User '{current_user.name}' ({current_user.email}) switched active role from '{old_role}' to '{target_role_norm}'."
        )
        db.add(audit_entry)
        db.commit()
    except Exception:
        db.rollback()

    # Generate fresh JWT reflecting updated active role
    new_token = create_access_token(
        data={
            "sub": str(current_user.id),
            "email": current_user.email,
            "organization_id": current_user.organization_id,
            "role": target_role_norm,
        }
    )

    # Resolve fresh access matrix for updated active role
    updated_assigned_roles = get_user_assigned_roles(db, current_user)
    is_super = is_super_admin(current_user)
    permissions = sorted(list(get_user_effective_permissions(current_user, db)))
    access_matrix = resolve_user_access_matrix(current_user, set(permissions))

    return {
        "message": f"Switched role to {get_role_title(target_role_norm)}",
        "access_token": new_token,
        "token_type": "bearer",
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "organization_id": current_user.organization_id,
            "organization_name": current_user.organization_name,
            "is_active": current_user.is_active,
            "is_super_admin": is_super,
            "role": target_role_norm,
            "role_title": get_role_title(target_role_norm),
            "assigned_roles": updated_assigned_roles,
            "can_switch_role": len(updated_assigned_roles) > 1,
            "can_switch_organization": is_super,
            "permissions": permissions,
            "accessible_pages": access_matrix["accessible_pages"],
            "page_access_levels": access_matrix["page_access_levels"],
        },
        "assigned_roles": updated_assigned_roles,
        "can_switch_role": len(updated_assigned_roles) > 1,
        "can_switch_organization": is_super,
        "is_super_admin": is_super,
        "permissions": permissions,
        "accessible_pages": access_matrix["accessible_pages"],
        "page_access_levels": access_matrix["page_access_levels"],
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
def logout_user(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.audit_log import AuditLog
    try:
        audit_entry = AuditLog(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="User Signed Out",
            entity_type="User",
            entity_id=current_user.id,
            details=f"User '{current_user.name}' ({current_user.email}) signed out successfully."
        )
        db.add(audit_entry)
        db.commit()
    except Exception:
        db.rollback()

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