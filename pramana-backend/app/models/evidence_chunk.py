from sqlalchemy import Column, Integer, Text, ForeignKey

from app.database import Base


class EvidenceChunk(Base):
    __tablename__ = "evidence_chunks"

    id = Column(Integer, primary_key=True, index=True)

    evidence_version_id = Column(
        Integer,
        ForeignKey("evidence_versions.id"),
        nullable=False,
        index=True
    )

    chunk_index = Column(Integer, nullable=False)

    content = Column(Text, nullable=False)

    page_number = Column(Integer, nullable=True)