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


@router.post("/", response_model=RoleResponse)
def create_role(
    role_data: RoleCreate,
    db: Session = Depends(get_db)
):
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
def get_roles(db: Session = Depends(get_db)):
    return db.query(Role).all()


@router.get("/{role_id}", response_model=RoleResponse)
def get_role(
    role_id: int,
    db: Session = Depends(get_db)
):
    role = db.query(Role).filter(Role.id == role_id).first()

    if role is None:
        raise HTTPException(
            status_code=404,
            detail="Role not found"
        )

    return role


@router.put("/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: int,
    role_data: RoleCreate,
    db: Session = Depends(get_db)
):
    role = db.query(Role).filter(Role.id == role_id).first()

    if role is None:
        raise HTTPException(
            status_code=404,
            detail="Role not found"
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
    db: Session = Depends(get_db)
):
    role = db.query(Role).filter(Role.id == role_id).first()

    if role is None:
        raise HTTPException(
            status_code=404,
            detail="Role not found"
        )

    db.delete(role)
    db.commit()

    return {
        "message": "Role deleted successfully"
    }