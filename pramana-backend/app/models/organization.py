from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

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

    # Relationships
    users = relationship("User", back_populates="organization")
    roles = relationship("Role", back_populates="organization")
    organization_frameworks = relationship("OrganizationFramework", back_populates="organization", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="organization")
    evidence_requests = relationship("EvidenceRequest", back_populates="organization")
    gap_analyses = relationship("GapAnalysis", back_populates="organization")
    audits = relationship("Audit", back_populates="organization")
    audit_logs = relationship("AuditLog", back_populates="organization")
    ai_runs = relationship("AIRun", back_populates="organization")