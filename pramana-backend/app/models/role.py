from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class Role(Base):
    __tablename__ = "roles"

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

    description = Column(
        String,
        nullable=True
    )

    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_roles_organization_name"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="roles")
    user_roles = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")
    users = relationship("User", secondary="user_roles", back_populates="roles", viewonly=True)
    role_permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    permissions = relationship("Permission", secondary="role_permissions", back_populates="roles", viewonly=True)