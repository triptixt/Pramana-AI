from langchain_core.prompts import PromptTemplate

COMPLIANCE_ANALYSIS_PROMPT = """
You are an expert compliance analyst.
Your task is to evaluate whether the provided evidence satisfies the given control requirement.

FRAMEWORK: {framework_name}
CONTROL ID: {control_code}
CONTROL TITLE: {control_title}
CONTROL REQUIREMENT: {control_description}

EVIDENCE:
{evidence_context}

INSTRUCTIONS:
1. ONLY use the provided evidence. Do not invent evidence or make assumptions.
2. If the evidence does not clearly satisfy the control, mark it as INSUFFICIENT_EVIDENCE or NON_COMPLIANT.
3. Clearly distinguish evidence from inference.
4. Provide a step-by-step explanation.
5. Identify any missing evidence (gaps).
6. Provide actionable recommendations.
7. You must respond in valid JSON format ONLY. Do not include markdown formatting or extra text outside the JSON.

Expected JSON Structure:
{{
  "status": "COMPLIANT | PARTIALLY_COMPLIANT | NON_COMPLIANT | INSUFFICIENT_EVIDENCE",
  "confidence": <float between 0.0 and 1.0>,
  "explanation": "<detailed explanation of your findings based on evidence>",
  "gaps": ["<gap 1>", "<gap 2>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>"],
  "citations": ["<source 1>", "<source 2>"]
}}
"""

def get_compliance_prompt():
    return PromptTemplate(
        input_variables=[
            "framework_name",
            "control_code",
            "control_title",
            "control_description",
            "evidence_context"
        ],
        template=COMPLIANCE_ANALYSIS_PROMPT
    )
