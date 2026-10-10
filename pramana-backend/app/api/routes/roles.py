from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.role import Role
from app.schemas.role import RoleCreate, RoleResponse


router = APIRouter(
    prefix="/roles",
    tags=["Roles"]
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


@router.post("/", response_model=RoleResponse)
def create_role(
    role_data: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_roles" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_roles' required"
        )

    # Multi-tenant check
    if "manage_organizations" not in perms and role_data.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot create roles for another organization"
        )

    new_role = Role(
        organization_id=role_data.organization_id,
        name=role_data.name,
        description=role_data.description
    )

    db.add(new_role)
    db.commit()
    db.refresh(new_role)

    return new_role


@router.get("/", response_model=list[RoleResponse])
def get_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_organizations" in perms:
        return db.query(Role).all()
    return db.query(Role).filter(Role.organization_id == current_user.organization_id).all()


@router.get("/{role_id}", response_model=RoleResponse)
def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role = db.query(Role).filter(Role.id == role_id).first()

    if role is None:
        raise HTTPException(
            status_code=404,
            detail="Role not found"
        )

    perms = get_user_effective_permissions(current_user, db)
    if "manage_organizations" not in perms and role.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied to role from another organization"
        )

    return role


@router.put("/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: int,
    role_data: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_roles" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_roles' required"
        )

    role = db.query(Role).filter(Role.id == role_id).first()

    if role is None:
        raise HTTPException(
            status_code=404,
            detail="Role not found"
        )

    if "manage_organizations" not in perms and role.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied to role from another organization"
        )

    role.organization_id = role_data.organization_id
    role.name = role_data.name
    role.description = role_data.description

    db.commit()
    db.refresh(role)

    return role


@router.delete("/{role_id}")
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_roles" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_roles' required"
        )

    role = db.query(Role).filter(Role.id == role_id).first()

    if role is None:
        raise HTTPException(
            status_code=404,
            detail="Role not found"
        )

    if "manage_organizations" not in perms and role.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied to role from another organization"
        )

    from app.models.role_permission import RolePermission
    from app.models.user_role import UserRole

    db.query(RolePermission).filter(RolePermission.role_id == role_id).delete(synchronize_session=False)
    db.query(UserRole).filter(UserRole.role_id == role_id).delete(synchronize_session=False)

    db.delete(role)
    db.commit()

    return {
        "message": "Role deleted successfully"
    }