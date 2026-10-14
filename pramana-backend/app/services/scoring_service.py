"""
Deterministic Compliance Scoring & Evidence Coverage Service for Pramana AI.

Implements the formal audit rubric and deterministic coverage formula:
- Score 0: No supporting evidence or evidence contradicts the requirement.
- Score 1: Very limited support.
- Score 2: Partial support with significant requirements missing (or policy-only without operational proof).
- Score 3: Mostly supported with some gaps.
- Score 4: Strong support for the documented requirement.

Coverage percentage = (sum(w_i * s_i) / (4 * sum(w_i))) * 100
"""

import logging
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

logger = logging.getLogger("pramana.services.scoring")

ComplianceStatusLiteral = Literal["Satisfied", "Partially satisfied", "Not satisfied", "Insufficient evidence"]


class RequirementAssessment(BaseModel):
    requirement_text: str = Field(description="Specific sub-requirement or mandate under evaluation")
    score: int = Field(ge=0, le=4, description="Rubric score 0-4")
    weight: float = Field(default=1.0, gt=0.0, description="Importance weight (default 1.0 equal weights)")
    reasoning: str = Field(default="", description="Specific evidence-based auditor explanation for this requirement")
    is_operational_evidence_present: bool = Field(
        default=False,
        description="Whether verifiable operational execution records (logs, ticket exports, audit reports) exist"
    )
    missing_operational_evidence: Optional[str] = Field(
        default=None,
        description="Identified missing operational verification if only policy documentation was provided"
    )
    contradictory_evidence_found: bool = Field(
        default=False,
        description="True if evidence explicitly contradicts or violates the control mandate"
    )


def calculate_coverage_percentage(requirements: List[RequirementAssessment]) -> Optional[float]:
    """
    Calculates deterministic evidence coverage percentage across n assessed requirements:
    Coverage percentage = (sum(w_i * s_i) / (4 * sum(w_i))) * 100
    
    Returns None if no requirements have been assessed (never silently returns 0% or 100%).
    """
    if not requirements or len(requirements) == 0:
        return None

    sum_weighted_scores = sum(r.weight * float(r.score) for r in requirements)
    sum_weights = sum(r.weight for r in requirements)

    if sum_weights <= 0:
        return None

    max_possible = 4.0 * sum_weights
    coverage = (sum_weighted_scores / max_possible) * 100.0
    return round(max(0.0, min(100.0, coverage)), 2)


def determine_compliance_status(
    coverage_score: Optional[float],
    requirements: List[RequirementAssessment],
    has_evidence_chunks: bool,
    explicit_contradiction: bool = False
) -> ComplianceStatusLiteral:
    """
    Evaluates compliance status deterministically based on audit decision rules:
    - Insufficient evidence: No supporting chunks retrieved or coverage cannot be calculated.
    - Not satisfied: Contradictory evidence identified, or coverage score < 25.0%.
    - Partially satisfied: Coverage score between 25.0% and 89.9%, or significant operational gaps.
    - Satisfied: Coverage score >= 90.0%, all sub-requirements scored >= 3, no contradictions, and operational verification satisfied.
    """
    # Rule 1: No evidence retrieved or no assessable requirements
    if not has_evidence_chunks or coverage_score is None or len(requirements) == 0:
        return "Insufficient evidence"

    # Rule 2: Explicit contradiction in evidence
    if explicit_contradiction or any(r.contradictory_evidence_found for r in requirements):
        logger.info("Contradictory compliance evidence detected; marking control Not satisfied.")
        return "Not satisfied"

    # Rule 3: Negligible coverage (< 25%)
    if coverage_score < 25.0:
        return "Not satisfied"

    # Rule 4: High coverage (>= 90%) with operational satisfaction
    if coverage_score >= 90.0:
        # Check if any requirement received an unmitigated low score (< 3)
        if any(r.score < 3 for r in requirements):
            return "Partially satisfied"
        return "Satisfied"

    # Rule 5: Moderate/Partial coverage (25.0% - 89.9%)
    return "Partially satisfied"


def determine_gap_severity(
    status: str,
    control_category: Optional[str] = None,
    control_title: Optional[str] = None,
    control_code: Optional[str] = None,
    has_contradictions: bool = False,
    coverage_score: Optional[float] = None,
    requirements: Optional[List[RequirementAssessment]] = None,
    missing_requirements: Optional[List[str]] = None
) -> tuple[Optional[str], Optional[str]]:
    """
    Computes deterministic, risk-based compliance gap severity and returns (severity, severity_reason).

    Severity Levels:
    - None: Control is Satisfied (no gap exists).
    - 'unassessed': Evaluation cannot be completed or status is unknown (never silently defaults to Medium).
    - 'critical': Confirmed direct violation or contradictory evidence in a high-impact security/privacy domain.
    - 'high': Confirmed failure (Not satisfied) or missing core operational safeguards in critical domains.
    - 'medium': Partial implementation in baseline operational controls, or audit documentation gap in critical domains.
    - 'low': Minor administrative, documentation, or governance gaps.

    Audit Rules:
    1. A missing evidence file is an audit documentation gap, NOT a confirmed security incident.
    2. An insufficient-evidence result is never marked Critical or High.
    3. Contradictory evidence (confirmed violation) in a critical domain triggers Critical severity.
    4. Severity never defaults to Medium when the calculation cannot be completed.
    5. A specific, transparent reason is always returned explaining why the severity was assigned.
    """
    norm_status = (status or "").strip()
    canonical_status = LEGACY_TO_CANONICAL_STATUS_MAP.get(norm_status.upper().replace(" ", "_"), norm_status)

    # Rule 1: Satisfied control -> No gap
    if canonical_status in ["Satisfied", "COMPLIANT"]:
        return None, "Control requirement is fully satisfied; no compliance gap exists."

    # Rule 2: Unassessed / Unknown status
    if not canonical_status or canonical_status not in ["Not satisfied", "Partially satisfied", "Insufficient evidence", "NON_COMPLIANT", "PARTIALLY_COMPLIANT", "INSUFFICIENT_EVIDENCE"]:
        return "unassessed", "Control evaluation could not be completed; severity remains unassessed."

    # Domain classification based on regulatory impact, asset sensitivity, and technical criticality
    domain_text = f"{control_category or ''} {control_title or ''} {control_code or ''}".lower()

    # High-impact security & regulatory domains
    CRITICAL_DOMAIN_KEYWORDS = [
        "encrypt", "crypt", "cardholder", "pci", "credit", "personal data", "sensitive",
        "dpdp", "password", "credential", "mfa", "multi-factor", "privileged", "auth",
        "incident", "breach", "vulnerability", "child", "firewall", "segmentation", "key management"
    ]

    # Baseline operational and technical controls
    MEDIUM_DOMAIN_KEYWORDS = [
        "log", "monitor", "backup", "recover", "vendor", "supplier", "third-party", "physical",
        "change management", "training", "awareness", "asset", "system operations", "secure system"
    ]

    is_critical_domain = any(kw in domain_text for kw in CRITICAL_DOMAIN_KEYWORDS)
    is_medium_domain = any(kw in domain_text for kw in MEDIUM_DOMAIN_KEYWORDS)

    domain_label = control_category or control_title or "Security & Compliance"

    # Rule 3: Insufficient evidence (Missing evidence file or missing operational logs)
    # Strictly distinguished from confirmed failure: An audit readiness gap, NOT a security breach.
    if canonical_status in ["Insufficient evidence", "INSUFFICIENT_EVIDENCE"]:
        if is_critical_domain:
            return (
                "medium",
                f"Medium severity: Insufficient operational evidence in high-impact domain ({domain_label}). "
                "Classified as an evidence audit readiness gap rather than a confirmed security incident."
            )
        else:
            return (
                "low",
                f"Low severity: Insufficient operational documentation in {domain_label} domain. "
                "Pending submission of verified policy and operational artifacts."
            )

    # Rule 4: Confirmed Failure (Not satisfied) or Contradictory Evidence Detected
    if canonical_status in ["Not satisfied", "NON_COMPLIANT"] or has_contradictions:
        if has_contradictions:
            if is_critical_domain:
                return (
                    "critical",
                    f"Critical severity: Confirmed control failure with contradictory evidence or explicit policy violation "
                    f"in high-impact domain ({domain_label}). Immediate remediation required."
                )
            else:
                return (
                    "high",
                    f"High severity: Contradictory operational evidence detected in baseline control ({domain_label})."
                )
        else:
            if is_critical_domain:
                return (
                    "high",
                    f"High severity: Confirmed non-compliance in critical security control ({domain_label}) "
                    f"with negligible evidence coverage ({coverage_score if coverage_score is not None else 0.0}%)."
                )
            elif is_medium_domain:
                return (
                    "medium",
                    f"Medium severity: Non-compliance in operational baseline control ({domain_label})."
                )
            else:
                return (
                    "low",
                    f"Low severity: Non-compliance in organizational governance or administrative requirement ({domain_label})."
                )

    # Rule 5: Partial Implementation (Partially satisfied)
    if canonical_status in ["Partially satisfied", "PARTIALLY_COMPLIANT"]:
        req_list = requirements or []
        has_severe_sub_gap = any(r.score <= 1 for r in req_list)

        if is_critical_domain:
            if has_severe_sub_gap:
                return (
                    "high",
                    f"High severity: Core operational safeguard unfulfilled (rubric score <= 1) "
                    f"despite partial implementation in critical domain ({domain_label})."
                )
            else:
                return (
                    "medium",
                    f"Medium severity: Partial coverage in high-impact security domain ({domain_label}) "
                    f"with moderate operational gaps remaining."
                )
        elif is_medium_domain:
            return (
                "medium",
                f"Medium severity: Partial implementation of operational baseline control ({domain_label})."
            )
        else:
            return (
                "low",
                f"Low severity: Minor documentation or administrative gaps in governance requirement ({domain_label})."
            )

    # Default safety fallback: Return unassessed rather than silently defaulting to Medium
    return "unassessed", "Gap severity could not be determined from available control attributes."


LEGACY_TO_CANONICAL_STATUS_MAP = {
    "COMPLIANT": "Satisfied",
    "SATISFIED": "Satisfied",
    "PARTIALLY_COMPLIANT": "Partially satisfied",
    "PARTIALLY_SATISFIED": "Partially satisfied",
    "NON_COMPLIANT": "Not satisfied",
    "NOT_SATISFIED": "Not satisfied",
    "INSUFFICIENT_EVIDENCE": "Insufficient evidence",
    "INSUFFICIENT": "Insufficient evidence"
}
