from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )

    role_id = Column(
        Integer,
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True
    )

    # Relationships
    user = relationship("User", back_populates="user_roles")
    role = relationship("Role", back_populates="user_roles")