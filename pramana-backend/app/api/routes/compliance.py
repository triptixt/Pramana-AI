import json
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.framework import Framework
from app.models.framework_version import FrameworkVersion
from app.models.control import Control
from app.models.organization_framework import OrganizationFramework
from app.models.user import User
from app.models.evidence import Evidence
from app.models.evidence_control_mapping import EvidenceControlMapping
from app.core.dependencies import get_current_user
from app.services.rbac_service import get_user_effective_permissions
from app.ai.rag import execute_rag_for_control
from app.ai.assessment import sync_control_gap_analysis
from app.models.ai_run import AIRun
from app.models.ai_output import AIOutput

logger = logging.getLogger("pramana.routes.compliance")

router = APIRouter(
    prefix="/compliance",
    tags=["Compliance"]
)

@router.get("/frameworks")
def get_compliance_frameworks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch all real published frameworks and their versions from PostgreSQL."""
    frameworks = db.query(Framework).filter(
        Framework.is_active == True
    ).order_by(Framework.name.asc()).all()
    output = []
    
    for f in frameworks:
        versions = db.query(FrameworkVersion).filter(FrameworkVersion.framework_id == f.id).all()
        version_list = [
            {
                "id": v.id,
                "version": v.version or "1.0",
                "authority": v.authority or "Standards Authority",
                "effective_date": v.effective_date or "Active",
                "status": v.status or "active",
                "source_url": v.source_url or "",
                "total_controls": v.total_controls or f.total_controls or 0
            }
            for v in versions
        ]
        if not version_list:
            version_list = [{
                "id": f.id,
                "version": f.version or "1.0",
                "authority": "Standards Authority",
                "effective_date": "Active",
                "status": "active" if f.is_active else "inactive",
                "source_url": "",
                "total_controls": f.total_controls or 0
            }]

        output.append({
            "id": f.id,
            "name": f.name,
            "code": f.code,
            "description": f.description or f.name,
            "category": f.category or "Information Security & Cyber",
            "version": f.version or (version_list[0]["version"] if version_list else "1.0"),
            "file_name": f.file_name,
            "status": f.status or "completed",
            "total_controls": f.total_controls or 0,
            "versions": version_list
        })
    return output


@router.get("/frameworks/versions/{version_id}/controls")
def get_version_controls(version_id: int, db: Session = Depends(get_db)):
    """Fetch all actual controls belonging to a framework version from PostgreSQL."""
    controls = db.query(Control).filter(
        Control.framework_version_id == version_id,
        Control.is_active == True
    ).order_by(Control.id.asc()).all()

    return [
        {
            "id": c.id,
            "framework_version_id": c.framework_version_id,
            "control_code": c.control_code,
            "title": c.title,
            "category": c.category or "General",
            "requirement": c.requirement or c.description or c.title,
            "description": c.description or c.title,
            "source_reference": c.source_reference or c.control_code,
            "guidance": c.guidance or ""
        }
        for c in controls
    ]


@router.get("/organization-frameworks")
def get_organization_frameworks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch enrolled compliance frameworks for the current user's organization."""
    org_fws = db.query(OrganizationFramework, Framework).join(
        Framework, OrganizationFramework.framework_id == Framework.id
    ).filter(
        OrganizationFramework.organization_id == current_user.organization_id,
        OrganizationFramework.status == "active"
    ).all()

    results = []
    for ofw, fw in org_fws:
        ver = db.query(FrameworkVersion).filter(FrameworkVersion.framework_id == fw.id).order_by(FrameworkVersion.id.desc()).first()
        results.append({
            "id": ofw.id,
            "organization_id": ofw.organization_id,
            "framework_id": fw.id,
            "framework_name": fw.name,
            "framework_code": fw.code,
            "category": fw.category or "Information Security & Cyber",
            "framework_version_id": ver.id if ver else fw.id,
            "version": ver.version if ver else (fw.version or "1.0"),
            "authority": ver.authority if ver else "Standards Authority",
            "status": ofw.status,
            "total_controls": fw.total_controls or 0,
            "created_at": str(ofw.selected_at) if hasattr(ofw, "selected_at") and ofw.selected_at else ""
        })

    return results


@router.post("/organization-frameworks/select")
def select_organization_frameworks(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Batch save or update an organization's selected compliance frameworks.
    Persists selections in PostgreSQL organization_frameworks table.
    """
    perms = get_user_effective_permissions(current_user, db)
    if "manage_frameworks" not in perms and "frameworks:full" not in perms and "upload_evidence" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied. 'manage_frameworks' or framework configuration access required."
        )

    raw_ids = data.get("framework_ids", [])
    if not isinstance(raw_ids, list):
        raise HTTPException(status_code=400, detail="framework_ids must be a list of framework IDs.")

    framework_ids = [int(fid) for fid in raw_ids if str(fid).isdigit()]

    # Validate that requested frameworks exist and are active in PostgreSQL
    valid_frameworks = db.query(Framework).filter(
        Framework.id.in_(framework_ids),
        Framework.is_active == True
    ).all() if framework_ids else []

    valid_fw_ids = {f.id for f in valid_frameworks}

    # Fetch existing organization_frameworks for this org
    existing_ofws = db.query(OrganizationFramework).filter(
        OrganizationFramework.organization_id == current_user.organization_id
    ).all()

    existing_map = {ofw.framework_id: ofw for ofw in existing_ofws}

    # Mark selected as active
    for fw in valid_frameworks:
        latest_ver = db.query(FrameworkVersion).filter(
            FrameworkVersion.framework_id == fw.id
        ).order_by(FrameworkVersion.id.desc()).first()

        if fw.id in existing_map:
            existing_map[fw.id].status = "active"
            if latest_ver:
                existing_map[fw.id].framework_version_id = latest_ver.id
        else:
            new_ofw = OrganizationFramework(
                organization_id=current_user.organization_id,
                framework_id=fw.id,
                framework_version_id=latest_ver.id if latest_ver else None,
                status="active"
            )
            db.add(new_ofw)

    # Deactivate any unselected frameworks
    for fw_id, ofw in existing_map.items():
        if fw_id not in valid_fw_ids:
            ofw.status = "inactive"

    db.commit()

    return get_organization_frameworks(db=db, current_user=current_user)


@router.get("/organization-controls")
def get_organization_controls(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch all controls for the frameworks currently selected by the authenticated organization.
    """
    active_ofws = db.query(OrganizationFramework).filter(
        OrganizationFramework.organization_id == current_user.organization_id,
        OrganizationFramework.status == "active"
    ).all()

    if not active_ofws:
        return []

    active_fw_ids = [ofw.framework_id for ofw in active_ofws]

    controls = (
        db.query(Control, FrameworkVersion, Framework)
        .join(FrameworkVersion, Control.framework_version_id == FrameworkVersion.id)
        .join(Framework, FrameworkVersion.framework_id == Framework.id)
        .filter(
            Framework.id.in_(active_fw_ids),
            Framework.is_active == True,
            Control.is_active == True
        )
        .order_by(Framework.name.asc(), Control.control_code.asc())
        .all()
    )

    results = []
    for ctrl, ver, fw in controls:
        results.append({
            "id": ctrl.id,
            "framework_version_id": ctrl.framework_version_id,
            "control_code": ctrl.control_code,
            "title": ctrl.title,
            "category": ctrl.category or "General",
            "requirement": ctrl.requirement or ctrl.description or ctrl.title,
            "description": ctrl.description or ctrl.title,
            "source_reference": ctrl.source_reference or ctrl.control_code,
            "guidance": ctrl.guidance or "",
            "framework_id": fw.id,
            "framework_name": fw.name,
            "framework_code": fw.code,
            "framework_version": ver.version if ver else "1.0",
            "is_active": ctrl.is_active
        })

    return results


@router.post("/organization-frameworks/toggle")
def toggle_organization_framework(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enroll or unenroll an organization in a compliance framework (Super Admin only)."""
    from app.core.dependencies import is_super_admin
    if not is_super_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Permission denied: Platform Super Admin role required to toggle global framework enrollment."
        )

    framework_id = data.get("framework_id")
    active = data.get("active", True)

    framework = db.query(Framework).filter(Framework.id == framework_id).first()
    if not framework:
        raise HTTPException(status_code=404, detail="Framework not found")

    ofw = db.query(OrganizationFramework).filter(
        OrganizationFramework.organization_id == current_user.organization_id,
        OrganizationFramework.framework_id == framework_id
    ).first()

    if active:
        if not ofw:
            ver = db.query(FrameworkVersion).filter(FrameworkVersion.framework_id == framework_id).first()
            ofw = OrganizationFramework(
                organization_id=current_user.organization_id,
                framework_id=framework_id,
                framework_version_id=ver.id if ver else framework_id,
                status="active"
            )
            db.add(ofw)
        else:
            ofw.status = "active"
        status_str = "enrolled"
    else:
        if ofw:
            ofw.status = "inactive"
        status_str = "deactivated"

    db.commit()

    return {
        "message": f"Framework {framework.name} is now {status_str}.",
        "framework": framework.name,
        "status": status_str
    }


@router.post("/evaluate-control")
def evaluate_control(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run real RAG evaluation for a single control against organization evidence with persistence."""
    perms = get_user_effective_permissions(current_user, db)
    from app.core.dependencies import is_super_admin
    if not is_super_admin(current_user) and "run_ai_analysis" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'run_ai_analysis' required"
        )

    control_id = data.get("control_id")
    control = db.query(Control).filter(Control.id == control_id).first()
    if not control:
        raise HTTPException(status_code=404, detail="Control not found")

    version = db.query(FrameworkVersion).filter(FrameworkVersion.id == control.framework_version_id).first()
    framework = db.query(Framework).filter(Framework.id == version.framework_id).first() if version else None
    if not framework:
        framework = Framework(name="Compliance Standard", code="COMPLIANCE")

    # 1. Record AIRun for this single control execution
    ai_run = AIRun(
        organization_id=current_user.organization_id,
        triggered_by=current_user.id,
        run_type="control_evaluation",
        status="running",
        model_name=settings.ollama_model,
        started_at=datetime.now(timezone.utc)
    )
    db.add(ai_run)
    db.commit()
    db.refresh(ai_run)

    try:
        result = execute_rag_for_control(
            db=db,
            organization_id=current_user.organization_id,
            control=control,
            framework=framework
        )

        req_evals = []
        for req in (result.requirements_evaluations or []):
            if hasattr(req, "dict"):
                req_evals.append(req.dict())
            elif hasattr(req, "model_dump"):
                req_evals.append(req.model_dump())
            elif isinstance(req, dict):
                req_evals.append(req)

        # 2. Synchronize Gap Analysis
        has_contra = bool(getattr(result, "has_contradictions", False))
        gap_rec = sync_control_gap_analysis(
            db=db,
            organization_id=current_user.organization_id,
            control_id=control.id,
            status=result.assessment_status,
            explanation=result.reasoning or result.explanation,
            gaps=result.missing_requirements or result.gaps,
            recommendations=result.recommendations,
            control=control,
            has_contradictions=has_contra,
            coverage_score=result.coverage_score,
            requirements=result.requirements_evaluations
        )

        # 3. Persist AI Output
        output_payload = {
            "control_id": control.id,
            "control_code": control.control_code,
            "title": control.title,
            "assessment_status": result.assessment_status,
            "compliance_status": result.assessment_status,
            "coverage_score": result.coverage_score,
            "confidence": result.confidence,
            "confidence_score": result.confidence,
            "confidence_method": result.confidence_method,
            "reasoning": result.reasoning,
            "explanation": result.explanation,
            "supporting_evidence": result.supporting_evidence,
            "missing_requirements": result.missing_requirements,
            "gaps": result.gaps,
            "gap_severity": gap_rec.severity if gap_rec else None,
            "severity_reason": gap_rec.severity_reason if gap_rec else None,
            "recommendations": result.recommendations,
            "citations": result.citations,
            "evidence_chunk_ids": result.evidence_chunk_ids,
            "requirements_evaluations": req_evals
        }

        ai_output = AIOutput(
            ai_run_id=ai_run.id,
            control_id=control.id,
            output_type="control_assessment",
            content=json.dumps(output_payload)
        )
        db.add(ai_output)

        # 4. Update any existing mappings for this control
        existing_mappings = (
            db.query(EvidenceControlMapping)
            .join(Evidence, EvidenceControlMapping.evidence_id == Evidence.id)
            .filter(
                Evidence.organization_id == current_user.organization_id,
                EvidenceControlMapping.control_id == control.id
            ).all()
        )
        for em in existing_mappings:
            em.coverage_score = result.coverage_score
            em.confidence_score = result.confidence

        ai_run.status = "completed"
        ai_run.completed_at = datetime.now(timezone.utc)
        db.commit()

        return {
            "ai_run_id": ai_run.id,
            "control_id": control.id,
            "control_code": control.control_code,
            "title": control.title,
            "assessment_status": result.assessment_status,
            "status": result.assessment_status,
            "coverage_score": result.coverage_score,
            "confidence": result.confidence,
            "confidence_method": result.confidence_method,
            "reasoning": result.reasoning,
            "explanation": result.explanation,
            "supporting_evidence": result.supporting_evidence,
            "missing_requirements": result.missing_requirements,
            "gaps": result.gaps,
            "gap_severity": gap_rec.severity if gap_rec else None,
            "severity_reason": gap_rec.severity_reason if gap_rec else None,
            "recommendations": result.recommendations,
            "citations": result.citations,
            "evidence_chunk_ids": result.evidence_chunk_ids,
            "requirements_evaluations": req_evals
        }

    except Exception as err:
        db.rollback()
        ai_run.status = "failed"
        ai_run.error_message = str(err)
        ai_run.completed_at = datetime.now(timezone.utc)
        db.commit()
        logger.error(f"Failed evaluation for control {control.control_code}: {err}")
        raise HTTPException(
            status_code=500,
            detail=f"Control evaluation failed via AI engine: {str(err)}"
        )


@router.post("/compare-framework")
def compare_framework(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run compliance assessment across all controls in a real framework."""
    framework_code_or_id = data.get("framework_code_or_id")
    
    if isinstance(framework_code_or_id, int) or (isinstance(framework_code_or_id, str) and framework_code_or_id.isdigit()):
        framework = db.query(Framework).filter(Framework.id == int(framework_code_or_id)).first()
    else:
        framework = db.query(Framework).filter(
            Framework.code.ilike(str(framework_code_or_id).replace("-", "_"))
        ).first()

    if not framework:
        raise HTTPException(status_code=404, detail="Framework not found in database.")

    versions = db.query(FrameworkVersion).filter(FrameworkVersion.framework_id == framework.id).all()
    version_ids = [v.id for v in versions]
    controls = db.query(Control).filter(Control.framework_version_id.in_(version_ids)).all() if version_ids else []

    if not controls:
        return {
            "framework_name": framework.name,
            "framework_code": framework.code,
            "total_controls": 0,
            "evaluated_controls": 0,
            "compliance_score": 0,
            "results": [],
            "message": "No controls currently uploaded for this framework."
        }

    # Evaluate each real control
    evaluations = []
    compliant_count = 0

    for ctrl in controls:
        rag_res = execute_rag_for_control(
            db=db,
            organization_id=current_user.organization_id,
            control=ctrl,
            framework=framework
        )
        if rag_res.status == "COMPLIANT":
            compliant_count += 1
        evaluations.append({
            "control_id": ctrl.id,
            "control_code": ctrl.control_code,
            "title": ctrl.title,
            "category": ctrl.category or "General",
            "status": rag_res.status,
            "confidence": rag_res.confidence,
            "explanation": rag_res.explanation,
            "gaps": rag_res.gaps,
            "recommendations": rag_res.recommendations,
            "citations": rag_res.citations
        })

    score = round((compliant_count / len(controls)) * 100) if controls else 0

    return {
        "framework_name": framework.name,
        "framework_code": framework.code,
        "total_controls": len(controls),
        "evaluated_controls": len(evaluations),
        "compliance_score": score,
        "results": evaluations
    }


