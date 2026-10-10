from sqlalchemy.orm import Session
from app.ai.retrieval import retrieve_relevant_chunks
from app.ai.prompts import get_compliance_prompt
from app.ai.llm import get_llm, parse_llm_response, AssessmentResult
from app.models.control import Control
from app.models.framework import Framework

def execute_rag_for_control(
    db: Session,
    organization_id: int,
    control: Control,
    framework: Framework
) -> AssessmentResult:
    """
    Executes the RAG pipeline to evaluate a control using organization evidence.
    """
    query = f"{control.control_code} {control.title} {control.description}"
    
    # 1. Retrieve chunks
    retrieved_results = retrieve_relevant_chunks(db, query, organization_id, top_k=5)
    
    if not retrieved_results:
        return AssessmentResult(
            status="INSUFFICIENT_EVIDENCE",
            confidence=0.0,
            explanation="No relevant evidence documents found in the organization's vector store.",
            gaps=["No evidence documents available for this control."],
            recommendations=["Upload relevant compliance documents."],
            citations=[]
        )

    # 2. Build Evidence Context
    evidence_context_parts = []
    citations = []
    
    for chunk, evidence in retrieved_results:
        source_name = f"{evidence.file_name} (Chunk {chunk.chunk_index})"
        evidence_context_parts.append(f"SOURCE: {source_name}\nCONTENT: {chunk.content}\n")
        citations.append(source_name)
        
    evidence_context = "\n".join(evidence_context_parts)

    # 3. Build Prompt
    prompt = get_compliance_prompt()
    formatted_prompt = prompt.format(
        framework_name=framework.name,
        control_code=control.control_code,
        control_title=control.title,
        control_description=control.description,
        evidence_context=evidence_context
    )

    # 4. Call LLM
    llm = get_llm()
    response = llm.invoke(formatted_prompt)

    # 5. Parse structured output
    result = parse_llm_response(response.content)
    
    # Merge real citations back into the result to prevent hallucinations
    result.citations = list(set(citations))
    
    return result
