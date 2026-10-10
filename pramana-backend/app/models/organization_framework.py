from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class OrganizationFramework(Base):
    __tablename__ = "organization_frameworks"

    id = Column(Integer, primary_key=True, index=True)

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    framework_id = Column(
        Integer,
        ForeignKey("frameworks.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    framework_version_id = Column(
        Integer,
        ForeignKey("framework_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    status = Column(
        String,
        nullable=False,
        default="active"
    )

    selected_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint("organization_id", "framework_id", name="uq_org_framework_org_framework"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="organization_frameworks")
    framework = relationship("Framework", back_populates="organization_frameworks")
    framework_version = relationship("FrameworkVersion", back_populates="organization_frameworks")