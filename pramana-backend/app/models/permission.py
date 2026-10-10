from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    # Relationships
    role_permissions = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")
    roles = relationship("Role", secondary="role_permissions", back_populates="permissions", viewonly=True)