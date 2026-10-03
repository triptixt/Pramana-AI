from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float

from app.database import Base


class EvidenceControlMapping(Base):
    __tablename__ = "evidence_control_mappings"

    id = Column(Integer, primary_key=True, index=True)

    evidence_id = Column(
        Integer,
        ForeignKey("evidence.id"),
        nullable=False,
        index=True
    )

    control_id = Column(
        Integer,
        ForeignKey("controls.id"),
        nullable=False,
        index=True
    )

    mapping_type = Column(String, nullable=False, default="manual")

    confidence_score = Column(Float, nullable=True)

    mapping_status = Column(String, nullable=False, default="pending")

    notes = Column(Text, nullable=True)