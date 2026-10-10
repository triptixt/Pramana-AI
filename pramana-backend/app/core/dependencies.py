import os
import logging

from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User

load_dotenv()

logger = logging.getLogger("pramana.auth")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    if str(user_id).isdigit():
        user = db.query(User).filter(User.id == int(user_id)).first()
    else:
        user = db.query(User).filter(User.email == str(user_id)).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="User account is inactive"
        )

    return user

def is_super_admin(user: User) -> bool:
    """Returns True if the user is a platform super administrator."""
    if not user:
        return False
    if user.role and user.role.lower() in ["super_admin", "superadmin", "admin"]:
        return True
    return False

def require_super_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    from app.models.role import Role
    from app.models.user_role import UserRole
    
    user_roles = (
        db.query(Role)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(UserRole.user_id == current_user.id)
        .all()
    )
    role_names = [r.name.lower() for r in user_roles]
    role_ids = [r.id for r in user_roles]

    is_admin = False
    if current_user.role and current_user.role.lower() in ["super_admin", "superadmin", "admin"]:
        is_admin = True
    elif "super_admin" in role_names or "admin" in role_names:
        is_admin = True

    logger.info(
        f"[AUTH CHECK: SuperAdmin] UserID={current_user.id}, Email={current_user.email}, "
        f"OrgID={current_user.organization_id}, RoleIDs={role_ids}, RoleNames={role_names}, Allowed={is_admin}"
    )
            
    if not is_admin:
        raise HTTPException(status_code=403, detail="SuperAdmin privileges required")
    
    return current_user


def require_permission(permission_name: str):
    """
    FastAPI dependency factory to enforce a specific RBAC permission.
    Permissions are resolved via PostgreSQL user_roles -> role_permissions -> permissions.
    """
    def permission_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        from app.models.role import Role
        from app.models.user_role import UserRole
        from app.services.rbac_service import get_user_effective_permissions

        user_roles = (
            db.query(Role)
            .join(UserRole, UserRole.role_id == Role.id)
            .filter(UserRole.user_id == current_user.id)
            .all()
        )
        role_names = [r.name for r in user_roles]
        role_ids = [r.id for r in user_roles]

        user_perms = get_user_effective_permissions(current_user, db)
        has_perm = permission_name in user_perms

        logger.info(
            f"[AUTH CHECK: Permission] UserID={current_user.id}, Email={current_user.email}, "
            f"OrgID={current_user.organization_id}, RoleIDs={role_ids}, RoleNames={role_names}, "
            f"RequiredPerm='{permission_name}', Allowed={has_perm}"
        )

        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: '{permission_name}' required"
            )
        return current_user
    return permission_checker