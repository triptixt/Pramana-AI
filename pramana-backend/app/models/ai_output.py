from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func

from app.database import Base
from app.database import get_db


class AIOutput(Base):
    __tablename__ = "ai_outputs"

    id = Column(Integer, primary_key=True, index=True)

    ai_run_id = Column(
        Integer,
        ForeignKey("ai_runs.id"),
        nullable=False,
        index=True
    )

    output_type = Column(
        String,
        nullable=False
    )

    content = Column(
        Text,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )