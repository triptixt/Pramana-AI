import os
import json
from pydantic import BaseModel, Field
from typing import List
try:
    from langchain_community.chat_models import ChatOllama
except ImportError:
    try:
        from langchain_ollama import ChatOllama
    except ImportError:
        ChatOllama = None

from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwn2.5:7b")

class AssessmentResult(BaseModel):
    status: str = Field(description="One of: COMPLIANT, PARTIALLY_COMPLIANT, NON_COMPLIANT, INSUFFICIENT_EVIDENCE")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")
    explanation: str = Field(description="Detailed explanation based on evidence")
    gaps: List[str] = Field(default_factory=list, description="Missing evidence or gaps")
    recommendations: List[str] = Field(default_factory=list, description="Actionable recommendations")
    citations: List[str] = Field(default_factory=list, description="Sources cited")

def get_llm():
    """
    Initializes and returns the ChatOllama model.
    """
    if ChatOllama is None:
        raise RuntimeError("ChatOllama is not installed. Please install langchain-community or langchain-ollama.")
    return ChatOllama(
        base_url=OLLAMA_BASE_URL,
        model=OLLAMA_MODEL,
        temperature=0.0
    )

def parse_llm_response(response_text: str) -> AssessmentResult:
    """
    Parses the JSON response from the LLM into a structured Pydantic model.
    """
    try:
        # Simple extraction in case LLM wraps response in ```json ... ```
        clean_text = response_text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        
        data = json.loads(clean_text.strip())
        return AssessmentResult(**data)
    except Exception as e:
        # Fallback for invalid output
        return AssessmentResult(
            status="INSUFFICIENT_EVIDENCE",
            confidence=0.0,
            explanation=f"Failed to parse LLM response: {str(e)}",
            gaps=[],
            recommendations=[],
            citations=[]
        )
