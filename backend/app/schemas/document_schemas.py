from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DocumentProcessRequest(BaseModel):
    assessment_id: Optional[str] = None
    ocr_engine: str = Field(default="auto", description="auto | paddleocr | easyocr")
    run_forensics: bool = True
    run_signature_detection: bool = True


class DocumentProcessingStatusResponse(BaseModel):
    document_id: str
    job_id: Optional[str] = None
    processing_status: str  # UPLOADED | QUEUED | PROCESSING | COMPLETED | FAILED
    engine_version: str = "ofphil-docproc-v2.0"
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    processing_time_ms: Optional[float] = None
    unavailable_checks: List[str] = Field(default_factory=list)
    error_message: Optional[str] = None


class DocumentOCRResultResponse(BaseModel):
    document_id: str
    job_id: Optional[str] = None
    processing_status: str
    status: str = "NOT_EVALUATED"  # COMPLETED | NOT_EVALUATED | INSUFFICIENT_EVIDENCE
    engine_used: str = "PaddleOCR PP-OCRv6"
    engine_version: str = "ppocr-v6"
    extracted_text: Optional[str] = None
    confidence_score: Optional[float] = None
    fields_detected: Dict[str, Any] = Field(default_factory=dict)
    missing_information: List[str] = Field(default_factory=list)
    unavailable_reason: Optional[str] = None


class DocumentSignatureResultResponse(BaseModel):
    document_id: str
    job_id: Optional[str] = None
    status: str = "NOT_EVALUATED"  # PASSED | SUSPICIOUS | NOT_EVALUATED | INSUFFICIENT_EVIDENCE
    presence: bool = False
    signature_status: str = "NOT_EVALUATED"
    signatures_detected_count: int = 0
    regions: List[Dict[str, Any]] = Field(default_factory=list)
    engine_version: str = "YOLO11s-OFPHIL"
    details: Optional[str] = None
    disclaimer: str = "Signature presence detection only; does not establish signer identity or signature authenticity."


class DocumentStampResultResponse(BaseModel):
    document_id: str
    job_id: Optional[str] = None
    status: str = "NOT_EVALUATED"  # PASSED | SUSPICIOUS | NOT_EVALUATED | INSUFFICIENT_EVIDENCE
    presence: bool = False
    stamp_status: str = "NOT_EVALUATED"
    stamps_detected_count: int = 0
    regions: List[Dict[str, Any]] = Field(default_factory=list)
    engine_version: str = "YOLO11s-OFPHIL"
    details: Optional[str] = None
    disclaimer: str = "Stamp/seal screening only; does not establish official issuing authority legitimacy."


class DocumentVerificationResultResponse(BaseModel):
    document_id: str
    job_id: Optional[str] = None
    processing_status: str = "COMPLETED"
    document_type: str = "general"
    sha256: str
    status: str  # NO_SUSPICIOUS_INDICATORS | NEEDS_VERIFICATION | FLAGGED_FOR_MANUAL_REVIEW | INSUFFICIENT_IMAGE_QUALITY
    screening_status: str
    authenticity_classification: str
    tamper_risk: str  # LOW | MEDIUM | HIGH | UNDETERMINED
    tamper_risk_level: str
    reason: str
    authenticity_summary: str
    supporting_evidence: List[str] = Field(default_factory=list)
    confidence_assessment: str = "MODERATE"
    indicators: Dict[str, Any] = Field(default_factory=dict)
    checks: Dict[str, Any] = Field(default_factory=dict)
    unavailable_checks: List[str] = Field(default_factory=list)
    engine_version: str = "ofphil-docproc-v2.0"
    disclaimer: str = (
        "Automated forensic screening provides evidence of integrity or anomalies. "
        "It does NOT definitively prove authenticity or replace certified MSW document validation."
    )


# Backward compatibility alias for legacy tests
DocumentAuthenticityResultResponse = DocumentVerificationResultResponse



class DocumentStandardReportResponse(BaseModel):
    document_id: str
    processing_status: str  # UPLOADED | QUEUED | PROCESSING | COMPLETED | FAILED
    document_type: str
    sha256: str
    verification: Dict[str, Any]
    checks: Dict[str, Any]
    review: Dict[str, Any]


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
