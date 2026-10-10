from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class EvidenceRequest(Base):
    __tablename__ = "evidence_requests"

    id = Column(Integer, primary_key=True, index=True)

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id"),
        nullable=False,
        index=True
    )

    requested_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    assigned_to = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    control_id = Column(
        Integer,
        ForeignKey("controls.id"),
        nullable=True,
        index=True
    )

    title = Column(String, nullable=False)

    description = Column(Text, nullable=True)

    status = Column(
        String,
        nullable=False,
        default="pending"
    )

    due_date = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    organization = relationship("Organization", back_populates="evidence_requests")
    requester = relationship("User", foreign_keys=[requested_by], back_populates="evidence_requests_created")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="evidence_requests_assigned")
    control = relationship("Control", back_populates="evidence_requests")