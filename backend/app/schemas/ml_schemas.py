from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MLFeatureSchema(BaseModel):
    # 7 Numerical features
    age: float = Field(..., ge=0, le=130)
    household_size: int = Field(..., ge=1)
    number_of_dependents: int = Field(..., ge=0)
    monthly_family_income: float = Field(default=0.0, ge=0)
    monthly_household_obligations_expenses: float = Field(default=0.0, ge=0)
    monthly_utility_expenses: float = Field(default=0.0, ge=0)
    cost_of_treatment: float = Field(default=0.0, ge=0)

    # 20 Categorical features (with sensible defaults for robust inference)
    sex: str = Field(default="UNKNOWN")
    marital_status: str = Field(default="UNKNOWN")
    employment_status: str = Field(default="UNKNOWN")
    residence_status: str = Field(default="UNKNOWN")
    educational_attainment: str = Field(default="UNKNOWN")
    housing_condition: str = Field(default="UNKNOWN")
    sectoral_membership: str = Field(default="NONE")
    disability_status: str = Field(default="NONE")
    diagnosis_severity: str = Field(default="MODERATE")
    type_of_treatment_surgery: str = Field(default="UNKNOWN")
    laterality: str = Field(default="NOT_APPLICABLE")
    patient_clinical_type: str = Field(default="NEW_PATIENT")
    assistance_type: str = Field(default="MEDICAL_ASSISTANCE")
    certificate_of_indigency: str = Field(default="NO")
    proof_of_income_employment: str = Field(default="NO")
    government_id: str = Field(default="NO")
    utility_bill_document: str = Field(default="NO")
    referral_letter: str = Field(default="NO")
    philhealth_document: str = Field(default="NO")
    medical_record_diagnosis_treatment_plan: str = Field(default="NO")

    # Optional legacy fields for backward compatibility
    occupation: Optional[str] = None
    existing_financial_assistance: Optional[float] = 0.0
    outstanding_medical_bills: Optional[float] = 0.0
    diagnosis: Optional[str] = None
    procedure: Optional[str] = None
    doc_visual_mean: Optional[float] = 0.0
    doc_visual_std: Optional[float] = 0.0
    doc_visual_max: Optional[float] = 0.0
    doc_visual_l2norm: Optional[float] = 0.0
    sbert_text_mean: Optional[float] = 0.0
    sbert_text_std: Optional[float] = 0.0
    sbert_text_l2norm: Optional[float] = 0.0
    doc_indigency_verified: Optional[int] = 0


class MLPredictRequest(BaseModel):
    assessment_id: Optional[str] = None
    model_candidate: str = Field(
        default="ensemble",
        description="logistic_regression | catboost | ebm | ensemble"
    )
    features: MLFeatureSchema
    api_classification: Optional[str] = None
    allow_experimental_binary: bool = Field(
        default=False,
        description="Enable binary classification inference for validated Phase 05 models"
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
