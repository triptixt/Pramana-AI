from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.control import Control
from app.schemas.control import (
    ControlCreate,
    ControlResponse
)

router = APIRouter(
    prefix="/controls",
    tags=["Controls"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=ControlResponse)
def create_control(
    control_data: ControlCreate,
    db: Session = Depends(get_db)
):
    new_control = Control(
        framework_version_id=control_data.framework_version_id,
        control_code=control_data.control_code,
        title=control_data.title,
        description=control_data.description
    )

    db.add(new_control)
    db.commit()
    db.refresh(new_control)

    return new_control


@router.get("/", response_model=list[ControlResponse])
def get_controls(db: Session = Depends(get_db)):
    return db.query(Control).all()


@router.get("/{control_id}", response_model=ControlResponse)
def get_control(
    control_id: int,
    db: Session = Depends(get_db)
):
    control = db.query(Control).filter(
        Control.id == control_id
    ).first()

    if control is None:
        raise HTTPException(
            status_code=404,
            detail="Control not found"
        )

    return control


@router.put("/{control_id}", response_model=ControlResponse)
def update_control(
    control_id: int,
    control_data: ControlCreate,
    db: Session = Depends(get_db)
):
    control = db.query(Control).filter(
        Control.id == control_id
    ).first()

    if control is None:
        raise HTTPException(
            status_code=404,
            detail="Control not found"
        )

    control.framework_version_id = control_data.framework_version_id
    control.control_code = control_data.control_code
    control.title = control_data.title
    control.description = control_data.description

    db.commit()
    db.refresh(control)

    return control


@router.delete("/{control_id}")
def delete_control(
    control_id: int,
    db: Session = Depends(get_db)
):
    control = db.query(Control).filter(
        Control.id == control_id
    ).first()

    if control is None:
        raise HTTPException(
            status_code=404,
            detail="Control not found"
        )

    db.delete(control)
    db.commit()

    return {
        "message": "Control deleted successfully"
    }