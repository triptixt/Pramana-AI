from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.evidence_control_mapping import EvidenceControlMapping
from app.schemas.control_mapping import (
    EvidenceControlMappingCreate,
    EvidenceControlMappingResponse
)



router = APIRouter(
    prefix="/evidence-control-mappings",
    tags=["Evidence Control Mappings"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=EvidenceControlMappingResponse)
def create_mapping(
    mapping_data: EvidenceControlMappingCreate,
    db: Session = Depends(get_db)
):
    new_mapping = EvidenceControlMapping(
        evidence_id=mapping_data.evidence_id,
        control_id=mapping_data.control_id,
        mapping_type=mapping_data.mapping_type,
        confidence_score=mapping_data.confidence_score,
        mapping_status=mapping_data.mapping_status,
        notes=mapping_data.notes
    )

    db.add(new_mapping)
    db.commit()
    db.refresh(new_mapping)

    return new_mapping


@router.get("/", response_model=list[EvidenceControlMappingResponse])
def get_mappings(db: Session = Depends(get_db)):
    return db.query(EvidenceControlMapping).all()


@router.get("/{mapping_id}", response_model=EvidenceControlMappingResponse)
def get_mapping(mapping_id: int, db: Session = Depends(get_db)):
    mapping = db.query(EvidenceControlMapping).filter(
        EvidenceControlMapping.id == mapping_id
    ).first()

    if mapping is None:
        raise HTTPException(
            status_code=404,
            detail="Mapping not found"
        )

    return mapping


@router.put("/{mapping_id}", response_model=EvidenceControlMappingResponse)
def update_mapping(
    mapping_id: int,
    mapping_data: EvidenceControlMappingCreate,
    db: Session = Depends(get_db)
):
    mapping = db.query(EvidenceControlMapping).filter(
        EvidenceControlMapping.id == mapping_id
    ).first()

    if mapping is None:
        raise HTTPException(
            status_code=404,
            detail="Mapping not found"
        )

    mapping.evidence_id = mapping_data.evidence_id
    mapping.control_id = mapping_data.control_id
    mapping.mapping_type = mapping_data.mapping_type
    mapping.confidence_score = mapping_data.confidence_score
    mapping.mapping_status = mapping_data.mapping_status
    mapping.notes = mapping_data.notes

    db.commit()
    db.refresh(mapping)

    return mapping


@router.delete("/{mapping_id}")
def delete_mapping(mapping_id: int, db: Session = Depends(get_db)):
    mapping = db.query(EvidenceControlMapping).filter(
        EvidenceControlMapping.id == mapping_id
    ).first()

    if mapping is None:
        raise HTTPException(
            status_code=404,
            detail="Mapping not found"
        )

    db.delete(mapping)
    db.commit()

    return {"message": "Mapping deleted successfully"}