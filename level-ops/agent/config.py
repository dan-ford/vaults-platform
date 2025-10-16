"""
Configuration for RAG document processing
"""

from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    """
    RAG system configuration using environment variables
    """

    # OpenAI API
    OPENAI_API_KEY: str
    OPENAI_EMBED_MODEL: str = "text-embedding-3-small"
    OPENAI_EMBED_DIMENSIONS: int = 1536

    # Supabase connection
    NEXT_PUBLIC_SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str  # Server-side only, bypasses RLS when needed

    # Chunking parameters
    CHUNK_SIZE: int = 900  # Characters per chunk
    CHUNK_OVERLAP: int = 120  # Overlap between chunks
    MIN_CHUNK_SIZE: int = 100  # Minimum viable chunk size

    # Hybrid search fusion weights (must sum to 1.0)
    FUSION_WEIGHT_VECTOR: float = 0.65
    FUSION_WEIGHT_BM25: float = 0.35

    # Retrieval top-k values
    TOP_K_PRE: int = 100  # Initial hybrid search results
    TOP_K_MMR: int = 15  # After MMR diversification
    TOP_K_FINAL: int = 5  # Final results to return

    # MMR diversification
    MMR_LAMBDA: float = 0.6  # Balance between relevance (1.0) and diversity (0.0)

    # Neighbor windowing
    NEIGHBOR_WINDOW_BEFORE: int = 1
    NEIGHBOR_WINDOW_AFTER: int = 1
    NEIGHBOR_DECAY_FACTOR: float = 0.85

    # Reranking (disabled by default until sentence-transformers is installed)
    RERANK_ENABLED: bool = False
    RERANK_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    RERANK_TOP_K: int = 15  # Candidates to rerank
    RERANK_BATCH_SIZE: int = 32

    # Embedding dedup cache
    ENABLE_DEDUP_CACHE: bool = True

    # Rate limiting
    MAX_CONCURRENT_EMBEDDINGS: int = 5
    EMBEDDING_RATE_LIMIT_PER_MIN: int = 500

    # Logging
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    class Config:
        env_file = ".env.local"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Ignore extra env vars not defined in Settings


# Global settings instance
settings = Settings()
