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


from app.models.user import User
from app.core.dependencies import get_current_user
from app.services.rbac_service import get_user_effective_permissions


@router.post("/", response_model=ControlResponse)
def create_control(
    control_data: ControlCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_controls" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_controls' required"
        )

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


from app.models.framework import Framework
from app.models.framework_version import FrameworkVersion

@router.get("/", response_model=list[ControlResponse])
def get_controls(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rows = (
        db.query(Control, FrameworkVersion, Framework)
        .outerjoin(FrameworkVersion, Control.framework_version_id == FrameworkVersion.id)
        .outerjoin(Framework, FrameworkVersion.framework_id == Framework.id)
        .all()
    )

    results = []
    for ctrl, ver, fw in rows:
        results.append(
            ControlResponse(
                id=ctrl.id,
                framework_version_id=ctrl.framework_version_id,
                control_code=ctrl.control_code,
                title=ctrl.title,
                description=ctrl.description,
                requirement=ctrl.requirement,
                category=ctrl.category,
                guidance=ctrl.guidance,
                source_reference=ctrl.source_reference,
                is_active=ctrl.is_active,
                framework_code=fw.code if fw else None,
                framework_name=fw.name if fw else None
            )
        )
    return results


@router.get("/{control_id}", response_model=ControlResponse)
def get_control(
    control_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    row = (
        db.query(Control, FrameworkVersion, Framework)
        .outerjoin(FrameworkVersion, Control.framework_version_id == FrameworkVersion.id)
        .outerjoin(Framework, FrameworkVersion.framework_id == Framework.id)
        .filter(Control.id == control_id)
        .first()
    )

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Control not found"
        )

    ctrl, ver, fw = row
    return ControlResponse(
        id=ctrl.id,
        framework_version_id=ctrl.framework_version_id,
        control_code=ctrl.control_code,
        title=ctrl.title,
        description=ctrl.description,
        requirement=ctrl.requirement,
        category=ctrl.category,
        guidance=ctrl.guidance,
        source_reference=ctrl.source_reference,
        is_active=ctrl.is_active,
        framework_code=fw.code if fw else None,
        framework_name=fw.name if fw else None
    )



@router.put("/{control_id}", response_model=ControlResponse)
def update_control(
    control_id: int,
    control_data: ControlCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_controls" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_controls' required"
        )

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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_controls" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_controls' required"
        )

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