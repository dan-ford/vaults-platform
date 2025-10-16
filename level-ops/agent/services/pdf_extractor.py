"""
PDF text extraction service using PyMuPDF
"""

import fitz  # PyMuPDF
from typing import Optional
import io


class PDFExtractor:
    """
    Extract text from PDF files with layout preservation
    """

    def extract_text_from_bytes(self, pdf_bytes: bytes) -> str:
        """
        Extract text from PDF bytes

        Args:
            pdf_bytes: PDF file content as bytes

        Returns:
            Extracted text content
        """
        try:
            # Open PDF from bytes
            pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
            text_parts = []

            # Extract text from each page
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                # Extract text with layout preservation
                text = page.get_text("text")
                if text.strip():
                    text_parts.append(text)

            pdf_document.close()

            return "\n\n".join(text_parts)

        except Exception as e:
            raise Exception(f"Failed to extract text from PDF: {str(e)}")

    def extract_text_from_file(self, file_path: str) -> str:
        """
        Extract text from PDF file path

        Args:
            file_path: Path to PDF file

        Returns:
            Extracted text content
        """
        try:
            with open(file_path, 'rb') as f:
                pdf_bytes = f.read()
            return self.extract_text_from_bytes(pdf_bytes)
        except Exception as e:
            raise Exception(f"Failed to read PDF file: {str(e)}")
