from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.role import Role
from app.models.user_role import UserRole
from app.models.audit_log import AuditLog
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.core.security import hash_password
from app.core.dependencies import get_current_user
from app.services.rbac_service import (
    get_user_effective_permissions,
    ensure_user_role,
    cleanup_unused_rbac_data,
    normalize_role_name,
)

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


def check_is_admin(user: User, db: Session) -> bool:
    if not user:
        return False
    if user.role and user.role.lower() in ["super_admin", "superadmin", "admin"]:
        return True
    role = db.query(Role).join(UserRole, UserRole.role_id == Role.id).filter(
        UserRole.user_id == user.id,
        Role.name.in_(["super_admin", "admin"])
    ).first()
    return role is not None


# POST - Create User (CISO / Admin user creation)
@router.post("/", response_model=UserResponse)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_users" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_users' required"
        )

    is_admin = check_is_admin(current_user, db)

    # Multi-tenant organization scoping
    if is_admin and user_data.organization_id:
        target_org_id = user_data.organization_id
    else:
        target_org_id = current_user.organization_id

    # Role validation & restrictions
    target_role_name = normalize_role_name(user_data.role or "viewer")
    if not is_admin and target_role_name == "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Permission denied: Cannot assign Super Admin role"
        )

    # 1. Validation
    clean_name = (user_data.name or "").strip()
    if not clean_name or len(clean_name) < 2:
        raise HTTPException(
            status_code=400,
            detail="User name must be at least 2 characters long"
        )

    clean_email = (user_data.email or "").strip().lower()

    # Check for existing email in DB
    existing_user = db.query(User).filter(
        func.lower(User.email) == clean_email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail=f"User with email '{clean_email}' already registered"
        )

    # Check if target Organization exists
    org = db.query(Organization).filter(
        Organization.id == target_org_id
    ).first()

    if not org:
        raise HTTPException(
            status_code=400,
            detail=f"Organization with ID {target_org_id} does not exist"
        )

    # Password configuration
    raw_password = user_data.password or "Pramana@123"
    if len(raw_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters long"
        )

    pwd_hash = hash_password(raw_password)

    # 2. Storage
    new_user = User(
        organization_id=target_org_id,
        name=clean_name,
        email=clean_email,
        password_hash=pwd_hash,
        is_active=user_data.is_active if user_data.is_active is not None else True,
        role=target_role_name
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Attach Role & RolePermissions idempotently
    ensure_user_role(db, new_user, target_role_name)
    db.commit()

    # Audit log
    audit_event = AuditLog(
        organization_id=new_user.organization_id,
        user_id=current_user.id,
        action="User Created",
        entity_type="User",
        entity_id=new_user.id,
        details=f"User '{new_user.name}' ({new_user.email}) created with role '{target_role_name}' by {current_user.name}."
    )
    db.add(audit_event)
    db.commit()

    db.refresh(new_user)
    return new_user


# GET - Get Users (Scoped to organization for non-superadmin)
@router.get("/", response_model=list[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    is_admin = check_is_admin(current_user, db)
    if is_admin:
        users = db.query(User).options(
            joinedload(User.organization),
            joinedload(User.user_roles).joinedload(UserRole.role)
        ).order_by(User.id.asc()).all()
    else:
        users = db.query(User).options(
            joinedload(User.organization),
            joinedload(User.user_roles).joinedload(UserRole.role)
        ).filter(User.organization_id == current_user.organization_id).order_by(User.id.asc()).all()
    return users


# GET - Get User by ID
@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    is_admin = check_is_admin(current_user, db)
    user = db.query(User).options(
        joinedload(User.organization),
        joinedload(User.user_roles).joinedload(UserRole.role)
    ).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if not is_admin and user.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied to user from another organization"
        )

    return user


# PUT - Update User
@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_users" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_users' required"
        )

    is_admin = check_is_admin(current_user, db)
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if not is_admin:
        # Organization isolation
        if user.organization_id != current_user.organization_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied to user from another organization"
            )

        # Protect Super Admin accounts from being modified by tenant CISOs
        if check_is_admin(user, db):
            raise HTTPException(
                status_code=403,
                detail="Permission denied: Cannot modify Super Admin account"
            )

        # Prevent assigning Super Admin role
        if user_data.role and normalize_role_name(user_data.role) == "super_admin":
            raise HTTPException(
                status_code=403,
                detail="Permission denied: Cannot assign Super Admin role"
            )

        # Prevent CISO from changing own role or deactivating own account
        if user.id == current_user.id:
            if user_data.role and normalize_role_name(user_data.role) != normalize_role_name(user.role or ""):
                raise HTTPException(
                    status_code=403,
                    detail="Cannot alter your own role"
                )
            if user_data.is_active is False:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot deactivate your own account"
                )

    # Name update
    if user_data.name is not None:
        clean_name = user_data.name.strip()
        if len(clean_name) < 2:
            raise HTTPException(
                status_code=400,
                detail="User name must be at least 2 characters long"
            )
        user.name = clean_name

    # Email update
    if user_data.email is not None:
        clean_email = user_data.email.strip().lower()
        existing_user = db.query(User).filter(
            func.lower(User.email) == clean_email,
            User.id != user_id
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail=f"User with email '{clean_email}' already exists"
            )
        user.email = clean_email

    # Status update
    if user_data.is_active is not None:
        user.is_active = user_data.is_active

    # Password update
    if user_data.password:
        if len(user_data.password) < 6:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 6 characters long"
            )
        user.password_hash = hash_password(user_data.password)

    # Organization update (Admin only)
    if is_admin and user_data.organization_id:
        user.organization_id = user_data.organization_id

    db.commit()

    # Role update
    if user_data.role:
        norm_role = normalize_role_name(user_data.role)
        ensure_user_role(db, user, norm_role)
        db.commit()
        cleanup_unused_rbac_data(db)

    # Audit log
    audit_event = AuditLog(
        organization_id=user.organization_id,
        user_id=current_user.id,
        action="User Updated",
        entity_type="User",
        entity_id=user.id,
        details=f"User '{user.name}' ({user.email}) updated by {current_user.name}."
    )
    db.add(audit_event)
    db.commit()

    db.refresh(user)
    return user


# DELETE - Delete or Deactivate User
@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_users" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_users' required"
        )

    is_admin = check_is_admin(current_user, db)
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if not is_admin and user.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied to user from another organization"
        )

    if not is_admin and check_is_admin(user, db):
        raise HTTPException(
            status_code=403,
            detail="Permission denied: Cannot delete Super Admin account"
        )

    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own account"
        )

    user_name = user.name
    user_email = user.email
    org_id = user.organization_id

    # Attempt hard delete if no historical foreign keys exist; fallback to deactivation if referenced
    try:
        db.query(UserRole).filter(UserRole.user_id == user.id).delete()
        db.delete(user)
        db.commit()
        cleanup_unused_rbac_data(db)

        # Audit log
        audit_event = AuditLog(
            organization_id=org_id,
            user_id=current_user.id,
            action="User Deleted",
            entity_type="User",
            entity_id=user_id,
            details=f"User '{user_name}' ({user_email}) removed from system by {current_user.name}."
        )
        db.add(audit_event)
        db.commit()

        return {
            "message": f"User '{user_name}' deleted successfully",
            "deleted": True
        }
    except IntegrityError:
        db.rollback()
        # Safe deactivation fallback to preserve audit history and foreign keys
        target_user = db.query(User).filter(User.id == user_id).first()
        if target_user:
            target_user.is_active = False
            db.commit()

            audit_event = AuditLog(
                organization_id=org_id,
                user_id=current_user.id,
                action="User Deactivated",
                entity_type="User",
                entity_id=user_id,
                details=f"User '{user_name}' ({user_email}) deactivated (preserved audit references) by {current_user.name}."
            )
            db.add(audit_event)
            db.commit()

        return {
            "message": f"User '{user_name}' has linked historical audit/evidence records and was deactivated.",
            "deactivated": True
        }
