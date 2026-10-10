from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class AuditReview(Base):
    __tablename__ = "audit_reviews"

    id = Column(Integer, primary_key=True, index=True)

    audit_id = Column(
        Integer,
        ForeignKey("audits.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    reviewer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    status = Column(
        String,
        nullable=False,
        default="pending"
    )

    comments = Column(Text, nullable=True)

    reviewed_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    audit = relationship("Audit", back_populates="reviews")
    reviewer = relationship("User", back_populates="audit_reviews")