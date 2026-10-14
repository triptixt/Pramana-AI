import hashlib
import logging
import os
from typing import Dict, Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.evidence import Evidence
from app.models.evidence_chunk import EvidenceChunk
from app.models.evidence_version import EvidenceVersion
from app.models.audit_log import AuditLog
from app.ai.extraction import (
    extract_document,
    ExtractionError,
    UnsupportedFormatError,
    EmptyExtractionError,
    FileCorruptedError,
    FileSizeLimitExceededError
)
from app.ai.chunking import chunk_extracted_segments
from app.ai.embeddings import (
    generate_embeddings,
    EmbeddingServiceUnavailableError,
    EmbeddingDimensionMismatchError,
    EmbeddingError
)

logger = logging.getLogger("pramana.services.evidence_processor")


def calculate_file_hash(file_path: str) -> str:
    """Calculates SHA-256 checksum of a file."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def process_evidence_document(
    db: Session,
    evidence_id: int,
    organization_id: int,
    user_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Processes an uploaded evidence document through the end-to-end AI pipeline:
    1. Validates evidence ownership within organization.
    2. Extracts structured text and page locations from supported file types.
    3. Divides text into meaningful chunks with page and section provenance.
    4. Generates 768-dim embeddings via Ollama nomic-embed-text.
    5. Persists chunks and embeddings in PostgreSQL pgvector.
    6. Ensures idempotent re-processing without duplicate chunks.
    """
    evidence = db.query(Evidence).filter(
        Evidence.id == evidence_id,
        Evidence.organization_id == organization_id
    ).first()

    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence document not found in your organization.")

    if not os.path.exists(evidence.file_path):
        evidence.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=400,
            detail=f"Evidence physical file is missing from storage: '{evidence.file_name}'."
        )

    # Compute current file hash
    current_hash = calculate_file_hash(evidence.file_path)
    acting_user_id = user_id or evidence.uploaded_by

    # Check existing version
    existing_version = (
        db.query(EvidenceVersion)
        .filter(EvidenceVersion.evidence_id == evidence.id)
        .order_by(EvidenceVersion.version_number.desc())
        .first()
    )

    if existing_version:
        # Check if already processed with identical hash
        if evidence.status == "processed" and existing_version.file_hash == current_hash:
            chunk_count = db.query(EvidenceChunk).filter(
                EvidenceChunk.evidence_version_id == existing_version.id
            ).count()
            if chunk_count > 0:
                logger.info(f"Evidence {evidence.id} already processed with {chunk_count} valid chunks. Reusing.")
                return {
                    "message": "Evidence document already processed and indexed.",
                    "evidence_id": evidence.id,
                    "version": existing_version.version_number,
                    "chunks": chunk_count,
                    "reused": True
                }

        # If re-processing or content updated, clear existing chunks for this version
        db.query(EvidenceChunk).filter(
            EvidenceChunk.evidence_version_id == existing_version.id
        ).delete()
        existing_version.file_hash = current_hash
        target_version = existing_version
    else:
        # Create initial EvidenceVersion (v1)
        target_version = EvidenceVersion(
            evidence_id=evidence.id,
            version_number=1,
            file_path=evidence.file_path,
            file_hash=current_hash,
            change_summary="Initial evidence document ingestion",
            created_by=acting_user_id
        )
        db.add(target_version)
        db.commit()
        db.refresh(target_version)

    evidence.status = "processing"
    db.commit()

    try:
        # 1. Extraction with page metadata
        segments = extract_document(evidence.file_path, evidence.file_type)
        total_chars = sum(len(s.text) for s in segments)
        logger.info(
            f"[Evidence #{evidence.id}] Extracted {len(segments)} segments ({total_chars} chars) "
            f"from '{evidence.file_name}' ({evidence.file_type})."
        )

        # 2. Structure-aware chunking
        chunk_items = chunk_extracted_segments(segments)
        if not chunk_items:
            raise EmptyExtractionError("No valid text chunks could be generated from the document.")
        logger.info(
            f"[Evidence #{evidence.id}] Generated {len(chunk_items)} chunks for version #{target_version.id}."
        )

        # 3. Embeddings Generation & Dimension Validation
        chunk_texts = [item.content for item in chunk_items]
        embeddings = generate_embeddings(chunk_texts)
        if embeddings:
            logger.info(
                f"[Evidence #{evidence.id}] Generated {len(embeddings)} embeddings with dimension {len(embeddings[0])}."
            )

        # 4. Storage in PostgreSQL / pgvector
        for chunk_item, emb in zip(chunk_items, embeddings):
            db_chunk = EvidenceChunk(
                evidence_version_id=target_version.id,
                chunk_index=chunk_item.chunk_index,
                content=chunk_item.content,
                page_number=chunk_item.page_number,
                embedding=emb
            )
            db.add(db_chunk)

        evidence.status = "processed"
        db.commit()
        logger.info(
            f"[Evidence #{evidence.id}] Persisted {len(chunk_items)} chunks and updated status to 'processed'."
        )

        # Audit Log
        try:
            audit = AuditLog(
                organization_id=organization_id,
                user_id=acting_user_id,
                action="Evidence Document Processed",
                entity_type="Evidence",
                entity_id=evidence.id,
                details=f"Extracted, chunked ({len(chunk_items)} chunks), and vector-indexed evidence '{evidence.file_name}'."
            )
            db.add(audit)
            db.commit()
        except Exception:
            db.rollback()

        return {
            "message": "Document successfully extracted, chunked, and vector-indexed.",
            "evidence_id": evidence.id,
            "version": target_version.version_number,
            "chunks": len(chunk_items),
            "status": "processed"
        }

    except (UnsupportedFormatError, EmptyExtractionError, FileSizeLimitExceededError) as client_err:
        db.rollback()
        evidence.status = "failed"
        db.commit()
        logger.warning(f"Validation failure processing evidence {evidence.id}: {client_err}")
        raise HTTPException(status_code=400, detail=str(client_err))

    except (EmbeddingServiceUnavailableError, EmbeddingDimensionMismatchError) as ai_err:
        db.rollback()
        evidence.status = "failed"
        db.commit()
        logger.error(f"AI embedding failure processing evidence {evidence.id}: {ai_err}")
        raise HTTPException(status_code=503, detail=str(ai_err))

    except Exception as general_err:
        db.rollback()
        evidence.status = "failed"
        db.commit()
        logger.error(f"Unexpected error processing evidence {evidence.id}: {general_err}")
        raise HTTPException(status_code=500, detail=f"Evidence processing failed: {str(general_err)}")
