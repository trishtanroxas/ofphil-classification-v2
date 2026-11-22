from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DocumentProcessRequest(BaseModel):
    assessment_id: Optional[str] = None
    ocr_engine: str = Field(default="auto", description="auto | paddleocr | easyocr | trocr")
    run_forensics: bool = True
    run_signature_detection: bool = True


class DocumentProcessingStatusResponse(BaseModel):
    document_id: str
    job_id: str
    processing_status: str  # NOT_CHECKED | QUEUED | PROCESSING | COMPLETED | FAILED
    engine_version: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    processing_time_ms: Optional[float] = None
    unavailable_checks: List[str] = Field(default_factory=list)
    error_message: Optional[str] = None


class DocumentOCRResultResponse(BaseModel):
    document_id: str
    job_id: Optional[str] = None
    processing_status: str
    engine_used: str
    engine_version: str
    extracted_text: Optional[str] = None
    confidence_score: Optional[float] = None
    fields_detected: Dict[str, Any] = Field(default_factory=dict)
    missing_information: List[str] = Field(default_factory=list)
    unavailable_reason: Optional[str] = None


class DocumentSignatureResultResponse(BaseModel):
    document_id: str
    job_id: Optional[str] = None
    signature_status: str  # NOT_CHECKED | SIGNATURE_DETECTED | SIGNATURE_NOT_FOUND | REQUIRES_MANUAL_REVIEW | UNVERIFIABLE
    signatures_detected_count: int = 0
    regions: List[Dict[str, Any]] = Field(default_factory=list)
    engine_version: str
    disclaimer: str = "Signature presence detection only; does not prove signature authenticity or signer identity."


class DocumentAuthenticityResultResponse(BaseModel):
    document_id: str
    job_id: Optional[str] = None
    overall_status: str  # NO_ISSUE_DETECTED | REQUIRES_REVIEW | VERIFICATION_FAILED | UNVERIFIABLE
    tamper_risk_level: str
    indicators: Dict[str, Any] = Field(default_factory=dict)
    unavailable_checks: List[str] = Field(default_factory=list)
    engine_version: str
    disclaimer: str = "Automated forensic indicators only; a clean result does not prove authenticity and a flagged indicator does not prove fraud."


class DocumentReviewRequest(BaseModel):
    decision: str = Field(..., description="ACCEPTED | REJECTED | RESUBMISSION_REQUIRED")
    review_notes: str = Field(..., min_length=3, max_length=2000)
    reviewer_name: Optional[str] = None


class DocumentReviewResponse(BaseModel):
    document_id: str
    review_decision: str
    review_notes: str
    reviewer_id: str
    reviewer_name: str
    reviewed_at: str
    status: str = "RECORDED"
