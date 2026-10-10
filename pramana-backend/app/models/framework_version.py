from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class FrameworkVersion(Base):
    __tablename__ = "framework_versions"

    id = Column(Integer, primary_key=True, index=True)

    framework_id = Column(
        Integer,
        ForeignKey("frameworks.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    version = Column(String, nullable=False, default="1.0")

    description = Column(Text, nullable=True)

    authority = Column(String(255), nullable=True)

    effective_date = Column(String(50), nullable=True)

    status = Column(String(50), default="active", nullable=False)

    source_url = Column(String(500), nullable=True)

    total_controls = Column(Integer, default=0, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=True
    )

    __table_args__ = (
        UniqueConstraint("framework_id", "version", name="uq_framework_versions_framework_id_version"),
    )

    # Relationships
    framework = relationship("Framework", back_populates="versions")
    controls = relationship("Control", back_populates="framework_version", cascade="all, delete-orphan")
    organization_frameworks = relationship("OrganizationFramework", back_populates="framework_version")