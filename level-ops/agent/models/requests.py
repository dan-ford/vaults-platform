"""
Request models for RAG API endpoints
"""

from typing import Literal, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class IngestDocumentRequest(BaseModel):
    """
    Request to ingest and chunk a document
    """

    document_id: UUID = Field(..., description="UUID of the document to process")
    tenant_id: UUID = Field(..., description="Tenant UUID for RLS scoping (deprecated, use org_id)")
    org_id: Optional[UUID] = Field(None, description="Organization UUID for RLS scoping (preferred)")
    priority: Literal["high", "normal", "low"] = Field(
        default="normal", description="Processing priority"
    )
    force_reembed: bool = Field(
        default=False,
        description="Force re-embedding even if content hash exists",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "document_id": "123e4567-e89b-12d3-a456-426614174000",
                "org_id": "123e4567-e89b-12d3-a456-426614174001",
                "priority": "normal",
                "force_reembed": False,
            }
        }


class SearchRequest(BaseModel):
    """
    Request for hybrid search across document chunks
    """

    query: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Search query string",
    )
    tenant_id: UUID = Field(..., description="Tenant UUID for RLS scoping (deprecated, use org_id)")
    org_id: Optional[UUID] = Field(None, description="Organization UUID for RLS scoping (preferred)")
    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of top results to return",
    )
    enable_rerank: bool = Field(
        default=True,
        description="Enable cross-encoder reranking",
    )
    include_neighbors: bool = Field(
        default=True,
        description="Include ±1 neighbor chunks for context",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "query": "What are the key risks in this project?",
                "org_id": "123e4567-e89b-12d3-a456-426614174001",
                "top_k": 5,
                "enable_rerank": True,
                "include_neighbors": True,
            }
        }


class DeleteChunksRequest(BaseModel):
    """
    Request to delete all chunks for a document (for re-embedding)
    """

    document_id: UUID = Field(..., description="UUID of the document")
    tenant_id: UUID = Field(..., description="Tenant UUID for RLS scoping (deprecated, use org_id)")
    org_id: Optional[UUID] = Field(None, description="Organization UUID for RLS scoping (preferred)")

    class Config:
        json_schema_extra = {
            "example": {
                "document_id": "123e4567-e89b-12d3-a456-426614174000",
                "org_id": "123e4567-e89b-12d3-a456-426614174001",
            }
        }
