from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id"),
        nullable=False,
        index=True
    )

    uploaded_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    file_name = Column(String, nullable=False)

    file_path = Column(String, nullable=False)

    file_type = Column(String, nullable=True)

    description = Column(Text, nullable=True)

    status = Column(String, default="uploaded", nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    organization = relationship("Organization", back_populates="evidence")
    uploader = relationship("User", back_populates="evidence_uploaded")
    versions = relationship("EvidenceVersion", back_populates="evidence", cascade="all, delete-orphan")
    control_mappings = relationship("EvidenceControlMapping", back_populates="evidence", cascade="all, delete-orphan")
    ai_runs = relationship("AIRun", back_populates="evidence")