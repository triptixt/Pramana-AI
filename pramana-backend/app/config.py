import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Pramana API"
    app_version: str = "1.0.0"
    debug: bool = True

    # Database
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:1234567890@127.0.0.1:5432/pramana"
    )

    # Security & JWT
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "pramana-super-secret-key-2026")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_access_token_expire_minutes: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # Ollama & AI Configuration
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
    embedding_dimension: int = 768

    # Ingestion & Chunking
    default_chunk_size: int = 1000
    default_chunk_overlap: int = 200
    max_upload_size_bytes: int = 50 * 1024 * 1024  # 50 MB

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

