"""
Response models for RAG API endpoints
"""

from typing import List, Optional, Literal
from uuid import UUID
from pydantic import BaseModel, Field


class ChunkResult(BaseModel):
    """
    Single chunk result from search
    """

    id: UUID = Field(..., description="Chunk UUID")
    document_id: UUID = Field(..., description="Parent document UUID")
    document_name: str = Field(..., description="Document name")
    chunk_index: int = Field(..., description="Chunk position in document")
    page: Optional[int] = Field(None, description="Page number if available")
    content: str = Field(..., description="Chunk text content")
    score: float = Field(..., description="Relevance score (0-1)")
    score_type: Literal["fused", "vector", "bm25", "rerank"] = Field(
        ..., description="Type of score"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174002",
                "document_id": "123e4567-e89b-12d3-a456-426614174000",
                "document_name": "Project Charter.pdf",
                "chunk_index": 5,
                "page": 2,
                "content": "The key project risks include...",
                "score": 0.87,
                "score_type": "fused",
            }
        }


class SearchResponse(BaseModel):
    """
    Response from hybrid search
    """

    results: List[ChunkResult] = Field(..., description="Ranked chunk results")
    total_searched: int = Field(
        ..., description="Total chunks considered in search"
    )
    rerank_applied: bool = Field(..., description="Whether reranking was applied")
    query_embedding_time_ms: float = Field(
        ..., description="Time to generate query embedding"
    )
    search_time_ms: float = Field(..., description="Time for database search")
    total_time_ms: float = Field(..., description="Total processing time")

    class Config:
        json_schema_extra = {
            "example": {
                "results": [
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174002",
                        "document_id": "123e4567-e89b-12d3-a456-426614174000",
                        "document_name": "Project Charter.pdf",
                        "chunk_index": 5,
                        "page": 2,
                        "content": "The key project risks include...",
                        "score": 0.87,
                        "score_type": "fused",
                    }
                ],
                "total_searched": 100,
                "rerank_applied": True,
                "query_embedding_time_ms": 45.2,
                "search_time_ms": 123.4,
                "total_time_ms": 168.6,
            }
        }


class IngestStatus(BaseModel):
    """
    Status response for document ingestion
    """

    document_id: UUID = Field(..., description="Document UUID")
    tenant_id: UUID = Field(..., description="Tenant UUID")
    status: Literal["queued", "processing", "completed", "failed"] = Field(
        ..., description="Ingestion status"
    )
    total_chunks: int = Field(..., description="Total chunks created")
    embedded_chunks: int = Field(..., description="Chunks with embeddings")
    skipped_chunks: int = Field(
        default=0, description="Chunks skipped due to dedup"
    )
    error_message: Optional[str] = Field(None, description="Error if failed")
    processing_time_ms: Optional[float] = Field(
        None, description="Total processing time"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "document_id": "123e4567-e89b-12d3-a456-426614174000",
                "tenant_id": "123e4567-e89b-12d3-a456-426614174001",
                "status": "completed",
                "total_chunks": 42,
                "embedded_chunks": 42,
                "skipped_chunks": 3,
                "error_message": None,
                "processing_time_ms": 2341.5,
            }
        }


class DeleteResponse(BaseModel):
    """
    Response for chunk deletion
    """

    success: bool = Field(..., description="Whether deletion succeeded")
    chunks_deleted: int = Field(..., description="Number of chunks deleted")
    error_message: Optional[str] = Field(None, description="Error if failed")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "chunks_deleted": 42,
                "error_message": None,
            }
        }


class FinancialAnalysisResponse(BaseModel):
    """
    Response from financial document analysis
    """

    analysis_id: UUID = Field(..., description="Analysis record UUID")
    status: Literal["pending", "processing", "completed", "review", "failed"] = Field(
        ..., description="Analysis status"
    )
    needs_review: bool = Field(
        ..., description="Whether results need human review (low confidence)"
    )
    processing_time_ms: Optional[int] = Field(
        None, description="Processing time in milliseconds"
    )
    error_message: Optional[str] = Field(None, description="Error message if failed")

    class Config:
        json_schema_extra = {
            "example": {
                "analysis_id": "123e4567-e89b-12d3-a456-426614174003",
                "status": "review",
                "needs_review": True,
                "processing_time_ms": 4523,
                "error_message": None,
            }
        }
