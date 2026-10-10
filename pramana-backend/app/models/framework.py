from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Framework(Base):
    __tablename__ = "frameworks"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    version = Column(
        String,
        nullable=True,
        default="1.0"
    )

    code = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    category = Column(
        String(100),
        nullable=True,
        default="Information Security & Cyber"
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    file_path = Column(
        String,
        nullable=True
    )

    file_name = Column(
        String,
        nullable=True
    )

    status = Column(
        String,
        nullable=False,
        default="pending"
    )

    error_message = Column(
        Text,
        nullable=True
    )

    total_controls = Column(
        Integer,
        default=0,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=True
    )

    # Relationships
    versions = relationship("FrameworkVersion", back_populates="framework", cascade="all, delete-orphan")
    organization_frameworks = relationship("OrganizationFramework", back_populates="framework", cascade="all, delete-orphan")
    audits = relationship("Audit", back_populates="framework")