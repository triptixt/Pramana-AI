import json
import logging
import re
from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator

try:
    from langchain_ollama import ChatOllama
except ImportError:
    try:
        from langchain_community.chat_models import ChatOllama
    except ImportError:
        ChatOllama = None

from app.config import settings
from app.services.scoring_service import (
    RequirementAssessment,
    calculate_coverage_percentage,
    determine_compliance_status,
    ComplianceStatusLiteral
)

logger = logging.getLogger("pramana.ai.llm")

LEGACY_STATUS_MAP = {
    "COMPLIANT": "Satisfied",
    "PARTIALLY_COMPLIANT": "Partially satisfied",
    "NON_COMPLIANT": "Not satisfied",
    "INSUFFICIENT_EVIDENCE": "Insufficient evidence",
    "SATISFIED": "Satisfied",
    "PARTIALLY_SATISFIED": "Partially satisfied",
    "NOT_SATISFIED": "Not satisfied",
    "INSUFFICIENT": "Insufficient evidence"
}

CANONICAL_TO_LEGACY_MAP = {
    "Satisfied": "COMPLIANT",
    "Partially satisfied": "PARTIALLY_COMPLIANT",
    "Not satisfied": "NON_COMPLIANT",
    "Insufficient evidence": "INSUFFICIENT_EVIDENCE"
}


class LLMExecutionError(Exception):
    """Raised when the LLM service cannot be reached or fails to execute."""
    pass


class LLMParseError(Exception):
    """Raised when the LLM output cannot be parsed into a valid structured assessment."""
    pass


class AssessmentResult(BaseModel):
    control_id: Optional[int] = None
    framework_id: Optional[int] = None
    assessment_status: ComplianceStatusLiteral = Field(
        default="Insufficient evidence",
        description="One of: Satisfied, Partially satisfied, Not satisfied, Insufficient evidence"
    )
    coverage_score: Optional[float] = Field(
        default=None,
        description="Deterministic evidence coverage percentage calculated by scoring service"
    )
    confidence: Optional[float] = Field(
        default=None,
        description="Calibrated confidence score, or null if uncalibrated/unavailable"
    )
    confidence_method: Optional[str] = Field(
        default=None,
        description="Confidence estimation methodology: null or 'uncalibrated_model_estimate'"
    )
    reasoning: str = Field(default="", description="Detailed step-by-step auditor reasoning")
    supporting_evidence: List[str] = Field(default_factory=list, description="Specific supporting evidence quotes")
    missing_requirements: List[str] = Field(default_factory=list, description="Specific missing requirements and gaps")
    recommendations: List[str] = Field(default_factory=list, description="Actionable recommendations")
    evidence_chunk_ids: List[int] = Field(default_factory=list, description="IDs of evidence chunks analyzed")
    citations: List[str] = Field(default_factory=list, description="Sources cited from evidence headers")
    requirements_evaluations: List[RequirementAssessment] = Field(
        default_factory=list,
        description="Decomposed sub-requirements evaluated using 0-4 rubric"
    )

    # Backward compatibility properties
    @property
    def status(self) -> str:
        return CANONICAL_TO_LEGACY_MAP.get(self.assessment_status, "INSUFFICIENT_EVIDENCE")

    @property
    def explanation(self) -> str:
        return self.reasoning

    @property
    def gaps(self) -> List[str]:
        return self.missing_requirements


def get_llm(timeout: float = 120.0):
    """
    Initializes and returns the ChatOllama model with explicit connection timeout
    and robust error handling using central application settings.
    """
    if ChatOllama is None:
        raise LLMExecutionError("ChatOllama is not installed. Please install langchain-ollama.")
    try:
        return ChatOllama(
            base_url=settings.ollama_base_url,
            model=settings.ollama_model,
            temperature=0.0,
            client_kwargs={"timeout": timeout}
        )
    except Exception as e:
        raise LLMExecutionError(
            f"Failed to initialize ChatOllama at {settings.ollama_base_url} with model '{settings.ollama_model}': {str(e)}"
        )


def extract_json_from_text(text: str) -> str:
    """
    Extracts a JSON object string from raw LLM output, stripping markdown code blocks.
    """
    if not text or not text.strip():
        raise LLMParseError("Received empty response from LLM.")

    clean_text = text.strip()

    # If wrapped in markdown code blocks: ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean_text, re.IGNORECASE)
    if match:
        clean_text = match.group(1).strip()

    # If still not starting with {, search for the first { to the last }
    start_idx = clean_text.find("{")
    end_idx = clean_text.rfind("}")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        clean_text = clean_text[start_idx : end_idx + 1]

    return clean_text


def parse_llm_response(response_text: str) -> AssessmentResult:
    """
    Parses the JSON response from the LLM into a structured Pydantic model.
    Applies deterministic scoring and audit decision rules.
    """
    if not response_text or not response_text.strip():
        raise LLMParseError("LLM response text is empty.")

    clean_json = extract_json_from_text(response_text)

    try:
        data = json.loads(clean_json)
    except json.JSONDecodeError as err:
        logger.error(f"Malformed JSON from LLM: {err} | Raw text: {response_text[:300]}")
        raise LLMParseError(f"Malformed JSON from LLM: {str(err)}")

    if not isinstance(data, dict):
        raise LLMParseError(f"Expected JSON object, got {type(data).__name__}")

    # 1. Parse Sub-requirements Evaluations if present
    raw_evals = (
        data.get("requirements_evaluations")
        or data.get("requirements_breakdown")
        or data.get("sub_requirements")
        or data.get("requirements")
        or []
    )
    req_objs: List[RequirementAssessment] = []
    if isinstance(raw_evals, list):
        for item in raw_evals:
            if isinstance(item, dict):
                try:
                    # Enforce score range 0-4
                    sc = int(item.get("score", 0))
                    sc = max(0, min(4, sc))
                    req_objs.append(RequirementAssessment(
                        requirement_text=str(item.get("requirement_text") or item.get("requirement") or "Requirement item"),
                        score=sc,
                        weight=float(item.get("weight") or 1.0),
                        reasoning=str(item.get("reasoning") or item.get("finding") or ""),
                        is_operational_evidence_present=bool(item.get("is_operational_evidence_present") or item.get("operational_evidence_found") or False),
                        missing_operational_evidence=item.get("missing_operational_evidence"),
                        contradictory_evidence_found=bool(item.get("contradictory_evidence_found", False))
                    ))
                except Exception as eval_err:
                    logger.warning(f"Failed to parse sub-requirement item: {eval_err}")

    # 2. Deterministic Coverage Calculation
    coverage_score = calculate_coverage_percentage(req_objs)

    # 3. Deterministic Compliance Status
    has_contradictions = bool(data.get("has_contradictions", False)) or bool(data.get("contradictory_evidence", False))
    if req_objs:
        status_val = determine_compliance_status(
            coverage_score=coverage_score,
            requirements=req_objs,
            has_evidence_chunks=True,
            explicit_contradiction=has_contradictions
        )
    else:
        if has_contradictions:
            status_val = "Not satisfied"
        else:
            # Fallback to legacy status if sub-requirements weren't decomposed
            raw_status = str(data.get("status") or data.get("assessment_status") or "INSUFFICIENT_EVIDENCE")
            norm_raw = raw_status.strip().upper().replace(" ", "_").replace("-", "_")
            status_val = LEGACY_STATUS_MAP.get(norm_raw, "Insufficient evidence")

    # 4. Extract reasoning & supporting evidence
    reasoning_text = str(data.get("reasoning") or data.get("explanation") or "Audit evaluation finalized.")
    if has_contradictions and "contradiction" not in reasoning_text.lower():
        contradiction_details = str(data.get("contradiction_details") or "Contradictory evidence identified across artifacts.")
        reasoning_text = f"Contradiction detected: {contradiction_details}. {reasoning_text}"
    supporting_ev = data.get("supporting_evidence") or []
    if isinstance(supporting_ev, str):
        supporting_ev = [supporting_ev]

    missing_reqs = data.get("missing_requirements") or data.get("gaps") or []
    if isinstance(missing_reqs, str):
        missing_reqs = [missing_reqs]

    recs = data.get("recommendations") or []
    if isinstance(recs, str):
        recs = [recs]

    cites = data.get("citations") or []
    if isinstance(cites, str):
        cites = [cites]

    # 5. Handle confidence generation honestly and accurately:
    # Validate returned confidence field: fix mismatched keys, parsing errors, type conversions, range checks.
    # Treat model-reported confidence as an uncalibrated estimate (0.0 to 1.0).
    # Never fabricate confidence or substitute constants. Keep NULL if missing or invalid and record why.
    raw_conf = data.get("confidence") if "confidence" in data else data.get("confidence_score")
    confidence_val = None
    confidence_method = None

    if raw_conf is not None:
        try:
            if isinstance(raw_conf, str):
                cleaned = raw_conf.replace("%", "").strip()
                parsed_conf = float(cleaned)
            else:
                parsed_conf = float(raw_conf)

            # If model returned as percentage (e.g. 85.0 instead of 0.85), normalize to 0.0-1.0
            if 1.0 < parsed_conf <= 100.0:
                parsed_conf = parsed_conf / 100.0

            if 0.0 <= parsed_conf <= 1.0:
                confidence_val = round(parsed_conf, 4)
                confidence_method = "uncalibrated_model_estimate"
            else:
                logger.warning(f"Confidence value out of 0.0-1.0 range: {raw_conf}")
                confidence_val = None
                confidence_method = "invalid_model_confidence_range"
        except (ValueError, TypeError) as err:
            logger.warning(f"Failed to parse confidence value '{raw_conf}': {err}")
            confidence_val = None
            confidence_method = "unparseable_model_confidence"
    else:
        confidence_val = None
        confidence_method = "not_provided_by_model"

    return AssessmentResult(
        assessment_status=status_val,
        coverage_score=coverage_score,
        confidence=confidence_val,
        confidence_method=confidence_method,
        reasoning=reasoning_text,
        supporting_evidence=[str(s) for s in supporting_ev],
        missing_requirements=[str(m) for m in missing_reqs],
        recommendations=[str(r) for r in recs],
        evidence_chunk_ids=[],
        citations=[str(c) for c in cites],
        requirements_evaluations=req_objs
    )
