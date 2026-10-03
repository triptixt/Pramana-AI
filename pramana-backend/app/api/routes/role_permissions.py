from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.role_permission import RolePermission
from app.schemas.role_permissions import (
    RolePermissionCreate,
    RolePermissionResponse
)

router = APIRouter(
    prefix="/role-permissions",
    tags=["Role Permissions"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=RolePermissionResponse)
def assign_permission(
    mapping_data: RolePermissionCreate,
    db: Session = Depends(get_db)
):
    existing_mapping = db.query(RolePermission).filter(
        RolePermission.role_id == mapping_data.role_id,
        RolePermission.permission_id == mapping_data.permission_id
    ).first()

    if existing_mapping:
        raise HTTPException(
            status_code=400,
            detail="Permission already assigned to this role"
        )

    new_mapping = RolePermission(
        role_id=mapping_data.role_id,
        permission_id=mapping_data.permission_id
    )

    db.add(new_mapping)
    db.commit()
    db.refresh(new_mapping)

    return new_mapping


@router.get("/", response_model=list[RolePermissionResponse])
def get_role_permissions(db: Session = Depends(get_db)):
    return db.query(RolePermission).all()


@router.delete("/{role_id}/{permission_id}")
def delete_role_permission(
    role_id: int,
    permission_id: int,
    db: Session = Depends(get_db)
):
    mapping = db.query(RolePermission).filter(
        RolePermission.role_id == role_id,
        RolePermission.permission_id == permission_id
    ).first()

    if mapping is None:
        raise HTTPException(
            status_code=404,
            detail="Role permission mapping not found"
        )

    db.delete(mapping)
    db.commit()

    return {"message": "Permission removed from role successfully"}