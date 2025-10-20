"""
Financial Analyzer Service

Orchestrates the end-to-end financial document analysis:
1. Download document from Supabase Storage
2. Parse file (XLS/CSV) to DataFrames
3. Extract financial metrics using OpenAI
4. Store results in financial_analyses table
"""

import logging
import time
from typing import Dict, Optional, Any
from datetime import datetime
from supabase import Client

from .file_parser import file_parser, FileParserError
from .openai_financial import financial_extractor, FinancialExtractionError

logger = logging.getLogger(__name__)


class FinancialAnalyzerError(Exception):
    """Custom exception for financial analyzer errors"""
    pass


class FinancialAnalyzer:
    """
    Main orchestrator for financial document analysis.
    """

    def __init__(self, supabase_client: Client):
        """
        Initialize the financial analyzer.

        Args:
            supabase_client: Authenticated Supabase client
        """
        self.supabase = supabase_client

    async def analyze_document(
        self,
        document_id: str,
        org_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Analyze a financial document end-to-end.

        Args:
            document_id: UUID of document in documents table
            org_id: Organization ID
            user_id: User ID who initiated the analysis

        Returns:
            Dictionary containing:
            {
                "analysis_id": str,
                "status": str,
                "extracted_data": dict,
                "needs_review": bool
            }

        Raises:
            FinancialAnalyzerError: If analysis fails
        """
        start_time = time.time()
        analysis_id = None

        try:
            # Step 1: Create analysis record (pending status)
            analysis_id = await self._create_analysis_record(
                document_id, org_id, user_id
            )

            logger.info(f"Starting analysis {analysis_id} for document {document_id}")

            # Step 2: Update status to processing
            await self._update_analysis_status(
                analysis_id, "processing", org_id
            )

            # Step 3: Get document metadata
            document = await self._get_document(document_id, org_id)

            # Step 4: Download file from Supabase Storage
            file_content = await self._download_document(
                document["storage_path"],
                document["bucket"]
            )

            # Step 5: Parse file to DataFrames
            file_type = self._extract_file_type(document["file_name"])
            dataframes = file_parser.parse(
                file_content,
                file_type,
                document["file_name"]
            )

            # Convert to JSON for OpenAI
            sheets_json = file_parser.dataframes_to_json(dataframes)

            # Step 6: Extract financial metrics using OpenAI
            extraction_result = await financial_extractor.extract_metrics(
                sheets_json,
                document["file_name"]
            )

            # Step 7: Determine if needs review
            needs_review = financial_extractor.needs_review(extraction_result)
            status = "review" if needs_review else "completed"

            # Step 8: Store results in database
            processing_time_ms = int((time.time() - start_time) * 1000)

            await self._update_analysis_result(
                analysis_id=analysis_id,
                org_id=org_id,
                status=status,
                file_type=file_type,
                raw_analysis=extraction_result,
                extracted_data=extraction_result,
                confidence_score=extraction_result.get("overall_confidence", 0.0),
                ai_insights=extraction_result.get("insights", []),
                ai_recommendations=extraction_result.get("recommendations", []),
                detected_issues=extraction_result.get("warnings", []),
                processing_time_ms=processing_time_ms
            )

            logger.info(
                f"Analysis {analysis_id} completed successfully in {processing_time_ms}ms. "
                f"Status: {status}"
            )

            return {
                "analysis_id": analysis_id,
                "status": status,
                "extracted_data": extraction_result,
                "needs_review": needs_review,
                "processing_time_ms": processing_time_ms
            }

        except (FileParserError, FinancialExtractionError) as e:
            # Known errors - store in database
            error_message = str(e)
            logger.error(f"Analysis failed: {error_message}")

            if analysis_id:
                await self._update_analysis_error(
                    analysis_id,
                    org_id,
                    error_message,
                    int((time.time() - start_time) * 1000)
                )

            raise FinancialAnalyzerError(error_message)

        except Exception as e:
            # Unexpected errors
            error_message = f"Unexpected error: {str(e)}"
            logger.error(f"Analysis failed unexpectedly: {error_message}")

            if analysis_id:
                await self._update_analysis_error(
                    analysis_id,
                    org_id,
                    error_message,
                    int((time.time() - start_time) * 1000)
                )

            raise FinancialAnalyzerError(error_message)

    async def get_analysis_status(
        self,
        analysis_id: str,
        org_id: str
    ) -> Dict[str, Any]:
        """
        Get the current status of an analysis.

        Args:
            analysis_id: Analysis UUID
            org_id: Organization ID

        Returns:
            Analysis record with status and results (if complete)
        """
        try:
            response = self.supabase.table("financial_analyses") \
                .select("*") \
                .eq("id", analysis_id) \
                .eq("org_id", org_id) \
                .single() \
                .execute()

            if not response.data:
                raise FinancialAnalyzerError(f"Analysis {analysis_id} not found")

            return response.data

        except Exception as e:
            logger.error(f"Failed to get analysis status: {str(e)}")
            raise FinancialAnalyzerError(f"Failed to get analysis status: {str(e)}")

    # Private helper methods

    async def _create_analysis_record(
        self,
        document_id: str,
        org_id: str,
        user_id: str
    ) -> str:
        """Create initial analysis record in database"""
        try:
            response = self.supabase.table("financial_analyses").insert({
                "org_id": org_id,
                "document_id": document_id,
                "created_by": user_id,
                "analysis_status": "pending",
                "file_type": "unknown",  # Will update after parsing
                "raw_analysis": {},
            }).execute()

            if not response.data or len(response.data) == 0:
                raise FinancialAnalyzerError("Failed to create analysis record")

            return response.data[0]["id"]

        except Exception as e:
            logger.error(f"Failed to create analysis record: {str(e)}")
            raise FinancialAnalyzerError(f"Database error: {str(e)}")

    async def _update_analysis_status(
        self,
        analysis_id: str,
        status: str,
        org_id: str
    ) -> None:
        """Update analysis status"""
        try:
            self.supabase.table("financial_analyses") \
                .update({"analysis_status": status}) \
                .eq("id", analysis_id) \
                .eq("org_id", org_id) \
                .execute()

        except Exception as e:
            logger.error(f"Failed to update analysis status: {str(e)}")
            # Non-critical, don't raise

    async def _get_document(
        self,
        document_id: str,
        org_id: str
    ) -> Dict[str, Any]:
        """Get document metadata from database"""
        try:
            response = self.supabase.table("documents") \
                .select("id, file_name, storage_path, bucket") \
                .eq("id", document_id) \
                .eq("org_id", org_id) \
                .single() \
                .execute()

            if not response.data:
                raise FinancialAnalyzerError(f"Document {document_id} not found")

            return response.data

        except Exception as e:
            logger.error(f"Failed to get document: {str(e)}")
            raise FinancialAnalyzerError(f"Document not found: {str(e)}")

    async def _download_document(
        self,
        storage_path: str,
        bucket: str = "vault-documents"
    ) -> bytes:
        """Download document from Supabase Storage"""
        try:
            # Download file
            response = self.supabase.storage.from_(bucket).download(storage_path)

            if not response:
                raise FinancialAnalyzerError(f"Failed to download file from {storage_path}")

            return response

        except Exception as e:
            logger.error(f"Failed to download document: {str(e)}")
            raise FinancialAnalyzerError(f"Download failed: {str(e)}")

    def _extract_file_type(self, file_name: str) -> str:
        """Extract file extension from filename"""
        if not file_name:
            return "unknown"

        parts = file_name.split(".")
        if len(parts) > 1:
            return parts[-1].lower()

        return "unknown"

    async def _update_analysis_result(
        self,
        analysis_id: str,
        org_id: str,
        status: str,
        file_type: str,
        raw_analysis: Dict,
        extracted_data: Dict,
        confidence_score: float,
        ai_insights: list,
        ai_recommendations: list,
        detected_issues: list,
        processing_time_ms: int
    ) -> None:
        """Update analysis record with results"""
        try:
            self.supabase.table("financial_analyses") \
                .update({
                    "analysis_status": status,
                    "file_type": file_type,
                    "raw_analysis": raw_analysis,
                    "extracted_data": extracted_data,
                    "confidence_score": confidence_score,
                    "ai_insights": ai_insights,
                    "ai_recommendations": ai_recommendations,
                    "detected_issues": detected_issues,
                    "processing_time_ms": processing_time_ms,
                    "updated_at": datetime.utcnow().isoformat()
                }) \
                .eq("id", analysis_id) \
                .eq("org_id", org_id) \
                .execute()

        except Exception as e:
            logger.error(f"Failed to update analysis results: {str(e)}")
            raise FinancialAnalyzerError(f"Failed to save results: {str(e)}")

    async def _update_analysis_error(
        self,
        analysis_id: str,
        org_id: str,
        error_message: str,
        processing_time_ms: int
    ) -> None:
        """Update analysis record with error"""
        try:
            self.supabase.table("financial_analyses") \
                .update({
                    "analysis_status": "failed",
                    "error_message": error_message,
                    "processing_time_ms": processing_time_ms,
                    "updated_at": datetime.utcnow().isoformat()
                }) \
                .eq("id", analysis_id) \
                .eq("org_id", org_id) \
                .execute()

        except Exception as e:
            logger.error(f"Failed to update analysis error: {str(e)}")
            # Non-critical, don't raise
