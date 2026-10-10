from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float, DateTime, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.database import Base


class EvidenceControlMapping(Base):
    __tablename__ = "evidence_control_mappings"

    id = Column(Integer, primary_key=True, index=True)

    evidence_id = Column(
        Integer,
        ForeignKey("evidence.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    control_id = Column(
        Integer,
        ForeignKey("controls.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    mapping_type = Column(String, nullable=False, default="manual") # manual, ai_suggested

    confidence_score = Column(Float, nullable=True)

    mapping_status = Column(String, nullable=False, default="pending") # pending, approved, rejected

    notes = Column(Text, nullable=True)

    ai_explanation = Column(Text, nullable=True)

    requirement_supported = Column(Text, nullable=True)

    unsupported_requirements = Column(Text, nullable=True)

    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)

    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    __table_args__ = (
        UniqueConstraint("evidence_id", "control_id", name="uq_evidence_control_mappings_pair"),
    )

    # Relationships
    evidence = relationship("Evidence", back_populates="control_mappings")
    control = relationship("Control", back_populates="evidence_mappings")
    reviewer = relationship("User", foreign_keys=[reviewed_by])