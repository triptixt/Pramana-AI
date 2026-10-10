
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.permission import Permission
from app.schemas.permissions import (
    PermissionCreate,
    PermissionResponse
)

router = APIRouter(
    prefix="/permissions",
    tags=["Permissions"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


from app.models.user import User
from app.core.dependencies import get_current_user
from app.services.rbac_service import get_user_effective_permissions


@router.post("/", response_model=PermissionResponse)
def create_permission(
    permission_data: PermissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_roles" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_roles' required"
        )

    existing = db.query(Permission).filter(Permission.name == permission_data.name).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Permission already exists"
        )

    new_permission = Permission(
        name=permission_data.name,
        description=permission_data.description
    )

    db.add(new_permission)
    db.commit()
    db.refresh(new_permission)

    return new_permission


@router.get("/", response_model=list[PermissionResponse])
def get_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Permission).all()


@router.get("/{permission_id}", response_model=PermissionResponse)
def get_permission(
    permission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    permission = db.query(Permission).filter(
        Permission.id == permission_id
    ).first()

    if permission is None:
        raise HTTPException(
            status_code=404,
            detail="Permission not found"
        )

    return permission


@router.put("/{permission_id}", response_model=PermissionResponse)
def update_permission(
    permission_id: int,
    permission_data: PermissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_roles" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_roles' required"
        )

    permission = db.query(Permission).filter(
        Permission.id == permission_id
    ).first()

    if permission is None:
        raise HTTPException(
            status_code=404,
            detail="Permission not found"
        )

    permission.name = permission_data.name
    permission.description = permission_data.description

    db.commit()
    db.refresh(permission)

    return permission


@router.delete("/{permission_id}")
def delete_permission(
    permission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_roles" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_roles' required"
        )

    permission = db.query(Permission).filter(
        Permission.id == permission_id
    ).first()

    if permission is None:
        raise HTTPException(
            status_code=404,
            detail="Permission not found"
        )

    from app.models.role_permission import RolePermission
    db.query(RolePermission).filter(RolePermission.permission_id == permission_id).delete(synchronize_session=False)

    db.delete(permission)
    db.commit()

    return {
        "message": "Permission deleted successfully"
    }