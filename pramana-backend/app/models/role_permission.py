from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id = Column(
        Integer,
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True
    )

    permission_id = Column(
        Integer,
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True
    )

    # Relationships
    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions")