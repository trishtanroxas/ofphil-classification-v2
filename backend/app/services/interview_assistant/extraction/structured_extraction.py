import re
import json
from typing import Dict, Any, Optional
from app.shared.schemas.pipeline_schemas import PatientInterviewExtraction
from app.shared.logging.logger import get_logger

logger = get_logger("StructuredExtraction")

class StructuredInterviewExtractor:
    """
    Parses unstructured interview dialogue into validated patient intake dictionaries.
    Extracts:
      - Household size
      - Monthly household income
      - Dependents count
      - Housing type and income source
    """

    @staticmethod
    def extract_from_dialogue(transcript_text: str) -> PatientInterviewExtraction:
        logger.info("Extracting structured fields from interview transcript.")
        
        # Regex heuristics for fallback / validation alignment
        income = None
        income_match = re.search(r"(?:₱|PHP|Php|sahod|kita|income)[^\d]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)", transcript_text, re.IGNORECASE)
        if income_match:
            raw_val = income_match.group(1).replace(",", "")
            try:
                income = float(raw_val)
            except ValueError:
                pass

        # Word-to-number mapping for Tagalog/Filipino and English numerals
        word_num_map = {
            "isa": 1, "dalawa": 2, "tatlo": 3, "apat": 4, "lima": 5, "anim": 6,
            "pito": 7, "walo": 8, "siyam": 9, "sampu": 10,
            "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
            "seven": 7, "eight": 8, "nine": 9, "ten": 10
        }

        household_size = None
        hh_match = re.search(r"(\d+|isa|dalawa|tatlo|apat|lima|anim|pito|walo|siyam|sampu|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:kami|katao|members|pamilya|kasama)", transcript_text, re.IGNORECASE)
        if hh_match:
            raw_matched = hh_match.group(1).lower()
            if raw_matched in word_num_map:
                household_size = word_num_map[raw_matched]
            else:
                try:
                    household_size = int(raw_matched)
                except ValueError:
                    pass

        return PatientInterviewExtraction(
            household_size=household_size,
            monthly_household_income=income,
            raw_responses={"transcript_snippet": transcript_text[:200]},
            validation_status="PENDING_CONFIRMATION"
        )
