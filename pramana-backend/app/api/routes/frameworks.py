from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.framework import Framework
from app.schemas.framework import (
    FrameworkCreate,
    FrameworkResponse
)

router = APIRouter(
    prefix="/frameworks",
    tags=["Frameworks"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=List[FrameworkResponse])
def get_frameworks(db: Session = Depends(get_db)):
    """Fetch all compliance frameworks from PostgreSQL."""
    return db.query(Framework).all()


@router.get("/{framework_id}", response_model=FrameworkResponse)
def get_framework(framework_id: int, db: Session = Depends(get_db)):
    """Fetch a single compliance framework by ID."""
    framework = db.query(Framework).filter(Framework.id == framework_id).first()
    if not framework:
        raise HTTPException(
            status_code=404,
            detail="Framework not found"
        )
    return framework


@router.post("/", response_model=FrameworkResponse)
def create_framework(
    framework_data: FrameworkCreate,
    db: Session = Depends(get_db)
):
    existing_framework = db.query(Framework).filter(
        Framework.code == framework_data.code
    ).first()

    if existing_framework:
        raise HTTPException(
            status_code=400,
            detail="Framework code already exists"
        )

    new_framework = Framework(
        name=framework_data.name,
        code=framework_data.code,
        description=framework_data.description
    )

    db.add(new_framework)
    db.commit()
    db.refresh(new_framework)

    return new_framework