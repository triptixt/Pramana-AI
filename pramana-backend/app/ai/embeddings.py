import logging
from typing import List

try:
    from langchain_ollama import OllamaEmbeddings
except ImportError:
        OllamaEmbeddings = None

from app.config import settings

logger = logging.getLogger("pramana.ai.embeddings")

if OllamaEmbeddings is None:
    logger.warning(
        "langchain-ollama is not installed. "
        "Ollama embeddings will be unavailable."
    )


class EmbeddingError(Exception):
    """Base exception for embedding generation failures."""
    pass


class EmbeddingServiceUnavailableError(EmbeddingError):
    """Raised when Ollama is unreachable or model is missing."""
    pass


class EmbeddingDimensionMismatchError(EmbeddingError):
    """Raised when generated vector dimensions do not match the PostgreSQL schema."""
    pass


def get_embeddings_model(timeout: float = 60.0):
    """
    Returns the Ollama embeddings model configured via central application settings
    with explicit connection timeout and validation.
    """
    if OllamaEmbeddings is None:
        raise EmbeddingServiceUnavailableError(
            "OllamaEmbeddings is not installed. Please install langchain-ollama."
        )
    return OllamaEmbeddings(
        base_url=settings.ollama_base_url,
        model=settings.embedding_model,
        client_kwargs={"timeout": timeout}
    )


def validate_embedding_vector(vector: List[float], source_text: str = "") -> None:
    """
    Validates that a generated embedding is non-empty, contains valid floats,
    and matches the configured pgvector dimension (768).
    """
    if not vector or not isinstance(vector, list):
        raise EmbeddingError(f"Embedding generator returned an empty or invalid vector structure for text: '{source_text[:60]}'")

    expected_dim = settings.embedding_dimension
    actual_dim = len(vector)
    if actual_dim != expected_dim:
        raise EmbeddingDimensionMismatchError(
            f"Generated embedding vector dimension {actual_dim} does not match configured pgvector dimension {expected_dim} "
            f"for model '{settings.embedding_model}'."
        )


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generates and validates embeddings for a list of text chunks.
    Raises EmbeddingServiceUnavailableError if Ollama cannot be reached.
    Raises EmbeddingDimensionMismatchError if dimension mismatch occurs.
    """
    if not texts:
        return []

    import time
    t0 = time.time()
    try:
        model = get_embeddings_model()
        vectors = model.embed_documents(texts)
    except Exception as e:
        err_msg = str(e)
        logger.error(f"[Embeddings] Failed generating {len(texts)} embeddings via Ollama ({settings.ollama_base_url}): {err_msg}")
        raise EmbeddingServiceUnavailableError(
            f"Failed to generate embeddings via Ollama at {settings.ollama_base_url}. "
            f"Ensure Ollama is running and model '{settings.embedding_model}' is installed. Root cause: {err_msg}"
        )

    duration = round(time.time() - t0, 3)

    if len(vectors) != len(texts):
        raise EmbeddingError(
            f"Embeddings count mismatch: generated {len(vectors)} vectors for {len(texts)} input texts."
        )

    for idx, (vec, txt) in enumerate(zip(vectors, texts)):
        validate_embedding_vector(vec, txt)

    logger.info(
        f"[Embeddings] Generated {len(vectors)} embeddings (dim={len(vectors[0]) if vectors else 0}) "
        f"in {duration}s using '{settings.embedding_model}'."
    )
    return vectors


def generate_embedding(text: str) -> List[float]:
    """
    Generates and validates a single embedding vector for a query string.
    """
    if not text or not text.strip():
        raise EmbeddingError("Cannot generate embedding for empty query text.")

    import time
    t0 = time.time()
    try:
        model = get_embeddings_model()
        vector = model.embed_query(text)
    except Exception as e:
        err_msg = str(e)
        logger.error(f"[Embeddings] Failed generating query embedding via Ollama ({settings.ollama_base_url}): {err_msg}")
        raise EmbeddingServiceUnavailableError(
            f"Failed to generate query embedding via Ollama at {settings.ollama_base_url}. "
            f"Ensure Ollama is running and model '{settings.embedding_model}' is installed. Root cause: {err_msg}"
        )

    duration = round(time.time() - t0, 3)
    validate_embedding_vector(vector, text)
    logger.debug(f"[Embeddings] Generated query embedding (dim={len(vector)}) in {duration}s.")
    return vector
