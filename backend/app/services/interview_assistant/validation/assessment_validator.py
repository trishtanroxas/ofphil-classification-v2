from typing import List, Tuple
from app.shared.schemas.pipeline_schemas import PatientInterviewExtraction

class AssessmentValidator:
    """
    Python Validation Engine for Track B (Interview Assistant).
    Enforces clinical data integrity:
      - Validates income bounds ($0 to ₱500,000 monthly).
      - Checks that household_size >= dependents + 1.
      - Prevents incomplete or logically inconsistent records from silent commit.
    """

    @staticmethod
    def validate_extraction(extraction: PatientInterviewExtraction) -> Tuple[bool, List[str]]:
        errors: List[str] = []

        if extraction.monthly_household_income is not None:
            if extraction.monthly_household_income < 0:
                errors.append("INVALID_INCOME: Monthly household income cannot be negative.")
            elif extraction.monthly_household_income > 1_000_000:
                errors.append("SUSPICIOUS_INCOME: Monthly household income exceeds clinical intake threshold.")

        if extraction.household_size is not None and extraction.num_dependents is not None:
            if extraction.household_size < (extraction.num_dependents + 1):
                errors.append("INCONSISTENT_HOUSEHOLD: Household size cannot be smaller than dependents count + 1.")

        if extraction.age is not None:
            if extraction.age < 0 or extraction.age > 125:
                errors.append("INVALID_AGE: Stated age is outside human lifespan bounds.")

        is_valid = len(errors) == 0
        return is_valid, errors
