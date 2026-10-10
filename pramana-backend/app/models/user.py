from typing import Optional
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id"),
        nullable=False,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    email = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    password_hash = Column(
        String,
        nullable=True
    )

    role = Column(
        String,
        nullable=True,
        index=True
    )

    # Direct relationships
    organization = relationship("Organization", back_populates="users")
    user_roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    roles = relationship("Role", secondary="user_roles", back_populates="users", viewonly=True)
    evidence_uploaded = relationship("Evidence", back_populates="uploader")
    evidence_versions_created = relationship("EvidenceVersion", back_populates="creator")
    evidence_requests_created = relationship("EvidenceRequest", foreign_keys="EvidenceRequest.requested_by", back_populates="requester")
    evidence_requests_assigned = relationship("EvidenceRequest", foreign_keys="EvidenceRequest.assigned_to", back_populates="assignee")
    audits_created = relationship("Audit", back_populates="creator")
    audit_reviews = relationship("AuditReview", back_populates="reviewer")
    audit_decisions = relationship("AuditDecision", back_populates="decider")
    audit_logs = relationship("AuditLog", back_populates="user")
    ai_runs = relationship("AIRun", back_populates="user")

    @property
    def organization_name(self) -> str:
        return self.organization.name if self.organization else f"Org {self.organization_id}"