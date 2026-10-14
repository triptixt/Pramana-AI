from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class AIOutput(Base):
    __tablename__ = "ai_outputs"

    id = Column(Integer, primary_key=True, index=True)

    ai_run_id = Column(
        Integer,
        ForeignKey("ai_runs.id", ondelete="CASCADE"),
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

    control_id = Column(
        Integer,
        ForeignKey("controls.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Relationships
    ai_run = relationship("AIRun", back_populates="outputs")
    control = relationship("Control")