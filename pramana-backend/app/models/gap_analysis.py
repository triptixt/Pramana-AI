from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func

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
        ForeignKey("controls.id"),
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