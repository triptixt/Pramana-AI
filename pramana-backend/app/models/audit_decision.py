from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func

from app.database import Base


class AuditDecision(Base):
    __tablename__ = "audit_decisions"

    id = Column(Integer, primary_key=True, index=True)

    audit_id = Column(
        Integer,
        ForeignKey("audits.id"),
        nullable=False,
        index=True
    )

    decided_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    decision = Column(
        String,
        nullable=False
    )

    comments = Column(Text, nullable=True)

    decided_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )