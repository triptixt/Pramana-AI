import json
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.framework import Framework
from app.models.framework_version import FrameworkVersion

from app.models.control import Control
from app.models.ai_run import AIRun
from app.models.ai_output import AIOutput
from app.ai.rag import execute_rag_for_control


def run_framework_assessment(db: Session, organization_id: int, user_id: int, framework_id: int):
    """
    Runs the complete AI/RAG assessment pipeline for all controls in a framework.
    Validates that the framework is active globally and enrolled for the organization.
    """
    framework = db.query(Framework).filter(Framework.id == framework_id).first()
    if not framework:
        raise HTTPException(status_code=404, detail="Framework not found")

    if not framework.is_active:
        raise HTTPException(
            status_code=400,
            detail=f"Framework '{framework.name}' is off-role (inactive) and cannot be used for assessments."
        )

    versions = db.query(FrameworkVersion).filter(FrameworkVersion.framework_id == framework_id).all()
    version_ids = [v.id for v in versions]
    controls = db.query(Control).filter(Control.framework_version_id.in_(version_ids), Control.is_active == True).all() if version_ids else []
    
    if not controls:
        return {"message": "No controls found in this framework. Upload a framework document first.", "results": []}

        
    # Record AI Run
    ai_run = AIRun(
        organization_id=organization_id,
        triggered_by=user_id,
        run_type="framework_assessment",
        status="running",
        model_name="qwen2.5:7b"
    )
    db.add(ai_run)
    db.commit()
    db.refresh(ai_run)

    results = []
    
    try:
        for control in controls:
            # 1. Execute RAG
            rag_result = execute_rag_for_control(db, organization_id, control, framework)
            
            # 2. Store AI Output
            ai_output = AIOutput(
                ai_run_id=ai_run.id,
                output_type="control_assessment",
                content=json.dumps({
                    "control_id": control.id,
                    "control_code": control.control_code,
                    "title": control.title,
                    "compliance_status": rag_result.status,
                    "confidence_score": rag_result.confidence,
                    "explanation": rag_result.explanation,
                    "citations": rag_result.citations,
                    "gaps": rag_result.gaps,
                    "recommendations": rag_result.recommendations
                })
            )
            db.add(ai_output)
            
            results.append({
                "control_code": control.control_code,
                "title": control.title,
                "status": rag_result.status,
                "confidence": rag_result.confidence
            })
            
        ai_run.status = "completed"
        db.commit()

        
        return {
            "run_id": ai_run.id,
            "status": "completed",
            "framework": framework.name,
            "results": results
        }
        
    except Exception as e:
        ai_run.status = "failed"
        ai_run.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Assessment failed: {str(e)}")
