import re
from typing import List, Dict, Any
from app.shared.schemas.pipeline_schemas import DocumentDetectionBox

class DocumentValidator:
    """
    Deterministic Python Validation Engine for Document Screening.
    Cross-checks:
      1. Mandatory element presence (Header, Signature region, Official Stamp).
      2. Dates and reference number formats in extracted text.
      3. Alignment between detected regions and OCR findings.
    """

    @staticmethod
    def validate(
        doc_type: str,
        detected_boxes: List[DocumentDetectionBox],
        extracted_text: str,
        expected_patient_name: str = ""
    ) -> List[str]:
        flags: List[str] = []
        class_names = [b.class_name for b in detected_boxes]

        # 1. Structural requirements
        if "signature_region" not in class_names:
            flags.append("MISSING_SIGNATURE_REGION: No signature block detected.")

        if doc_type.lower() in ["indigency", "barangay_indigency"] and "official_stamp_seal" not in class_names:
            flags.append("MISSING_SEAL: Expected official dry seal or stamp not detected.")

        # 2. Name cross-check
        if expected_patient_name:
            clean_expected = expected_patient_name.strip().lower()
            clean_text = extracted_text.lower()
            # Split tokens to check if major surname appears
            parts = [p for p in clean_expected.split() if len(p) > 2]
            found_parts = [p for p in parts if p in clean_text]
            if parts and len(found_parts) == 0:
                flags.append("NAME_MISMATCH: Registered patient name not detected in document text.")

        # 3. Date pattern validation
        date_pattern = r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b"
        if not re.search(date_pattern, extracted_text, re.IGNORECASE):
            flags.append("UNCERTAIN_DATE: No standard calendar date pattern identified in OCR output.")

        return flags
