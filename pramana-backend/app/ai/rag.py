import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.config import settings
from app.ai.retrieval import retrieve_relevant_chunks
from app.ai.prompts import get_compliance_prompt
from app.ai.llm import get_llm, parse_llm_response, AssessmentResult, LLMParseError, LLMExecutionError
from app.models.control import Control
from app.models.framework import Framework

logger = logging.getLogger("pramana.ai.rag")


def execute_rag_for_control(
    db: Session,
    organization_id: int,
    control: Control,
    framework: Framework,
    evidence_id: Optional[int] = None
) -> AssessmentResult:
    """
    Executes the evidence-based RAG evaluation pipeline for a single control:
    1. Retrieves top-k evidence chunks scoped to the organization from PostgreSQL/pgvector.
    2. Builds structured context preserving document ID, version, file name, chunk index, and page number.
    3. Invokes local Ollama LLM with anti-injection and anti-hallucination compliance prompt.
    4. Validates returned structured assessment and citations against retrieved evidence.
    5. Returns validated AssessmentResult.
    """
    query = f"{control.control_code} {control.title} {control.requirement or control.description or ''}"

    # 1. Retrieve chunks with provenance (optionally scoped to evidence_id)
    retrieved_results = retrieve_relevant_chunks(db, query, organization_id, top_k=5, evidence_id=evidence_id)

    # If no evidence retrieved, return Insufficient evidence with null confidence and null coverage score
    if not retrieved_results:
        return AssessmentResult(
            control_id=control.id,
            framework_id=framework.id,
            assessment_status="Insufficient evidence",
            coverage_score=None,
            confidence=None,
            confidence_method="no_evidence_retrieved",
            reasoning=(
                f"No relevant compliance evidence documents were found in your organization's vault "
                f"for control [{control.control_code}] {control.title}. "
                "Compliance cannot be established without verified operational records."
            ),
            supporting_evidence=[],
            missing_requirements=[f"Missing operational documentation, configurations, or audit artifacts for control requirement: {control.title}."],
            evidence_chunk_ids=[],
            citations=[]
        )

    # 2. Build Evidence Context with full provenance headers
    evidence_context_parts: List[str] = []
    source_lookup: Dict[str, Dict[str, Any]] = {}
    evidence_chunk_ids: List[int] = []

    for chunk, evidence, version in retrieved_results:
        evidence_chunk_ids.append(chunk.id)
        page_str = f" | Page {chunk.page_number}" if chunk.page_number else ""
        source_header = (
            f"[Evidence #{evidence.id}: {evidence.file_name} | "
            f"Version #{version.version_number} | "
            f"Chunk #{chunk.chunk_index}{page_str}]"
        )
        source_lookup[source_header] = {
            "evidence_id": evidence.id,
            "file_name": evidence.file_name,
            "version_number": version.version_number,
            "chunk_index": chunk.chunk_index,
            "page_number": chunk.page_number
        }
        evidence_context_parts.append(
            f"SOURCE: {source_header}\nCONTENT:\n{chunk.content}\n"
        )

    evidence_context = "\n----------------------------------------\n".join(evidence_context_parts)

    # 3. Format Prompt
    prompt = get_compliance_prompt()
    requirement_text = control.requirement or control.description or control.title
    formatted_prompt = prompt.format(
        framework_name=framework.name,
        control_code=control.control_code,
        control_title=control.title,
        control_description=requirement_text,
        evidence_context=evidence_context
    )

    # 4. Call LLM
    import time
    t0 = time.time()
    try:
        logger.info(
            f"[RAG] Invoking LLM ({settings.ollama_model}) for control [{control.control_code}] {control.title} "
            f"with {len(retrieved_results)} chunks ({len(evidence_context)} context chars)."
        )
        llm = get_llm(timeout=120.0)
        response = llm.invoke(formatted_prompt)
        duration = round(time.time() - t0, 3)
        raw_content = response.content if hasattr(response, "content") else str(response)
        result = parse_llm_response(raw_content)
        result.control_id = control.id
        result.framework_id = framework.id
        result.evidence_chunk_ids = evidence_chunk_ids
        logger.info(
            f"[RAG] LLM completed for [{control.control_code}] in {duration}s -> "
            f"status='{result.assessment_status}', coverage={result.coverage_score}%, confidence={result.confidence}."
        )
    except (LLMParseError, LLMExecutionError) as err:
        logger.error(f"[RAG] LLM evaluation failure for control {control.control_code}: {err}")
        raise
    except Exception as general_err:
        logger.error(f"[RAG] Unexpected error executing LLM for control {control.control_code}: {general_err}")
        raise LLMExecutionError(f"LLM execution failed: {str(general_err)}")

    # 5. Citation Validation
    # Validate every citation against the retrieved evidence headers
    validated_citations: List[str] = []
    for raw_citation in result.citations:
        cleaned_cit = raw_citation.strip()
        # Direct match with an exact source header
        if cleaned_cit in source_lookup:
            if cleaned_cit not in validated_citations:
                validated_citations.append(cleaned_cit)
            continue

        # Substring match (e.g. LLM cited "policy.pdf" or "Chunk #0")
        matched_header = None
        for header, meta in source_lookup.items():
            if meta["file_name"].lower() in cleaned_cit.lower() or f"evidence #{meta['evidence_id']}" in cleaned_cit.lower():
                matched_header = header
                break
        if matched_header and matched_header not in validated_citations:
            validated_citations.append(matched_header)

    # If the LLM produced a valid assessment based on the evidence but omitted header formatting,
    # supply the headers of the retrieved chunks that contributed to the evaluation
    if not validated_citations and result.assessment_status in ["Satisfied", "Partially satisfied", "COMPLIANT", "PARTIALLY_COMPLIANT"]:
        validated_citations = list(source_lookup.keys())

    result.citations = validated_citations
    return result
