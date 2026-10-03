from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func

from app.database import Base


class AIRun(Base):
    __tablename__ = "ai_runs"

    id = Column(Integer, primary_key=True, index=True)

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id"),
        nullable=False,
        index=True
    )

    evidence_id = Column(
        Integer,
        ForeignKey("evidence.id"),
        nullable=True,
        index=True
    )

    triggered_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    run_type = Column(String, nullable=False)

    status = Column(
        String,
        nullable=False,
        default="pending"
    )

    model_name = Column(String, nullable=True)

    error_message = Column(Text, nullable=True)

    started_at = Column(DateTime(timezone=True), nullable=True)

    completed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )