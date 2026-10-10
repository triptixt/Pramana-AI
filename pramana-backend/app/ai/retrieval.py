from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.evidence_chunk import EvidenceChunk
from app.models.evidence_version import EvidenceVersion
from app.models.evidence import Evidence
from app.models.control import Control
from app.models.framework_version import FrameworkVersion
from app.ai.embeddings import generate_embedding

def retrieve_relevant_chunks(db: Session, query: str, organization_id: int, top_k: int = 5):
    """
    Retrieves the most relevant evidence chunks for a given query, strictly respecting organization boundaries.
    """
    query_embedding = generate_embedding(query)

    # Perform semantic search, joining with EvidenceVersion and Evidence to filter by organization
    results = (
        db.query(EvidenceChunk, Evidence)
        .join(EvidenceVersion, EvidenceChunk.evidence_version_id == EvidenceVersion.id)
        .join(Evidence, EvidenceVersion.evidence_id == Evidence.id)
        .filter(Evidence.organization_id == organization_id)
        .filter(EvidenceChunk.embedding.isnot(None))
        .order_by(EvidenceChunk.embedding.l2_distance(query_embedding))
        .limit(top_k)
        .all()
    )
    
    return results


from app.models.organization_framework import OrganizationFramework

def retrieve_relevant_controls(
    db: Session,
    query_text: str,
    organization_id: Optional[int] = None,
    framework_id: Optional[int] = None,
    framework_version_id: Optional[int] = None,
    top_k: int = 5
) -> List[Control]:
    """
    Retrieves the most relevant controls from pgvector embeddings, strictly scoped to the organization's
    selected frameworks or specified framework/version.
    """
    query_embedding = generate_embedding(query_text)

    query = db.query(Control).filter(Control.embedding.isnot(None))

    if framework_version_id:
        query = query.filter(Control.framework_version_id == framework_version_id)
    elif framework_id:
        versions = db.query(FrameworkVersion.id).filter(FrameworkVersion.framework_id == framework_id).all()
        version_ids = [v[0] for v in versions]
        if version_ids:
            query = query.filter(Control.framework_version_id.in_(version_ids))
        else:
            return []
    elif organization_id:
        # Get active framework versions for this organization
        org_fws = db.query(OrganizationFramework).filter(
            OrganizationFramework.organization_id == organization_id,
            OrganizationFramework.status == "active"
        ).all()
        version_ids = [of.framework_version_id for of in org_fws if of.framework_version_id]
        if version_ids:
            query = query.filter(Control.framework_version_id.in_(version_ids))
        else:
            return []

    return query.order_by(Control.embedding.l2_distance(query_embedding)).limit(top_k).all()

