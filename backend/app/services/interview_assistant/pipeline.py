from app.shared.schemas.pipeline_schemas import PatientInterviewExtraction
from app.shared.logging.logger import get_logger

from .llm.qwen_client import QwenInterviewClient
from .extraction.structured_extraction import StructuredInterviewExtractor
from .validation.assessment_validator import AssessmentValidator

logger = get_logger("InterviewAssistantPipeline")

class InterviewAssistantPipeline:
    """
    Track B: Integrated Patient Interview Assistant Pipeline.
    Coordinates: Dialogue -> Follow-up generation -> Extraction -> Python Data Validation.
    """

    def __init__(self):
        self.client = QwenInterviewClient()
        self.extractor = StructuredInterviewExtractor()
        self.validator = AssessmentValidator()

    def process_interview_turn(self, history: str, patient_statement: str) -> dict:
        logger.info("Processing patient interview statement.")
        
        # 1. Formulate follow-up
        follow_up = self.client.generate_followup_question(history, patient_statement)

        # 2. Extract structured candidate fields
        extracted = self.extractor.extract_from_dialogue(patient_statement)

        # 3. Validate logical consistency
        is_valid, validation_errors = self.validator.validate_extraction(extracted)

        return {
            "follow_up_question": follow_up,
            "extracted_data": extracted.model_dump(),
            "is_valid": is_valid,
            "validation_errors": validation_errors,
            "msw_confirmation_required": True,
        }
