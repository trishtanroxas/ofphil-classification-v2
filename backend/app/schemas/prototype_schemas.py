"""
OFPHIL Prototype System API Schemas.
Provides schemas for Prototype demonstration workflows across:
- Pipeline 1: Document Processing & Forensic Screening
- Pipeline 2: LLM-Assisted Patient Interview (Qwen3-4B representation)
- Pipeline 3: ML Eligibility Classification (Logistic Regression, CatBoost, EBM, Ensemble)
- Centralized Patient Data Consolidation & Reconciliation
- MSW Verification, Audit & Explainable Assessment Report Generation

Every schema contains explicit execution_mode indicators (default: PROTOTYPE_SIMULATED)
to guarantee transparent delineation between demonstration outputs and research artifacts.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PrototypeDocumentClassificationRequest(BaseModel):
    document_id: str = Field(..., description="Target document ID or temporary upload handle")
    patient_id: Optional[str] = Field(None, description="Patient identifier")
    document_name: Optional[str] = Field(None, description="Document filename or description")
    simulate_category: Optional[str] = Field(
        None,
        description="Optional category to simulate: certificate_of_indigency, government_id, electricity_bill, water_bill, medical_certificate"
    )


class PrototypeDocumentClassificationResponse(BaseModel):
    document_id: str
    patient_id: Optional[str] = None
    predicted_category: str
    classification_status: str
    processing_status: str
    confidence: float
    execution_mode: str = "PROTOTYPE_SIMULATED"
    model_version: str = "ResNet-50-DocClassifier-v2 (Prototype)"
    disclaimer: str = (
        "Document-type categorization only. This model is NOT a counterfeit or legal authenticity detector."
    )


class PrototypeOCRExtractionRequest(BaseModel):
    document_id: str
    document_category: Optional[str] = None


class PrototypeOCRExtractionResponse(BaseModel):
    document_id: str
    document_category: str
    extracted_text_snippet: str
    extracted_fields: Dict[str, Any]
    ocr_confidence: float
    missing_or_unreadable_fields: List[str]
    extraction_status: str
    execution_mode: str = "PROTOTYPE_SIMULATED"
    engine: str = "PaddleOCR PP-OCRv6 (Prototype Representation)"


class PrototypeSignatureStampScreeningRequest(BaseModel):
    document_id: str
    has_signature_expected: bool = True
    has_stamp_expected: bool = True


class PrototypeSignatureStampScreeningResponse(BaseModel):
    document_id: str
    signature_screening: Dict[str, Any]
    stamp_screening: Dict[str, Any]
    overall_status: str
    execution_mode: str = "PROTOTYPE_SIMULATED"
    disclaimer: str = (
        "Zero YOLO. Structural and morphological analysis. Absence of specimen reference data defaults to NOT_EVALUATED."
    )


class PrototypeForensicAnalysisRequest(BaseModel):
    document_id: str


class PrototypeForensicAnalysisResponse(BaseModel):
    document_id: str
    ela_analysis: Dict[str, Any]
    noise_inconsistency: Dict[str, Any]
    chromatic_dispersion: Dict[str, Any]
    orb_copy_move: Dict[str, Any]
    edge_gradient: Dict[str, Any]
    overall_forensic_score: float
    anomaly_count: int
    execution_mode: str = "PROTOTYPE_SIMULATED"


class PrototypeEvidenceAggregationRequest(BaseModel):
    document_id: str
    classification_result: Optional[Dict[str, Any]] = None
    ocr_result: Optional[Dict[str, Any]] = None
    signature_result: Optional[Dict[str, Any]] = None
    stamp_result: Optional[Dict[str, Any]] = None
    forensic_result: Optional[Dict[str, Any]] = None


class PrototypeEvidenceAggregationResponse(BaseModel):
    document_id: str
    screening_verdict: str
    risk_level: str
    rule_triggers: List[str]
    summary_explanation: str
    missing_evidence: List[str]
    individual_results: Dict[str, str]
    execution_mode: str = "PROTOTYPE_SIMULATED"
    aggregation_engine: str = "Deterministic Rule-Based Evidence Aggregation (No Trained Tampering Classifier)"


class PrototypeInterviewTurnRequest(BaseModel):
    patient_id: str
    conversation_history: List[Dict[str, str]] = Field(default_factory=list)
    patient_statement: str


class PrototypeInterviewTurnResponse(BaseModel):
    patient_id: str
    ai_response_or_followup: str
    extracted_entities: Dict[str, Any]
    missing_information_detected: List[str]
    conversation_turn: int
    execution_mode: str = "PROTOTYPE_SIMULATED"
    model_representation: str = "Qwen3-4B-Instruct-2507 (Prototype Structured Interview Assistant)"


class PrototypeInterviewConsistencyRequest(BaseModel):
    patient_id: str
    interview_transcript: Optional[str] = None
    structured_responses: Dict[str, Any] = Field(default_factory=dict)
    clarification_answers: Optional[Dict[str, str]] = None
    interview_answers: Optional[List[Dict[str, Any]]] = None
    clarification_items: Optional[List[Dict[str, Any]]] = None
    background: Optional[Dict[str, Any]] = None
    medical_difficulties: Optional[Dict[str, Any]] = None
    psychosocial: Optional[Dict[str, Any]] = None
    total_household_income: Optional[float] = None
    household_size: Optional[int] = None


class PrototypeInterviewConsistencyResponse(BaseModel):
    patient_id: str
    overall_consistency_score: Optional[float] = None  # 0.0 - 100.0 percentage or None if INSUFFICIENT_DATA
    dimension_scores: Dict[str, Optional[float]]
    provisional_interpretation: str = "Generally Consistent"
    score_label: str = "INTERVIEW CONSISTENCY SCORE"
    status: str = "ASSESSED"
    identified_discrepancies: List[str] = Field(default_factory=list)
    missing_information: List[str] = Field(default_factory=list)
    unresolved_questions: List[str] = Field(default_factory=list)
    clarification_history: List[Dict[str, Any]] = Field(default_factory=list)
    per_question_assessments: List[Dict[str, Any]] = Field(default_factory=list)
    cross_field_discrepancies: List[Dict[str, Any]] = Field(default_factory=list)
    msw_verification_recommendations: List[str] = Field(default_factory=list)
    msw_verification_status: str = "PENDING_MSW_VERIFICATION"
    execution_mode: str = "PROTOTYPE_SIMULATED"
    model_representation: str = "Qwen3-4B-Instruct-2507 (Simulated Prototype Representation)"
    assessment_timestamp: Optional[str] = None
    disclaimer: str = (
        "Qualitative interview assessment only. Score is NOT added to ML predictors and does NOT automatically reject patients."
    )


class PrototypeEligibilityPredictionRequest(BaseModel):
    patient_id: str
    selected_model: str = Field(
        "Soft Voting Ensemble",
        description="Logistic Regression, CatBoost, Explainable Boosting Machine (EBM), or Soft Voting Ensemble"
    )
    features_27: Dict[str, Any] = Field(
        ...,
        description="The approved 27 tabular predictors (7 numeric, 20 categorical). Prohibited features are rejected."
    )


class PrototypeEligibilityPredictionResponse(BaseModel):
    patient_id: str
    model_name: str
    predicted_eligibility: str
    predicted_grant_tier: str
    recommended_subsidy_percentage: float
    confidence_score: float
    model_comparison: Dict[str, Dict[str, Any]]
    top_feature_contributions: List[Dict[str, Any]]
    shap_summary: Dict[str, Any]
    execution_mode: str = "PROTOTYPE_SIMULATED"
    disclaimer: str = (
        "Decision support output for MSW review. Does NOT execute automated binding approvals or rejections."
    )


class PrototypeConsolidationRequest(BaseModel):
    patient_id: str
    patient_demographics: Dict[str, Any]
    document_screenings: List[Dict[str, Any]] = Field(default_factory=list)
    interview_findings: Optional[Dict[str, Any]] = None
    eligibility_prediction: Optional[Dict[str, Any]] = None


class PrototypeConsolidationResponse(BaseModel):
    patient_id: str
    patient_profile: Dict[str, Any]
    documents_summary: Dict[str, Any]
    interview_summary: Dict[str, Any]
    eligibility_summary: Dict[str, Any]
    data_reconciliation: Dict[str, Any]
    overall_readiness_for_msw: str
    execution_mode: str = "PROTOTYPE_SIMULATED"
    isolation_notice: str = (
        "Prototype Demonstration Record. Isolated from actual ML training and research datasets."
    )


class PrototypeMSWVerificationRequest(BaseModel):
    patient_id: str
    assessment_id: Optional[str] = None
    msw_id: str = "msw_lead"
    verification_status: str = Field(
        "VERIFIED",
        description="VERIFIED, NEEDS_ADDITIONAL_REQUIREMENTS, DISCREPANCIES_FLAGGED, or REFERRED_FOR_ADMIN_DECISION"
    )
    msw_remarks: str
    document_check_notes: Optional[str] = None
    interview_check_notes: Optional[str] = None
    eligibility_override_notes: Optional[str] = None
    recommended_grant_tier: Optional[str] = None
    recommended_subsidy_percentage: Optional[float] = None


class PrototypeAssessmentReportRequest(BaseModel):
    patient_id: str
    assessment_id: Optional[str] = None
    include_full_forensics: bool = True
    include_interview_transcript: bool = True


class PrototypeAssessmentReportResponse(BaseModel):
    report_id: str
    patient_id: str
    generated_at: str
    consolidated_evidence: Dict[str, Any]
    msw_verification_state: Dict[str, Any]
    final_recommendation: Dict[str, Any]
    decision_authority: str = "Licensed Medical Social Worker (Sole Human Authority)"
    execution_mode: str = "PROTOTYPE_SIMULATED"
    regulatory_notice: str = (
        "CONFIDENTIAL OFPHIL CLINICAL ASSESSMENT REPORT — PROTOTYPE SYSTEM DEMONSTRATION"
    )
