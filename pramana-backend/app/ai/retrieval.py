import logging
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.evidence_chunk import EvidenceChunk
from app.models.evidence_version import EvidenceVersion
from app.models.evidence import Evidence
from app.models.control import Control
from app.models.framework import Framework
from app.models.framework_version import FrameworkVersion
from app.models.organization_framework import OrganizationFramework
from app.ai.embeddings import generate_embedding

logger = logging.getLogger("pramana.ai.retrieval")


def retrieve_relevant_chunks(
    db: Session,
    query: str,
    organization_id: int,
    top_k: int = 5,
    evidence_id: Optional[int] = None
) -> List[Tuple[EvidenceChunk, Evidence, EvidenceVersion]]:
    """
    Retrieves the most relevant evidence chunks for a given query, strictly respecting
    organization boundaries, processing status, and valid version relationships.
    Optionally scoped to a specific evidence_id.
    Returns tuples of (EvidenceChunk, Evidence, EvidenceVersion).
    """
    if not query or not query.strip():
        logger.debug("[Retrieval] Empty query provided, returning empty chunks.")
        return []

    import time
    t0 = time.time()

    try:
        query_embedding = generate_embedding(query)
    except Exception as e:
        logger.error(f"[Retrieval] Failed to generate query embedding: {e}")
        return []

    # Semantic search strictly joined and filtered by organization
    query_builder = (
        db.query(EvidenceChunk, Evidence, EvidenceVersion)
        .join(EvidenceVersion, EvidenceChunk.evidence_version_id == EvidenceVersion.id)
        .join(Evidence, EvidenceVersion.evidence_id == Evidence.id)
        .filter(
            Evidence.organization_id == organization_id,
            Evidence.status == "processed",
            EvidenceChunk.embedding.isnot(None)
        )
    )

    if evidence_id:
        query_builder = query_builder.filter(Evidence.id == evidence_id)

    results = (
        query_builder
        .order_by(EvidenceChunk.embedding.cosine_distance(query_embedding))
        .limit(top_k)
        .all()
    )

    duration = round(time.time() - t0, 3)
    logger.info(
        f"[Retrieval] Retrieved {len(results)} chunks for org #{organization_id} "
        f"(evidence_id={evidence_id or 'all'}, top_k={top_k}) in {duration}s."
    )

    return results


def retrieve_relevant_controls(
    db: Session,
    query_text: str,
    organization_id: int,
    framework_id: Optional[int] = None,
    framework_version_id: Optional[int] = None,
    top_k: int = 5
) -> List[Control]:
    """
    Retrieves the most relevant controls from pgvector embeddings.
    CRITICAL SECURITY RULE: Scoped strictly to the active frameworks assigned to the organization.
    Supplying framework_id or framework_version_id CANNOT bypass organization enrollment checks.
    """
    if not organization_id:
        logger.warning("retrieve_relevant_controls called without organization_id. Refusing global retrieval.")
        return []

    if not query_text or not query_text.strip():
        return []

    # 1. Fetch all active framework assignments for this organization
    org_fws = db.query(OrganizationFramework).filter(
        OrganizationFramework.organization_id == organization_id,
        OrganizationFramework.status == "active"
    ).all()

    if not org_fws:
        logger.info(f"Organization {organization_id} has no active framework enrollments.")
        return []

    enrolled_framework_ids = {of.framework_id for of in org_fws}
    enrolled_version_ids = {of.framework_version_id for of in org_fws if of.framework_version_id}

    # 2. Determine authorized framework version IDs based on inputs and enrollment
    target_version_ids: List[int] = []

    # Case A: Both framework_id and framework_version_id specified
    if framework_id and framework_version_id:
        if framework_id not in enrolled_framework_ids:
            logger.warning(
                f"Org {organization_id} is not enrolled in framework {framework_id}. Access denied."
            )
            return []

        # Verify framework is globally active
        fw = db.query(Framework).filter(Framework.id == framework_id, Framework.is_active == True).first()
        if not fw:
            return []

        # Verify version belongs to this framework
        ver = db.query(FrameworkVersion).filter(
            FrameworkVersion.id == framework_version_id,
            FrameworkVersion.framework_id == framework_id
        ).first()
        if not ver:
            return []

        target_version_ids = [framework_version_id]

    # Case B: Only framework_version_id specified
    elif framework_version_id:
        ver = db.query(FrameworkVersion).filter(FrameworkVersion.id == framework_version_id).first()
        if not ver:
            return []

        if ver.framework_id not in enrolled_framework_ids:
            logger.warning(
                f"Org {organization_id} not enrolled in parent framework {ver.framework_id} for version {framework_version_id}."
            )
            return []

        fw = db.query(Framework).filter(Framework.id == ver.framework_id, Framework.is_active == True).first()
        if not fw:
            return []

        target_version_ids = [framework_version_id]

    # Case C: Only framework_id specified
    elif framework_id:
        if framework_id not in enrolled_framework_ids:
            logger.warning(f"Org {organization_id} not enrolled in framework {framework_id}.")
            return []

        fw = db.query(Framework).filter(Framework.id == framework_id, Framework.is_active == True).first()
        if not fw:
            return []

        # Find matching enrolled version or latest active version for this framework
        matching_ofw = next((of for of in org_fws if of.framework_id == framework_id), None)
        if matching_ofw and matching_ofw.framework_version_id:
            target_version_ids = [matching_ofw.framework_version_id]
        else:
            versions = db.query(FrameworkVersion.id).filter(
                FrameworkVersion.framework_id == framework_id,
                FrameworkVersion.status == "active"
            ).all()
            target_version_ids = [v[0] for v in versions]

    # Case D: No specific framework specified - use all enrolled versions
    else:
        # Collect all active versions of all enrolled frameworks
        valid_fws = db.query(Framework.id).filter(
            Framework.id.in_(enrolled_framework_ids),
            Framework.is_active == True
        ).all()
        valid_fw_ids = {f[0] for f in valid_fws}

        for of in org_fws:
            if of.framework_id not in valid_fw_ids:
                continue
            if of.framework_version_id:
                target_version_ids.append(of.framework_version_id)
            else:
                versions = db.query(FrameworkVersion.id).filter(
                    FrameworkVersion.framework_id == of.framework_id,
                    FrameworkVersion.status == "active"
                ).all()
                target_version_ids.extend([v[0] for v in versions])

        target_version_ids = list(set(target_version_ids))

    if not target_version_ids:
        return []

    # 3. Generate query embedding and retrieve matching controls
    import time
    t0 = time.time()
    try:
        query_embedding = generate_embedding(query_text)
    except Exception as e:
        logger.error(f"[Retrieval] Failed to generate query embedding for controls retrieval: {e}")
        return []

    controls = (
        db.query(Control)
        .filter(
            Control.framework_version_id.in_(target_version_ids),
            Control.is_active == True,
            Control.embedding.isnot(None)
        )
        .order_by(Control.embedding.cosine_distance(query_embedding))
        .limit(top_k)
        .all()
    )

    duration = round(time.time() - t0, 3)
    logger.info(
        f"[Retrieval] Retrieved {len(controls)} controls for org #{organization_id} "
        f"across {len(target_version_ids)} versions in {duration}s."
    )
    return controls
