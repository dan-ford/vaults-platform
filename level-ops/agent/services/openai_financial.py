"""
OpenAI Financial Extraction Service

Uses GPT-4-turbo to extract structured financial metrics from spreadsheet data.
"""

import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import os
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


class FinancialExtractionError(Exception):
    """Custom exception for financial extraction errors"""
    pass


class FinancialExtractor:
    """
    Extracts financial metrics from spreadsheet data using OpenAI GPT-4.
    """

    # OpenAI model configuration
    MODEL = "gpt-4-turbo-preview"  # or gpt-4o-mini for cost savings
    MAX_TOKENS = 4000
    TEMPERATURE = 0.1  # Low temperature for consistent extraction

    # Confidence threshold for auto-approval
    CONFIDENCE_THRESHOLD = 0.5

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the financial extractor.

        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise FinancialExtractionError("OpenAI API key not provided")

        self.client = AsyncOpenAI(api_key=self.api_key)

    async def extract_metrics(
        self,
        sheets_data: Dict[str, List[Dict]],
        file_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract financial metrics from parsed spreadsheet data.

        Args:
            sheets_data: Dictionary of sheet_name -> list of row dictionaries
            file_name: Optional filename for context

        Returns:
            Dictionary containing:
            {
                "metrics": {
                    "arr": {"value": float, "confidence": float, "source": str},
                    "revenue": {...},
                    "gross_margin": {...},
                    "cash": {...},
                    "burn": {...}
                },
                "detected_period": "YYYY-MM",
                "insights": ["insight 1", "insight 2"],
                "warnings": ["warning 1"],
                "recommendations": ["recommendation 1"],
                "overall_confidence": float
            }

        Raises:
            FinancialExtractionError: If extraction fails
        """
        try:
            # Build the extraction prompt
            prompt = self._build_extraction_prompt(sheets_data, file_name)

            logger.info(f"Calling OpenAI API with {self.MODEL}")

            # Call OpenAI API
            response = await self.client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": self._get_system_prompt()
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=self.TEMPERATURE,
                max_tokens=self.MAX_TOKENS,
                response_format={"type": "json_object"}  # Structured output
            )

            # Parse response
            result_text = response.choices[0].message.content
            result = json.loads(result_text)

            # Validate and post-process
            result = self._validate_and_clean_result(result)

            logger.info(
                f"Successfully extracted metrics with overall confidence: "
                f"{result.get('overall_confidence', 0):.2f}"
            )

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response as JSON: {str(e)}")
            raise FinancialExtractionError(f"Invalid JSON response from AI: {str(e)}")

        except Exception as e:
            logger.error(f"Financial extraction failed: {str(e)}")
            raise FinancialExtractionError(f"Extraction failed: {str(e)}")

    def _get_system_prompt(self) -> str:
        """Get the system prompt for the AI"""
        return """You are a financial analyst AI specialized in extracting financial metrics from spreadsheets.

Your task is to analyze spreadsheet data and extract key financial metrics accurately.

IMPORTANT RULES:
1. Return ONLY valid JSON, no markdown, no extra text
2. Use null for metrics you cannot find
3. Set confidence to 0.0 when uncertain
4. Be precise with numbers - remove currency symbols, commas, and formatting
5. Look for the most recent data if multiple periods exist
6. Detect common financial terms and their variations"""

    def _build_extraction_prompt(
        self,
        sheets_data: Dict[str, List[Dict]],
        file_name: Optional[str]
    ) -> str:
        """
        Build the extraction prompt with spreadsheet data.

        Args:
            sheets_data: Parsed spreadsheet data
            file_name: Optional filename

        Returns:
            Formatted prompt string
        """
        # Convert sheets data to readable format (limit size for API)
        sheets_summary = []
        for sheet_name, rows in sheets_data.items():
            # Limit to first 100 rows and summarize
            limited_rows = rows[:100]
            sheets_summary.append(f"\n=== Sheet: {sheet_name} ===")
            sheets_summary.append(f"Columns: {', '.join(limited_rows[0].keys()) if limited_rows else 'empty'}")
            sheets_summary.append(f"Row count: {len(rows)}")
            sheets_summary.append("\nSample data (first few rows):")
            for i, row in enumerate(limited_rows[:10], 1):
                sheets_summary.append(f"Row {i}: {json.dumps(row, default=str)}")

        spreadsheet_data = "\n".join(sheets_summary)

        prompt = f"""Analyze this financial spreadsheet and extract the following metrics:

FILE: {file_name or 'Unknown'}

SPREADSHEET DATA:
{spreadsheet_data}

METRICS TO EXTRACT:
1. ARR (Annual Recurring Revenue) - in USD
2. Monthly Revenue - in USD
3. Gross Margin - as percentage (0-100)
4. Cash Balance - in USD
5. Monthly Burn Rate - in USD (positive number)
6. Date/Period - when these metrics apply (YYYY-MM format)

INSTRUCTIONS:
- Search ALL sheets and rows for these metrics
- Look for keywords: "ARR", "annual recurring revenue", "MRR", "revenue", "sales", "gross margin", "cash", "cash balance", "burn", "burn rate", "runway"
- Look for common variations: "Rev", "Gross Profit %", "Bank Balance", "Monthly Spend"
- Extract ONLY numeric values (remove $, €, £, commas, percentages symbols)
- For percentages, return as 0-100 scale (e.g., 75.5 not 0.755)
- Indicate confidence (0.0-1.0) for each extraction:
  - 1.0 = Found exact match with clear label
  - 0.7-0.9 = Found likely match with similar label
  - 0.4-0.6 = Inferred from context or calculations
  - 0.0-0.3 = Very uncertain or not found
- Note the cell/location where each value was found (e.g., "Sheet1, Row 5, Column B")
- Identify the reporting period (month/year)
- Provide insights about trends (if multiple periods visible)
- Flag warnings (e.g., low runway, high burn)
- Give recommendations for financial health

RETURN THIS EXACT JSON STRUCTURE:
{{
  "metrics": {{
    "arr": {{"value": number or null, "confidence": number, "source": "location string"}},
    "revenue": {{"value": number or null, "confidence": number, "source": "location string"}},
    "gross_margin": {{"value": number or null, "confidence": number, "source": "location string"}},
    "cash": {{"value": number or null, "confidence": number, "source": "location string"}},
    "burn": {{"value": number or null, "confidence": number, "source": "location string"}}
  }},
  "detected_period": "YYYY-MM or null",
  "insights": ["trend 1", "trend 2"],
  "warnings": ["warning 1", "warning 2"],
  "recommendations": ["suggestion 1", "suggestion 2"],
  "overall_confidence": number (average of all metric confidences)
}}

If a metric is NOT found or uncertain, set value to null and confidence to 0.0-0.3."""

        return prompt

    def _validate_and_clean_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and clean the AI extraction result.

        Args:
            result: Raw result from AI

        Returns:
            Cleaned and validated result

        Raises:
            FinancialExtractionError: If result is invalid
        """
        # Ensure required structure
        if "metrics" not in result:
            raise FinancialExtractionError("Missing 'metrics' in AI response")

        metrics = result.get("metrics", {})

        # Define expected metrics
        expected_metrics = ["arr", "revenue", "gross_margin", "cash", "burn"]

        # Validate each metric
        cleaned_metrics = {}
        confidences = []

        for metric_name in expected_metrics:
            metric_data = metrics.get(metric_name, {})

            # Ensure proper structure
            value = metric_data.get("value")
            confidence = metric_data.get("confidence", 0.0)
            source = metric_data.get("source", "unknown")

            # Validate confidence range
            confidence = max(0.0, min(1.0, float(confidence)))
            confidences.append(confidence)

            # Clean up value (ensure numeric or None)
            if value is not None:
                try:
                    value = float(value)
                except (ValueError, TypeError):
                    logger.warning(f"Invalid value for {metric_name}: {value}, setting to None")
                    value = None
                    confidence = 0.0

            cleaned_metrics[metric_name] = {
                "value": value,
                "confidence": round(confidence, 2),
                "source": str(source)
            }

        # Calculate overall confidence
        overall_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        # Build cleaned result
        cleaned_result = {
            "metrics": cleaned_metrics,
            "detected_period": result.get("detected_period"),
            "insights": result.get("insights", []),
            "warnings": result.get("warnings", []),
            "recommendations": result.get("recommendations", []),
            "overall_confidence": round(overall_confidence, 2)
        }

        return cleaned_result

    def needs_review(self, extraction_result: Dict[str, Any]) -> bool:
        """
        Determine if extraction result needs human review based on confidence scores.

        Args:
            extraction_result: Cleaned extraction result

        Returns:
            True if any critical metric has low confidence
        """
        critical_metrics = ["arr", "revenue", "cash", "burn"]
        metrics = extraction_result.get("metrics", {})

        for metric_name in critical_metrics:
            metric_data = metrics.get(metric_name, {})
            confidence = metric_data.get("confidence", 0.0)

            if confidence < self.CONFIDENCE_THRESHOLD:
                logger.info(
                    f"Low confidence for {metric_name} ({confidence:.2f}), "
                    f"flagging for review"
                )
                return True

        return False


# Singleton instance
financial_extractor = FinancialExtractor()
