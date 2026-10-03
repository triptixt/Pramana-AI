from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func

from app.database import Base


class OrganizationFramework(Base):
    __tablename__ = "organization_frameworks"

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