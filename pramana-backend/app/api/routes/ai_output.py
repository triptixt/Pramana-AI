from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.ai_output import AIOutput
from app.schemas.ai_output import (
    AIOutputCreate,
    AIOutputResponse
)

router = APIRouter(
    prefix="/ai-outputs",
    tags=["AI Outputs"]
)


@router.post("/", response_model=AIOutputResponse)
def create_ai_output(
    output: AIOutputCreate,
    db: Session = Depends(get_db)
):
    new_output = AIOutput(
        ai_run_id=output.ai_run_id,
        output_type=output.output_type,
        content=output.content
    )

    db.add(new_output)
    db.commit()
    db.refresh(new_output)

    return new_output


@router.get("/", response_model=list[AIOutputResponse])
def get_ai_outputs(db: Session = Depends(get_db)):
    return db.query(AIOutput).all()


@router.get("/{output_id}", response_model=AIOutputResponse)
def get_ai_output(
    output_id: int,
    db: Session = Depends(get_db)
):
    output = db.query(AIOutput).filter(
        AIOutput.id == output_id
    ).first()

    if not output:
        raise HTTPException(
            status_code=404,
            detail="AI Output not found"
        )

    return output


@router.delete("/{output_id}")
def delete_ai_output(
    output_id: int,
    db: Session = Depends(get_db)
):
    output = db.query(AIOutput).filter(
        AIOutput.id == output_id
    ).first()

    if not output:
        raise HTTPException(
            status_code=404,
            detail="AI Output not found"
        )

    db.delete(output)
    db.commit()

    return {
        "message": "AI Output deleted successfully"
    }