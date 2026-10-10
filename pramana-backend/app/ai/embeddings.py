import os
from langchain_community.embeddings import OllamaEmbeddings
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")

def get_embeddings_model():
    """
    Returns the Ollama embeddings model configured via environment variables.
    """
    return OllamaEmbeddings(
        base_url=OLLAMA_BASE_URL,
        model=EMBEDDING_MODEL
    )

def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generates embeddings for a list of text chunks.
    """
    if not texts:
        return []
    
    embeddings_model = get_embeddings_model()
    return embeddings_model.embed_documents(texts)

def generate_embedding(text: str) -> list[float]:
    """
    Generates a single embedding for a text chunk (e.g. search query).
    """
    embeddings_model = get_embeddings_model()
    return embeddings_model.embed_query(text)
