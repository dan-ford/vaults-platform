"""
File Parser Service for Financial Documents

Handles parsing of XLS, XLSX, CSV files into structured pandas DataFrames
for financial data extraction.
"""

import io
import logging
from typing import Dict, List, Optional, Union
import pandas as pd
from pathlib import Path

logger = logging.getLogger(__name__)


class FileParserError(Exception):
    """Custom exception for file parsing errors"""
    pass


class FileParser:
    """
    Unified file parser for financial documents.
    Converts XLS/XLSX/CSV files to pandas DataFrames.
    """

    # Supported file types
    SUPPORTED_TYPES = ["xlsx", "xls", "csv"]

    # File size limits (in bytes)
    MAX_FILE_SIZE = {
        "xlsx": 25 * 1024 * 1024,  # 25MB
        "xls": 25 * 1024 * 1024,   # 25MB
        "csv": 50 * 1024 * 1024,   # 50MB
    }

    def __init__(self):
        """Initialize the file parser"""
        pass

    def parse(
        self,
        file_content: bytes,
        file_type: str,
        file_name: Optional[str] = None
    ) -> Dict[str, pd.DataFrame]:
        """
        Parse a financial document file into pandas DataFrame(s).

        Args:
            file_content: Raw file bytes
            file_type: File extension (xlsx, xls, csv)
            file_name: Optional original filename for logging

        Returns:
            Dictionary of sheet_name -> DataFrame
            For CSV files, returns {"Sheet1": dataframe}
            For Excel files, returns multiple sheets if present

        Raises:
            FileParserError: If parsing fails
        """
        file_type = file_type.lower().replace(".", "")

        # Validate file type
        if file_type not in self.SUPPORTED_TYPES:
            raise FileParserError(
                f"Unsupported file type: {file_type}. "
                f"Supported types: {', '.join(self.SUPPORTED_TYPES)}"
            )

        # Validate file size
        file_size = len(file_content)
        max_size = self.MAX_FILE_SIZE.get(file_type, 25 * 1024 * 1024)

        if file_size > max_size:
            raise FileParserError(
                f"File size ({file_size / 1024 / 1024:.1f}MB) exceeds "
                f"maximum allowed size ({max_size / 1024 / 1024:.0f}MB) "
                f"for {file_type} files"
            )

        logger.info(
            f"Parsing {file_type} file: {file_name or 'unknown'} "
            f"({file_size / 1024:.1f}KB)"
        )

        try:
            if file_type == "csv":
                return self._parse_csv(file_content)
            elif file_type in ["xlsx", "xls"]:
                return self._parse_excel(file_content, file_type)
            else:
                raise FileParserError(f"Unhandled file type: {file_type}")

        except Exception as e:
            logger.error(f"Error parsing {file_type} file: {str(e)}")
            raise FileParserError(f"Failed to parse {file_type} file: {str(e)}")

    def _parse_csv(self, file_content: bytes) -> Dict[str, pd.DataFrame]:
        """
        Parse CSV file to DataFrame.

        Args:
            file_content: Raw CSV bytes

        Returns:
            Dictionary with single DataFrame: {"Sheet1": df}
        """
        try:
            # Try multiple encodings
            encodings = ["utf-8", "latin-1", "iso-8859-1", "cp1252"]
            df = None

            for encoding in encodings:
                try:
                    df = pd.read_csv(
                        io.BytesIO(file_content),
                        encoding=encoding,
                        # Handle various CSV formats
                        skipinitialspace=True,
                        thousands=",",
                        # Try to infer date columns
                        parse_dates=True,
                        infer_datetime_format=True
                    )
                    logger.info(f"Successfully parsed CSV with {encoding} encoding")
                    break
                except (UnicodeDecodeError, UnicodeError):
                    continue

            if df is None:
                raise FileParserError("Could not decode CSV file with any standard encoding")

            # Clean up column names (remove leading/trailing spaces)
            df.columns = df.columns.str.strip()

            logger.info(f"Parsed CSV: {df.shape[0]} rows, {df.shape[1]} columns")

            return {"Sheet1": df}

        except pd.errors.EmptyDataError:
            raise FileParserError("CSV file is empty")
        except pd.errors.ParserError as e:
            raise FileParserError(f"CSV parsing error: {str(e)}")

    def _parse_excel(
        self,
        file_content: bytes,
        file_type: str
    ) -> Dict[str, pd.DataFrame]:
        """
        Parse Excel file (XLS or XLSX) to DataFrames.

        Args:
            file_content: Raw Excel bytes
            file_type: "xlsx" or "xls"

        Returns:
            Dictionary of sheet_name -> DataFrame
        """
        try:
            # Determine engine based on file type
            engine = "openpyxl" if file_type == "xlsx" else "xlrd"

            # Read all sheets
            excel_file = pd.ExcelFile(io.BytesIO(file_content), engine=engine)

            logger.info(
                f"Parsed Excel file with {len(excel_file.sheet_names)} sheets: "
                f"{', '.join(excel_file.sheet_names)}"
            )

            # Parse each sheet
            dataframes = {}
            for sheet_name in excel_file.sheet_names:
                try:
                    df = pd.read_excel(
                        excel_file,
                        sheet_name=sheet_name,
                        # Handle thousands separator
                        thousands=",",
                    )

                    # Clean up column names
                    df.columns = df.columns.str.strip() if hasattr(df.columns, 'str') else df.columns

                    # Skip completely empty sheets
                    if df.empty or df.dropna(how='all').empty:
                        logger.info(f"Skipping empty sheet: {sheet_name}")
                        continue

                    dataframes[sheet_name] = df
                    logger.info(
                        f"  - Sheet '{sheet_name}': {df.shape[0]} rows, "
                        f"{df.shape[1]} columns"
                    )

                except Exception as e:
                    logger.warning(f"Could not parse sheet '{sheet_name}': {str(e)}")
                    continue

            if not dataframes:
                raise FileParserError("No valid sheets found in Excel file")

            return dataframes

        except FileParserError:
            raise
        except Exception as e:
            raise FileParserError(f"Excel parsing error: {str(e)}")

    def dataframes_to_json(
        self,
        dataframes: Dict[str, pd.DataFrame],
        max_rows_per_sheet: int = 1000
    ) -> Dict[str, List[Dict]]:
        """
        Convert DataFrames to JSON-serializable format.

        Args:
            dataframes: Dictionary of sheet_name -> DataFrame
            max_rows_per_sheet: Maximum rows to include per sheet (for API size limits)

        Returns:
            Dictionary of sheet_name -> list of row dictionaries
        """
        json_data = {}

        for sheet_name, df in dataframes.items():
            # Limit rows if needed
            df_subset = df.head(max_rows_per_sheet) if len(df) > max_rows_per_sheet else df

            # Convert to list of dicts, handling NaN values
            json_data[sheet_name] = df_subset.fillna("").to_dict(orient="records")

            if len(df) > max_rows_per_sheet:
                logger.info(
                    f"Truncated sheet '{sheet_name}' from {len(df)} to "
                    f"{max_rows_per_sheet} rows for JSON conversion"
                )

        return json_data

    def get_sheet_summary(self, dataframes: Dict[str, pd.DataFrame]) -> Dict[str, Dict]:
        """
        Generate summary statistics for parsed DataFrames.

        Args:
            dataframes: Dictionary of sheet_name -> DataFrame

        Returns:
            Dictionary of sheet_name -> summary info
        """
        summaries = {}

        for sheet_name, df in dataframes.items():
            summaries[sheet_name] = {
                "rows": len(df),
                "columns": len(df.columns),
                "column_names": df.columns.tolist(),
                "dtypes": df.dtypes.astype(str).to_dict(),
                "has_numeric": any(df.dtypes.apply(pd.api.types.is_numeric_dtype)),
                "numeric_columns": [
                    col for col in df.columns
                    if pd.api.types.is_numeric_dtype(df[col])
                ],
                "non_empty_rows": len(df.dropna(how='all'))
            }

        return summaries


# Singleton instance
file_parser = FileParser()
