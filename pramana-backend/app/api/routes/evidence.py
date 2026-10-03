
import shutil
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
)
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user

from app.models.evidence import Evidence
from app.models.evidence_control_mapping import EvidenceControlMapping
from app.models.control import Control
from app.models.audit_log import AuditLog
from app.models.user import User

from app.schemas.evidence import (
    EvidenceCreate,
    EvidenceResponse,
)


router = APIRouter(
    prefix="/evidence",
    tags=["Evidence"],
)


# ---------------------------------------------------------
# Upload directory
# ---------------------------------------------------------

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# =========================================================
# CREATE EVIDENCE
# =========================================================

@router.post("/", response_model=EvidenceResponse)
def create_evidence(
    evidence_data: EvidenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create evidence for the currently logged-in user's organization.

    organization_id and uploaded_by are NOT trusted from frontend data.
    They are always taken from the authenticated user.
    """

    new_evidence = Evidence(
        organization_id=current_user.organization_id,
        uploaded_by=current_user.id,
        file_name=evidence_data.file_name,
        file_path=evidence_data.file_path,
        file_type=evidence_data.file_type,
        description=evidence_data.description,
        status=evidence_data.status,
    )

    db.add(new_evidence)
    db.commit()
    db.refresh(new_evidence)

    # -----------------------------------------------------
    # Audit Log
    # -----------------------------------------------------

    log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="Evidence Created",
        entity_type="Evidence",
        entity_id=new_evidence.id,
        details=f"Evidence file {new_evidence.file_name} created",
    )

    db.add(log)
    db.commit()

    return new_evidence


# =========================================================
# UPLOAD EVIDENCE FILE
# =========================================================

@router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    description: str = Form(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload evidence for the currently authenticated user.

    uploaded_by and organization_id are automatically taken
    from the authenticated JWT user.
    """

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="File name is required",
        )

    # -----------------------------------------------------
    # Save file
    # -----------------------------------------------------

    file_path = UPLOAD_DIR / file.filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(error)}",
        )

    # -----------------------------------------------------
    # Determine file type
    # -----------------------------------------------------

    ext = (
        file.filename.split(".")[-1].lower()
        if "." in file.filename
        else "unknown"
    )

    # -----------------------------------------------------
    # Create Evidence
    # -----------------------------------------------------

    new_evidence = Evidence(
        organization_id=current_user.organization_id,
        uploaded_by=current_user.id,
        file_name=file.filename,
        file_path=str(file_path),
        file_type=ext,
        description=(
            description
            or f"Uploaded compliance evidence: {file.filename}"
        ),
        status="needs_review",
    )

    db.add(new_evidence)
    db.commit()
    db.refresh(new_evidence)

    # -----------------------------------------------------
    # Control lookup
    # -----------------------------------------------------
    #
    # IMPORTANT:
    # Control does NOT have organization_id.
    #
    # Therefore we must NOT do:
    #
    # Control.organization_id == current_user.organization_id
    #
    # For now, get an available control.
    #
    # Organization-specific framework/control selection
    # should later be implemented through the existing
    # organization_frameworks/framework_versions relationship.
    # -----------------------------------------------------

    control = db.query(Control).first()

    mapping_created = None
    ai_confidence = None

    if control:
        # Temporary mapping value.
        # This will be replaced by actual document analysis.
        ai_confidence = 0.94

        mapping = EvidenceControlMapping(
            evidence_id=new_evidence.id,
            control_id=control.id,
            mapping_type="ai_suggested",
            confidence_score=ai_confidence,
            mapping_status="pending",
            notes=(
                f"Candidate mapping generated for file "
                f"{file.filename} against control "
                f"{control.control_code}."
            ),
        )

        db.add(mapping)
        db.commit()
        db.refresh(mapping)

        mapping_created = mapping.id

    # -----------------------------------------------------
    # Audit Log
    # -----------------------------------------------------

    log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="Evidence Uploaded",
        entity_type="Evidence",
        entity_id=new_evidence.id,
        details=(
            f"File {file.filename} uploaded by user "
            f"{current_user.id} for organization "
            f"{current_user.organization_id}."
        ),
    )

    db.add(log)
    db.commit()

    return {
        "id": new_evidence.id,
        "organization_id": new_evidence.organization_id,
        "uploaded_by": new_evidence.uploaded_by,
        "file_name": new_evidence.file_name,
        "file_path": new_evidence.file_path,
        "file_type": new_evidence.file_type,
        "description": new_evidence.description,
        "status": new_evidence.status,
        "mapping_id": mapping_created,
        "ai_confidence": ai_confidence,
        "message": "File uploaded successfully",
    }


# =========================================================
# GET ALL EVIDENCE
# =========================================================

@router.get("/", response_model=list[EvidenceResponse])
def get_evidence(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return only evidence belonging to the logged-in user's
    organization.
    """

    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.organization_id == current_user.organization_id
        )
        .order_by(Evidence.id.desc())
        .all()
    )

    return evidence


# =========================================================
# GET SINGLE EVIDENCE
# =========================================================

@router.get("/{evidence_id}", response_model=EvidenceResponse)
def get_single_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return evidence only if it belongs to the current user's
    organization.
    """

    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.id == evidence_id,
            Evidence.organization_id == current_user.organization_id,
        )
        .first()
    )

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found",
        )

    return evidence


# =========================================================
# UPDATE EVIDENCE
# =========================================================

@router.put("/{evidence_id}", response_model=EvidenceResponse)
def update_evidence(
    evidence_id: int,
    evidence_data: EvidenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update evidence only within the current user's organization.

    organization_id and uploaded_by cannot be changed through
    the frontend.
    """

    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.id == evidence_id,
            Evidence.organization_id == current_user.organization_id,
        )
        .first()
    )

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found",
        )

    evidence.file_name = evidence_data.file_name
    evidence.file_path = evidence_data.file_path
    evidence.file_type = evidence_data.file_type
    evidence.description = evidence_data.description
    evidence.status = evidence_data.status

    db.commit()
    db.refresh(evidence)

    # -----------------------------------------------------
    # Audit Log
    # -----------------------------------------------------

    log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="Evidence Updated",
        entity_type="Evidence",
        entity_id=evidence.id,
        details=f"Evidence file {evidence.file_name} updated",
    )

    db.add(log)
    db.commit()

    return evidence


# =========================================================
# DELETE EVIDENCE
# =========================================================

@router.delete("/{evidence_id}")
def delete_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete evidence only from the current user's organization.
    """

    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.id == evidence_id,
            Evidence.organization_id == current_user.organization_id,
        )
        .first()
    )

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found",
        )

    # -----------------------------------------------------
    # Delete physical file
    # -----------------------------------------------------

    file_path = Path(evidence.file_path)

    if file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass

    # -----------------------------------------------------
    # Audit Log
    # -----------------------------------------------------

    log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="Evidence Deleted",
        entity_type="Evidence",
        entity_id=evidence.id,
        details=f"Evidence file {evidence.file_name} deleted",
    )

    db.add(log)

    db.delete(evidence)
    db.commit()

    return {
        "message": "Evidence deleted successfully",
        "evidence_id": evidence_id,
    }

