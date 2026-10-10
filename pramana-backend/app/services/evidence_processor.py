from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.evidence import Evidence
from app.models.evidence_chunk import EvidenceChunk
from app.models.evidence_version import EvidenceVersion
from app.ai.extraction import extract_text
from app.ai.chunking import chunk_text
from app.ai.embeddings import generate_embeddings

def process_evidence_document(db: Session, evidence_id: int, organization_id: int):
    """
    Processes an uploaded evidence document by extracting text, chunking, generating embeddings,
    and storing them in the pgvector database.
    """
    evidence = db.query(Evidence).filter(
        Evidence.id == evidence_id,
        Evidence.organization_id == organization_id
    ).first()

    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")

    if evidence.status == "processed":
        return {"message": "Evidence is already processed."}

    evidence.status = "processing"
    db.commit()
    db.refresh(evidence)

    try:
        # Create a new evidence version first
        version = EvidenceVersion(
            evidence_id=evidence.id,
            version_number=1, # simplified versioning
            file_path=evidence.file_path,
            file_size_bytes=0, # placeholder, should be actual file size
            file_hash="pending"
        )
        db.add(version)
        db.commit()
        db.refresh(version)

        # 1. Extraction
        text = extract_text(evidence.file_path, evidence.file_type)

        # 2. Chunking
        chunks = chunk_text(text)

        # 3. Embeddings
        embeddings = generate_embeddings(chunks)

        # 4. Storage
        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            evidence_chunk = EvidenceChunk(
                evidence_version_id=version.id,
                chunk_index=idx,
                content=chunk,
                page_number=None, # PDF extraction can be enhanced later to provide page numbers
                embedding=embedding
            )
            db.add(evidence_chunk)

        evidence.status = "processed"
        db.commit()

        return {"message": "Document processed successfully", "chunks": len(chunks)}
    except Exception as e:
        evidence.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")
