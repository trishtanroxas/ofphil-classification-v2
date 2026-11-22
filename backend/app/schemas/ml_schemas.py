from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MLFeatureSchema(BaseModel):
    age: float = Field(..., ge=0, le=130)
    sex: str
    marital_status: str
    household_size: int = Field(..., ge=1)
    number_of_dependents: int = Field(..., ge=0)
    residence_status: str
    educational_attainment: str
    housing_condition: str
    sectoral_membership: str
    monthly_family_income: float = Field(..., ge=0)
    monthly_household_obligations_expenses: float = Field(..., ge=0)
    employment_status: str
    occupation: str
    existing_financial_assistance: float = Field(default=0.0, ge=0)
    outstanding_medical_bills: float = Field(..., ge=0)
    diagnosis: str
    diagnosis_severity: str
    procedure: str
    type_of_treatment_surgery: str
    laterality: str
    patient_clinical_type: str
    disability_status: str
    cost_of_treatment: float = Field(..., ge=0)
    doc_visual_mean: float = 0.0
    doc_visual_std: float = 0.0
    doc_visual_max: float = 0.0
    doc_visual_l2norm: float = 0.0
    sbert_text_mean: float = 0.0
    sbert_text_std: float = 0.0
    sbert_text_l2norm: float = 0.0
    doc_indigency_verified: int = Field(default=0, ge=0, le=1)


class MLPredictRequest(BaseModel):
    assessment_id: Optional[str] = None
    model_candidate: str = Field(default="ebm", description="ebm | catboost | logistic_regression")
    features: MLFeatureSchema
    api_classification: Optional[str] = None
    allow_experimental_binary: bool = Field(
        default=False,
        description="Must be explicitly enabled to run pretrained binary [0,1] multimodal models before 4-tier OFPHIL validation",
    )


class FeatureContribution(BaseModel):
    feature: str
    value: Any
    contribution: float


class MLPredictResponse(BaseModel):
    prediction_enabled: bool
    status: str
    model_candidate: str
    model_version: str
    classes_supported: List[Any]
    predicted_class: Optional[Any] = None
    predicted_label: Optional[str] = None
    probabilities: Optional[Dict[str, float]] = None
    top_explanations: List[FeatureContribution] = Field(default_factory=list)
    api_classification: Optional[str] = None
    disagrees_with_api: Optional[bool] = None
    requires_msw_review: bool = True
    prediction_timestamp: str
    provenance_note: str
