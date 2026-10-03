from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.control_relationship import ControlRelationship
from app.schemas.control_relationship import (
    ControlRelationshipCreate,
    ControlRelationshipResponse
)

router = APIRouter(
    prefix="/control-relationships",
    tags=["Control Relationships"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=ControlRelationshipResponse)
def create_relationship(
    relationship_data: ControlRelationshipCreate,
    db: Session = Depends(get_db)
):
    source_control = db.query(ControlRelationship).filter(
        ControlRelationship.source_control_id == relationship_data.source_control_id
    ).first()

    new_relationship = ControlRelationship(
        source_control_id=relationship_data.source_control_id,
        target_control_id=relationship_data.target_control_id,
        relationship_type=relationship_data.relationship_type
    )

    db.add(new_relationship)
    db.commit()
    db.refresh(new_relationship)

    return new_relationship


@router.get("/", response_model=list[ControlRelationshipResponse])
def get_relationships(db: Session = Depends(get_db)):
    return db.query(ControlRelationship).all()


@router.get("/{relationship_id}", response_model=ControlRelationshipResponse)
def get_relationship(
    relationship_id: int,
    db: Session = Depends(get_db)
):
    relationship = db.query(ControlRelationship).filter(
        ControlRelationship.id == relationship_id
    ).first()

    if relationship is None:
        raise HTTPException(
            status_code=404,
            detail="Control relationship not found"
        )

    return relationship


@router.delete("/{relationship_id}")
def delete_relationship(
    relationship_id: int,
    db: Session = Depends(get_db)
):
    relationship = db.query(ControlRelationship).filter(
        ControlRelationship.id == relationship_id
    ).first()

    if relationship is None:
        raise HTTPException(
            status_code=404,
            detail="Control relationship not found"
        )

    db.delete(relationship)
    db.commit()

    return {
        "message": "Control relationship deleted successfully"
    }