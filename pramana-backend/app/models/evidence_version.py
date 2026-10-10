from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class EvidenceVersion(Base):
    __tablename__ = "evidence_versions"

    id = Column(Integer, primary_key=True, index=True)

    evidence_id = Column(
        Integer,
        ForeignKey("evidence.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    version_number = Column(Integer, nullable=False)

    file_path = Column(String, nullable=False)

    file_hash = Column(String, nullable=True)

    change_summary = Column(Text, nullable=True)

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint("evidence_id", "version_number", name="uq_evidence_versions_evidence_version"),
    )

    # Relationships
    evidence = relationship("Evidence", back_populates="versions")
    creator = relationship("User", back_populates="evidence_versions_created")
    chunks = relationship("EvidenceChunk", back_populates="evidence_version", cascade="all, delete-orphan")