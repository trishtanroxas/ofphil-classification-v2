from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class DocumentDetectionBox(BaseModel):
    class_name: str
    confidence: float
    bbox: List[float] = Field(..., description="[x1, y1, x2, y2] coordinates")

class DocumentOCRWord(BaseModel):
    text: str
    confidence: float
    bbox: List[List[float]]

class DocumentScreeningResult(BaseModel):
    document_id: str
    filename: str
    detected_elements: List[DocumentDetectionBox] = []
    ocr_transcription: str = ""
    ocr_confidence_mean: float = 0.0
    cmfd_flag: bool = False
    cmfd_suspicious_blocks_count: int = 0
    feature_match_score: Optional[float] = None
    validation_flags: List[str] = []
    requires_manual_inspection: bool = False
    screening_summary: str = ""

class PatientInterviewExtraction(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    civil_status: Optional[str] = None
    household_size: Optional[int] = None
    monthly_household_income: Optional[float] = None
    income_source: Optional[str] = None
    num_dependents: Optional[int] = None
    housing_type: Optional[str] = None
    raw_responses: Dict[str, Any] = {}
    validation_status: str = "PENDING_CONFIRMATION"

class EligibilityPredictionOutput(BaseModel):
    patient_id: str
    predicted_eligible: bool
    predicted_grant_tier: str
    subsidy_percentage: float
    confidence_score: float
    brier_score_reference: Optional[float] = None
    model_used: str
    feature_contributions: Dict[str, float] = {}
    msw_review_required: bool = True
