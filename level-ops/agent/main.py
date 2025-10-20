"""
FastAPI application for RAG document processing
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import logging

from config import settings
from models import (
    IngestDocumentRequest,
    IngestStatus,
    DeleteChunksRequest,
    DeleteResponse,
    AnalyzeFinancialDocumentRequest,
    FinancialAnalysisResponse,
)
from services import DocumentProcessor
from services.financial_analyzer import FinancialAnalyzer, FinancialAnalyzerError
from supabase import create_client

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="VAULTS RAG Service",
    description="Document chunking, embedding, and retrieval for RAG",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on environment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
processor = DocumentProcessor()

# Initialize Supabase client for financial analyzer
supabase_client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY
)
financial_analyzer = FinancialAnalyzer(supabase_client)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "rag-processor"}


@app.post("/ingest", response_model=IngestStatus)
async def ingest_document(
    request: IngestDocumentRequest, background_tasks: BackgroundTasks
):
    """
    Ingest a document: chunk, embed, and store

    Process runs in background to avoid timeout on large documents
    """
    # Support both org_id (new) and tenant_id (backward compat)
    org_id = getattr(request, 'org_id', None) or request.tenant_id

    logger.info(
        f"Ingesting document {request.document_id} for org {org_id}"
    )

    try:
        # For high priority, process synchronously
        if request.priority == "high":
            status = await processor.process_document(
                str(request.document_id),
                str(org_id),
                request.force_reembed,
            )
            return status

        # For normal/low priority, queue in background
        background_tasks.add_task(
            processor.process_document,
            str(request.document_id),
            str(org_id),
            request.force_reembed,
        )

        return IngestStatus(
            document_id=request.document_id,
            tenant_id=org_id,  # Return as tenant_id for backward compat
            status="queued",
            total_chunks=0,
            embedded_chunks=0,
        )

    except Exception as e:
        logger.error(f"Ingestion error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status/{document_id}/{org_id}")
async def get_status(document_id: str, org_id: str):
    """
    Get processing status for a document
    """
    try:
        status = await processor.get_chunk_status(document_id, org_id)
        return status
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/delete-chunks", response_model=DeleteResponse)
async def delete_chunks(request: DeleteChunksRequest):
    """
    Delete all chunks for a document (for re-embedding)
    """
    # Support both org_id (new) and tenant_id (backward compat)
    org_id = getattr(request, 'org_id', None) or request.tenant_id

    logger.info(
        f"Deleting chunks for document {request.document_id} in org {org_id}"
    )

    try:
        response = (
            processor.supabase.table("document_chunks")
            .delete()
            .eq("document_id", str(request.document_id))
            .eq("org_id", str(org_id))
            .execute()
        )

        chunks_deleted = len(response.data) if response.data else 0

        return DeleteResponse(
            success=True,
            chunks_deleted=chunks_deleted,
        )

    except Exception as e:
        logger.error(f"Delete chunks error: {str(e)}")
        return DeleteResponse(
            success=False,
            chunks_deleted=0,
            error_message=str(e),
        )


@app.post("/analyze-financial-document", response_model=FinancialAnalysisResponse)
async def analyze_financial_document(
    request: AnalyzeFinancialDocumentRequest, background_tasks: BackgroundTasks
):
    """
    Analyze a financial document (XLS/CSV) and extract metrics using AI.

    Process runs in background to avoid timeout on large files.
    """
    logger.info(
        f"Analyzing financial document {request.document_id} for org {request.org_id}"
    )

    try:
        # Start analysis in background
        background_tasks.add_task(
            financial_analyzer.analyze_document,
            str(request.document_id),
            str(request.org_id),
            str(request.user_id),
        )

        # Return immediate response with pending status
        return FinancialAnalysisResponse(
            analysis_id=request.document_id,  # Will be created in background
            status="pending",
            needs_review=False,
            processing_time_ms=None,
            error_message=None,
        )

    except Exception as e:
        logger.error(f"Financial analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analysis-status/{analysis_id}/{org_id}")
async def get_analysis_status(analysis_id: str, org_id: str):
    """
    Get the current status and results of a financial analysis.

    Returns full analysis record including extracted metrics if complete.
    """
    try:
        status = await financial_analyzer.get_analysis_status(analysis_id, org_id)
        return status
    except FinancialAnalyzerError as e:
        logger.error(f"Analysis status check error: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error checking analysis status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level=settings.LOG_LEVEL.lower())
