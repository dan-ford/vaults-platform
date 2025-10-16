"""
Document processor: chunking, embedding, and storage
"""

import time
from typing import List, Dict, Optional
from uuid import UUID
from supabase import create_client, Client
from langchain.text_splitter import RecursiveCharacterTextSplitter

from config import settings
from models import IngestStatus
from services.embedder import EmbeddingService
from services.pdf_extractor import PDFExtractor


class DocumentProcessor:
    """
    Process documents: extract, chunk, embed, and store
    """

    def __init__(self):
        self.supabase: Client = create_client(
            settings.NEXT_PUBLIC_SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY,  # Service role for server-side ops
        )
        self.embedder = EmbeddingService()
        self.pdf_extractor = PDFExtractor()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    async def process_document(
        self, document_id: str, tenant_id: str, force_reembed: bool = False
    ) -> IngestStatus:
        """
        Main processing pipeline:
        1. Fetch document content
        2. Chunk text
        3. Generate embeddings with dedup
        4. Store chunks with metadata
        """
        start_time = time.time()

        try:
            # Fetch document (support both org_id and tenant_id for backward compat)
            doc_response = (
                self.supabase.table("documents")
                .select("id, name, text_content, tenant_id, org_id, mime_type, file_path")
                .eq("id", document_id)
                .or_(f"tenant_id.eq.{tenant_id},org_id.eq.{tenant_id}")
                .single()
                .execute()
            )

            if not doc_response.data:
                return IngestStatus(
                    document_id=UUID(document_id),
                    tenant_id=UUID(tenant_id),
                    status="failed",
                    total_chunks=0,
                    embedded_chunks=0,
                    error_message="Document not found",
                )

            document = doc_response.data
            text_content = document.get("text_content", "")

            print(f"Document text_content length: {len(text_content) if text_content else 0}")
            print(f"Document mime_type: {document.get('mime_type')}")
            print(f"Text preview: {text_content[:100] if text_content else 'None'}")

            # Check if text_content is placeholder/invalid
            is_placeholder = (
                not text_content or
                "Text extraction temporarily unavailable" in text_content or
                len(text_content.strip()) < 50  # Very short content is likely invalid
            )

            print(f"Is placeholder: {is_placeholder}")

            # If no text content or placeholder, try to extract from PDF
            if is_placeholder and document.get("mime_type") == "application/pdf":
                try:
                    file_path = document.get("file_path")
                    print(f"Attempting PDF extraction from: {file_path}")
                    if file_path:
                        # Download PDF from storage
                        print(f"Downloading PDF from storage...")
                        pdf_response = self.supabase.storage.from_("documents").download(file_path)
                        print(f"Downloaded {len(pdf_response)} bytes")

                        if pdf_response:
                            print("Extracting text with PyMuPDF...")
                            text_content = self.pdf_extractor.extract_text_from_bytes(pdf_response)
                            print(f"Extracted {len(text_content)} characters of text")

                            # Update document with extracted text
                            print("Updating document with extracted text...")
                            self.supabase.table("documents").update({
                                "text_content": text_content
                            }).eq("id", document_id).execute()
                            print("Document updated successfully")
                except Exception as pdf_error:
                    import traceback
                    print(f"PDF extraction failed: {pdf_error}")
                    print(traceback.format_exc())
                    # Continue anyway - will fail below if still no text

            if not text_content:
                return IngestStatus(
                    document_id=UUID(document_id),
                    tenant_id=UUID(tenant_id),
                    status="failed",
                    total_chunks=0,
                    embedded_chunks=0,
                    error_message="Document has no text content and PDF extraction failed",
                )

            # Delete existing chunks if force_reembed
            if force_reembed:
                self.supabase.table("document_chunks").delete().eq(
                    "document_id", document_id
                ).eq("tenant_id", tenant_id).execute()

            # Chunk the document
            chunks = self._chunk_text(text_content)

            # Process chunks with deduplication
            chunk_records = []
            skipped_count = 0

            for idx, chunk_text in enumerate(chunks):
                # Generate embedding with metadata
                embed_data = await self.embedder.embed_with_metadata(chunk_text)

                # Check for existing chunk by hash (dedup)
                if not force_reembed and settings.ENABLE_DEDUP_CACHE:
                    existing = (
                        self.supabase.table("document_chunks")
                        .select("id, embedding")
                        .eq("org_id", tenant_id)  # tenant_id param is actually org_id
                        .eq("content_sha256", embed_data["content_sha256"])
                        .limit(1)
                        .execute()
                    )

                    if existing.data and existing.data[0].get("embedding"):
                        # Reuse existing embedding
                        embed_data["embedding"] = existing.data[0]["embedding"]
                        skipped_count += 1

                # Generate tsvector for full-text search
                # Note: We'll let Postgres handle this via a trigger or compute it here
                chunk_records.append(
                    {
                        "tenant_id": None,  # Using org_id instead
                        "org_id": tenant_id,  # tenant_id param is actually org_id
                        "document_id": document_id,
                        "chunk_index": idx,
                        "content": chunk_text,
                        "embedding": embed_data["embedding"],
                        "content_sha256": embed_data["content_sha256"],
                        "token_count": embed_data["token_count"],
                        "metadata": {},
                        "version": 1,
                    }
                )

            # Batch insert chunks
            if chunk_records:
                insert_response = (
                    self.supabase.table("document_chunks")
                    .insert(chunk_records)
                    .execute()
                )

                if not insert_response.data:
                    return IngestStatus(
                        document_id=UUID(document_id),
                        tenant_id=UUID(tenant_id),
                        status="failed",
                        total_chunks=len(chunks),
                        embedded_chunks=0,
                        error_message="Failed to insert chunks",
                    )

                # Update tsvector for full-text search
                await self._update_tsvectors(document_id, tenant_id)

            processing_time_ms = (time.time() - start_time) * 1000

            return IngestStatus(
                document_id=UUID(document_id),
                tenant_id=UUID(tenant_id),
                status="completed",
                total_chunks=len(chunks),
                embedded_chunks=len(chunk_records),
                skipped_chunks=skipped_count,
                processing_time_ms=processing_time_ms,
            )

        except Exception as e:
            return IngestStatus(
                document_id=UUID(document_id),
                tenant_id=UUID(tenant_id),
                status="failed",
                total_chunks=0,
                embedded_chunks=0,
                error_message=str(e),
            )

    def _chunk_text(self, text: str) -> List[str]:
        """
        Split text into chunks using LangChain's text splitter
        """
        chunks = self.text_splitter.split_text(text)
        # Filter out chunks that are too small
        return [c for c in chunks if len(c.strip()) >= settings.MIN_CHUNK_SIZE]

    async def _update_tsvectors(self, document_id: str, tenant_id: str):
        """
        Update tsvector columns for full-text search
        Uses Postgres to_tsvector for proper language processing

        Note: This is a workaround since supabase-py doesn't have direct SQL execution.
        In production, use a database trigger or function to auto-populate tsv on insert.
        """
        # Use RPC to execute SQL via a custom function
        # For now, we'll skip this and rely on a database trigger instead
        # TODO: Create a trigger: CREATE TRIGGER update_tsv BEFORE INSERT OR UPDATE ON document_chunks
        #       FOR EACH ROW EXECUTE FUNCTION tsvector_update_trigger(tsv, 'pg_catalog.english', content);
        pass

    async def get_chunk_status(
        self, document_id: str, tenant_id: str
    ) -> Dict[str, int]:
        """
        Get chunking/embedding status for a document
        """
        response = (
            self.supabase.table("document_chunks")
            .select("id, embedding")
            .eq("document_id", document_id)
            .eq("tenant_id", tenant_id)
            .execute()
        )

        chunks = response.data or []
        total = len(chunks)
        embedded = sum(1 for c in chunks if c.get("embedding") is not None)

        return {
            "total_chunks": total,
            "embedded_chunks": embedded,
            "is_fully_embedded": total > 0 and embedded == total,
        }
