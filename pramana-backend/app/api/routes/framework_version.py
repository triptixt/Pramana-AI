from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.framework_version import FrameworkVersion
from app.schemas.framework_version import (
    FrameworkVersionCreate,
    FrameworkVersionResponse
)

router = APIRouter(
    prefix="/framework-versions",
    tags=["Framework Versions"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=FrameworkVersionResponse)
def create_framework_version(
    version_data: FrameworkVersionCreate,
    db: Session = Depends(get_db)
):
    new_version = FrameworkVersion(
        framework_id=version_data.framework_id,
        version=version_data.version,
        description=version_data.description
    )

    db.add(new_version)
    db.commit()
    db.refresh(new_version)

    return new_version


@router.get("/", response_model=list[FrameworkVersionResponse])
def get_framework_versions(db: Session = Depends(get_db)):
    return db.query(FrameworkVersion).all()


@router.get("/{version_id}", response_model=FrameworkVersionResponse)
def get_framework_version(
    version_id: int,
    db: Session = Depends(get_db)
):
    version = db.query(FrameworkVersion).filter(
        FrameworkVersion.id == version_id
    ).first()

    if version is None:
        raise HTTPException(
            status_code=404,
            detail="Framework version not found"
        )

    return version


@router.put("/{version_id}", response_model=FrameworkVersionResponse)
def update_framework_version(
    version_id: int,
    version_data: FrameworkVersionCreate,
    db: Session = Depends(get_db)
):
    version = db.query(FrameworkVersion).filter(
        FrameworkVersion.id == version_id
    ).first()

    if version is None:
        raise HTTPException(
            status_code=404,
            detail="Framework version not found"
        )

    version.framework_id = version_data.framework_id
    version.version = version_data.version
    version.description = version_data.description

    db.commit()
    db.refresh(version)

    return version


@router.delete("/{version_id}")
def delete_framework_version(
    version_id: int,
    db: Session = Depends(get_db)
):
    version = db.query(FrameworkVersion).filter(
        FrameworkVersion.id == version_id
    ).first()

    if version is None:
        raise HTTPException(
            status_code=404,
            detail="Framework version not found"
        )

    db.delete(version)
    db.commit()

    return {
        "message": "Framework version deleted successfully"
    }