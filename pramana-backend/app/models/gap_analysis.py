from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class GapAnalysis(Base):
    __tablename__ = "gap_analysis"

    id = Column(Integer, primary_key=True, index=True)

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id"),
        nullable=False,
        index=True
    )

    control_id = Column(
        Integer,
        ForeignKey("controls.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    status = Column(
        String,
        nullable=False,
        default="open"
    )

    severity = Column(
        String,
        nullable=False,
        default="medium"
    )

    findings = Column(Text, nullable=True)

    recommendation = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint("organization_id", "control_id", name="uq_gap_analysis_org_control"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="gap_analyses")
    control = relationship("Control", back_populates="gap_analyses")