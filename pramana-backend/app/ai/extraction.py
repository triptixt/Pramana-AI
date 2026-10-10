import os
import PyPDF2
import docx

def extract_text(file_path: str, file_type: str) -> str:
    """
    Extracts text from various file formats.
    Returns a single string of the extracted text.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    text = ""
    file_type = file_type.lower()

    if file_type == "pdf":
        with open(file_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
    elif file_type in ["doc", "docx"]:
        doc = docx.Document(file_path)
        for para in doc.paragraphs:
            text += para.text + "\n"
    elif file_type == "txt":
        with open(file_path, "r", encoding="utf-8") as file:
            text = file.read()
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

    return text.strip()
