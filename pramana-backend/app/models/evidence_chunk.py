from sqlalchemy import Column, Integer, Text, ForeignKey, UniqueConstraint
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import relationship

from app.database import Base


class EvidenceChunk(Base):
    __tablename__ = "evidence_chunks"

    id = Column(Integer, primary_key=True, index=True)

    evidence_version_id = Column(
        Integer,
        ForeignKey("evidence_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    chunk_index = Column(Integer, nullable=False)

    content = Column(Text, nullable=False)

    page_number = Column(Integer, nullable=True)

    embedding = Column(Vector(768), nullable=True)

    __table_args__ = (
        UniqueConstraint("evidence_version_id", "chunk_index", name="uq_evidence_chunks_version_index"),
    )

    # Relationships
    evidence_version = relationship("EvidenceVersion", back_populates="chunks")