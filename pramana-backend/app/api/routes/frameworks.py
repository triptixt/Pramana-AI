import os
import shutil
import uuid
from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.framework import Framework
from app.models.framework_version import FrameworkVersion
from app.models.control import Control
from app.models.organization_framework import OrganizationFramework
from app.models.user import User
from app.core.dependencies import get_current_user
from app.services.rbac_service import get_user_effective_permissions
from app.services.framework_processor import process_framework_document
from app.schemas.framework import (
    FrameworkCreate,
    FrameworkResponse
)
from app.schemas.control import ControlResponse

router = APIRouter(
    prefix="/frameworks",
    tags=["Frameworks"]
)

UPLOAD_DIR = Path("uploads/frameworks")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/", response_model=List[FrameworkResponse])
def get_frameworks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch all compliance frameworks from PostgreSQL."""
    return db.query(Framework).order_by(Framework.id.asc()).all()


@router.get("/{framework_id}", response_model=FrameworkResponse)
def get_framework(
    framework_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch a single compliance framework by ID."""
    framework = db.query(Framework).filter(Framework.id == framework_id).first()
    if not framework:
        raise HTTPException(
            status_code=404,
            detail="Framework not found"
        )
    return framework


@router.get("/{framework_id}/controls", response_model=List[ControlResponse])
def get_framework_controls(
    framework_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch all actual extracted controls for the specified framework."""
    framework = db.query(Framework).filter(Framework.id == framework_id).first()
    if not framework:
        raise HTTPException(status_code=404, detail="Framework not found")

    version = db.query(FrameworkVersion).filter(
        FrameworkVersion.framework_id == framework_id
    ).order_by(FrameworkVersion.id.desc()).first()

    if not version:
        return []

    controls = db.query(Control).filter(
        Control.framework_version_id == version.id
    ).order_by(Control.id.asc()).all()

    return controls


@router.post("/upload")
def upload_and_ingest_framework(
    file: UploadFile = File(...),
    name: str = Form(...),
    code: str = Form(...),
    version: str = Form("1.0"),
    description: Optional[str] = Form(None),
    authority: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Super Admin endpoint to upload a REAL framework document (PDF, DOCX, JSON, CSV, TXT),
    extract real controls, generate vector embeddings, and store them in PostgreSQL / pgvector.
    """
    perms = get_user_effective_permissions(current_user, db)
    if "manage_frameworks" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: Super Admin 'manage_frameworks' required to upload frameworks."
        )

    if not file.filename:
        raise HTTPException(status_code=400, detail="File must have a valid filename.")

    # Validate file format
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    allowed_exts = ["pdf", "docx", "doc", "txt", "json", "csv"]
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '.{ext}'. Supported formats: {', '.join(allowed_exts)}"
        )

    # Normalize code
    clean_code = code.strip().upper().replace(" ", "_")

    # Check or create Framework
    framework = db.query(Framework).filter(Framework.code == clean_code).first()
    if not framework:
        framework = Framework(
            name=name.strip(),
            code=clean_code,
            version=version.strip() or "1.0",
            description=description.strip() if description else f"{name} compliance standard.",
            category=category.strip() if category else "Information Security & Cyber",
            is_active=True,
            status="pending"
        )
        db.add(framework)
        db.commit()
        db.refresh(framework)
    else:
        framework.name = name.strip()
        framework.version = version.strip() or framework.version
        if description:
            framework.description = description.strip()
        if category:
            framework.category = category.strip()

    # Save file safely to disk
    safe_filename = f"{clean_code}_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = UPLOAD_DIR / safe_filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write framework file to disk: {str(e)}")

    framework.file_path = str(file_path)
    framework.file_name = file.filename
    framework.status = "processing"
    db.commit()
    db.refresh(framework)

    # Check or create FrameworkVersion
    framework_version = db.query(FrameworkVersion).filter(
        FrameworkVersion.framework_id == framework.id,
        FrameworkVersion.version == (version.strip() or "1.0")
    ).first()

    if not framework_version:
        framework_version = FrameworkVersion(
            framework_id=framework.id,
            version=version.strip() or "1.0",
            description=description or f"{name} Standard",
            authority=authority or "Official Standards Authority",
            status="active"
        )
        db.add(framework_version)
        db.commit()
        db.refresh(framework_version)

    # Execute full real framework ingestion pipeline
    result = process_framework_document(
        db=db,
        framework_id=framework.id,
        framework_version_id=framework_version.id
    )

    return result


@router.post("/{framework_id}/reprocess")
def reprocess_framework(
    framework_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reprocesses an existing uploaded framework document."""
    perms = get_user_effective_permissions(current_user, db)
    if "manage_frameworks" not in perms:
        raise HTTPException(status_code=403, detail="Permission denied: 'manage_frameworks' required.")

    framework = db.query(Framework).filter(Framework.id == framework_id).first()
    if not framework:
        raise HTTPException(status_code=404, detail="Framework not found")

    version = db.query(FrameworkVersion).filter(
        FrameworkVersion.framework_id == framework_id
    ).order_by(FrameworkVersion.id.desc()).first()

    if not version:
        raise HTTPException(status_code=400, detail="Framework version record not found.")

    return process_framework_document(db, framework.id, version.id)


@router.post("/", response_model=FrameworkResponse)
def create_framework(
    framework_data: FrameworkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_frameworks" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_frameworks' required"
        )

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
        version=framework_data.version or "1.0",
        description=framework_data.description,
        category=framework_data.category or "Information Security & Cyber"
    )

    db.add(new_framework)
    db.commit()
    db.refresh(new_framework)

    # Create matching FrameworkVersion
    fw_ver = FrameworkVersion(
        framework_id=new_framework.id,
        version=new_framework.version or "1.0",
        description=new_framework.description or f"{new_framework.name} Standard",
        authority="Standards Authority",
        status="active"
    )
    db.add(fw_ver)
    db.commit()

    return new_framework


@router.delete("/{framework_id}")
def delete_framework(
    framework_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_frameworks" not in perms:
        raise HTTPException(status_code=403, detail="Permission denied: 'manage_frameworks' required")

    framework = db.query(Framework).filter(Framework.id == framework_id).first()
    if not framework:
        raise HTTPException(status_code=404, detail="Framework not found")

    # Delete physical file
    if framework.file_path and os.path.exists(framework.file_path):
        try:
            os.remove(framework.file_path)
        except Exception:
            pass

    # Delete associated controls & versions
    versions = db.query(FrameworkVersion).filter(FrameworkVersion.framework_id == framework_id).all()
    for v in versions:
        db.query(Control).filter(Control.framework_version_id == v.id).delete()
        db.delete(v)

    db.query(OrganizationFramework).filter(OrganizationFramework.framework_id == framework_id).delete()
    db.delete(framework)
    db.commit()

    return {"message": f"Framework {framework_id} deleted successfully."}


@router.post("/{framework_id}/toggle-status", response_model=FrameworkResponse)
def toggle_framework_status(
    framework_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Toggle global availability of a framework between Active (Enroll) and Inactive (Off-role).
    Strictly restricted to Super Admin.
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Permission denied: Super Admin role required to toggle global framework status."
        )

    framework = db.query(Framework).filter(Framework.id == framework_id).first()
    if not framework:
        raise HTTPException(status_code=404, detail="Framework not found")

    framework.is_active = not framework.is_active
    db.commit()
    db.refresh(framework)

    return framework
