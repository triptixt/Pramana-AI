from typing import List, Optional, Union
from pydantic import BaseModel, Field
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings
from app.ai.extraction import ExtractedSegment


class ChunkItem(BaseModel):
    chunk_index: int = Field(description="Zero-indexed sequence number of chunk in document")
    content: str = Field(description="Textual content of the chunk")
    page_number: Optional[int] = Field(default=None, description="Source page number where available")
    section_name: Optional[str] = Field(default=None, description="Source section or header where available")


def chunk_extracted_segments(
    segments: List[ExtractedSegment],
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None
) -> List[ChunkItem]:
    """
    Performs structure-aware chunking across extracted document segments.
    Preserves page numbers and section context per chunk.
    """
    if not segments:
        return []

    effective_size = chunk_size or settings.default_chunk_size
    effective_overlap = chunk_overlap or settings.default_chunk_overlap

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=effective_size,
        chunk_overlap=effective_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", "; ", ", ", " ", ""],
        is_separator_regex=False
    )

    chunks: List[ChunkItem] = []
    chunk_idx = 0

    for seg in segments:
        text = seg.text.strip()
        if not text:
            continue

        raw_splits = splitter.split_text(text)
        for split in raw_splits:
            clean_split = split.strip()
            if not clean_split:
                continue

            chunks.append(
                ChunkItem(
                    chunk_index=chunk_idx,
                    content=clean_split,
                    page_number=seg.page_number,
                    section_name=seg.section_name
                )
            )
            chunk_idx += 1

    return chunks


def chunk_text(
    text: str,
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None
) -> List[str]:
    """
    Splits flat text into chunks using recursive character splitting.
    Maintains backward compatibility with simple string-based consumers.
    """
    if not text or not text.strip():
        return []

    effective_size = chunk_size or settings.default_chunk_size
    effective_overlap = chunk_overlap or settings.default_chunk_overlap

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=effective_size,
        chunk_overlap=effective_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", "; ", ", ", " ", ""],
        is_separator_regex=False
    )

    return [c.strip() for c in splitter.split_text(text) if c.strip()]
