from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True, index=True)

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id"),
        nullable=False,
        index=True
    )

    framework_id = Column(
        Integer,
        ForeignKey("frameworks.id"),
        nullable=False,
        index=True
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    name = Column(String, nullable=False)

    description = Column(Text, nullable=True)

    status = Column(
        String,
        nullable=False,
        default="draft"
    )

    start_date = Column(DateTime(timezone=True), nullable=True)

    end_date = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    organization = relationship("Organization", back_populates="audits")
    framework = relationship("Framework", back_populates="audits")
    creator = relationship("User", back_populates="audits_created")
    reviews = relationship("AuditReview", back_populates="audit", cascade="all, delete-orphan")
    decisions = relationship("AuditDecision", back_populates="audit", cascade="all, delete-orphan")