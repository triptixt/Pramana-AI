from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float, DateTime, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.database import Base


class ControlRelationship(Base):
    __tablename__ = "control_relationships"

    id = Column(Integer, primary_key=True, index=True)

    source_control_id = Column(
        Integer,
        ForeignKey("controls.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    target_control_id = Column(
        Integer,
        ForeignKey("controls.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    relationship_type = Column(String, nullable=False) # equivalent, partially_overlaps, complementary, related_to, depends_on, supports, maps_to

    source_reference = Column(String(255), nullable=True)

    mapping_confidence = Column(Float, nullable=True)

    status = Column(String(50), default="proposed", nullable=False) # proposed, approved, rejected, edited

    mapping_source = Column(String(50), default="ai_generated", nullable=True) # ai_generated, manual, imported

    ai_explanation = Column(Text, nullable=True)

    overlap_summary = Column(Text, nullable=True)

    differences_summary = Column(Text, nullable=True)

    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)

    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    __table_args__ = (
        UniqueConstraint("source_control_id", "target_control_id", "relationship_type", name="uq_control_relationships_pair"),
    )

    # Relationships
    source_control = relationship("Control", foreign_keys=[source_control_id], back_populates="outgoing_relationships")
    target_control = relationship("Control", foreign_keys=[target_control_id], back_populates="incoming_relationships")
    reviewer = relationship("User", foreign_keys=[reviewed_by])