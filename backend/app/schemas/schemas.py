from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class APIResponse(BaseModel):
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[Any] = None


class HealthResponse(BaseModel):
    status: str = "healthy"
    app_name: str
    environment: str
    version: str = "2.0.0"
    api_prefix: str


class DatasetCreate(BaseModel):
    name: str = Field(..., example="synthetic_patients_batch_01.csv")
    record_count: int = Field(default=100, ge=1, le=50000)
    category: str = Field(default="synthetic_tabular", example="synthetic_tabular")
    notes: Optional[str] = None


class DatasetItem(BaseModel):
    id: str
    name: str
    record_count: int
    category: str
    created_at: str
    status: str
    notes: Optional[str] = None


class DocumentItem(BaseModel):
    id: str
    filename: str
    document_type: str
    file_size_bytes: int
    uploaded_at: str
    status: str
    ocr_processed: bool = False
    manipulation_risk: Optional[str] = "clean"


class OCRProcessingRequest(BaseModel):
    document_id: str
    engine: str = Field(default="PaddleOCR", description="OCR engine: PaddleOCR, TrOCR, or Donut")
    preprocess: bool = True


class OCRResultResponse(BaseModel):
    document_id: str
    engine: str
    status: str
    extracted_text: str
    confidence_score: float
    fields_detected: Dict[str, Any]
    processing_time_ms: float


class TransformerOCRRequest(BaseModel):
    document_id: str
    model_name: str = Field(default="microsoft/trocr-base-stage1", description="Transformer OCR model")
    task: str = Field(default="handwritten_recognition")


class EmbeddingRequest(BaseModel):
    text_content: str
    model: str = Field(default="sentence-transformers/all-MiniLM-L6-v2")


class EmbeddingResponse(BaseModel):
    model: str
    dimension: int
    vector_sample: List[float]
    processing_time_ms: float


class SemanticScoringRequest(BaseModel):
    narrative_text: str
    justification_target: str = "indigency_justification"


class SemanticScoringResponse(BaseModel):
    target: str
    relevance_score: float
    consistency_score: float
    urgency_score: float
    composite_semantic_score: float
    summary: str


class DetectionRequest(BaseModel):
    document_id: str
    model_type: str = Field(default="YOLOv8-OFPHIL-Stamps", description="YOLO detection model")
    confidence_threshold: float = 0.45


class DetectionResponse(BaseModel):
    document_id: str
    model_used: str
    stamps_detected: int
    signatures_detected: int
    bounding_boxes: List[Dict[str, Any]]
    verification_status: str


class DocumentAnalysisRequest(BaseModel):
    document_id: str
    run_tamper_screening: bool = True
    run_font_consistency_check: bool = True


class DocumentAnalysisResponse(BaseModel):
    document_id: str
    tamper_risk_level: str
    anomaly_score: float
    flagged_regions: List[Dict[str, Any]]
    metadata_integrity: str


class ClassificationPredictRequest(BaseModel):
    applicant_name: str = "Juan Dela Cruz"
    monthly_income: float = 8500.0
    household_size: int = 5
    philhealth_category: str = "Indigent"
    housing_type: str = "Informal Settlement"
    semantic_score: float = 0.88
    stamp_verified: bool = True
    signature_verified: bool = True
    tamper_risk: str = "clean"


class ClassificationPredictResponse(BaseModel):
    applicant_name: str
    model_used: str = "CatBoostClassifier-v2.1"
    eligibility_prediction: str
    confidence_probability: float
    feature_importance_top: List[Dict[str, Any]]
    decision_category: str


class ExplainabilityRequest(BaseModel):
    applicant_id: Optional[str] = None
    features: Optional[Dict[str, Any]] = None


class ExplainabilityResponse(BaseModel):
    model: str = "CatBoostClassifier-v2.1"
    base_value: float
    shap_values: Dict[str, float]
    summary_plot_data: List[Dict[str, Any]]


class ExperimentItem(BaseModel):
    id: str
    experiment_name: str
    pipeline_stage: str
    accuracy: Optional[float] = None
    f1_score: Optional[float] = None
    roc_auc: Optional[float] = None
    status: str
    created_at: str
