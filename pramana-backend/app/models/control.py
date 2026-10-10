from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, UniqueConstraint
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import relationship

from app.database import Base


class Control(Base):
    __tablename__ = "controls"

    id = Column(Integer, primary_key=True, index=True)

    framework_version_id = Column(
        Integer,
        ForeignKey("framework_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    control_code = Column(
        String,
        nullable=False,
        index=True
    )

    title = Column(
        String,
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )
    
    requirement = Column(
        Text,
        nullable=True
    )
    
    category = Column(
        String,
        nullable=True
    )
    
    guidance = Column(
        Text,
        nullable=True
    )

    source_reference = Column(
        String(255),
        nullable=True
    )
    
    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    embedding = Column(
        Vector(768),
        nullable=True
    )

    __table_args__ = (
        UniqueConstraint("framework_version_id", "control_code", name="uq_controls_framework_version_code"),
    )

    # Relationships
    framework_version = relationship("FrameworkVersion", back_populates="controls")
    evidence_mappings = relationship("EvidenceControlMapping", back_populates="control", cascade="all, delete-orphan")
    gap_analyses = relationship("GapAnalysis", back_populates="control", cascade="all, delete-orphan")
    evidence_requests = relationship("EvidenceRequest", back_populates="control")
    outgoing_relationships = relationship(
        "ControlRelationship",
        foreign_keys="ControlRelationship.source_control_id",
        back_populates="source_control",
        cascade="all, delete-orphan"
    )
    incoming_relationships = relationship(
        "ControlRelationship",
        foreign_keys="ControlRelationship.target_control_id",
        back_populates="target_control",
        cascade="all, delete-orphan"
    )