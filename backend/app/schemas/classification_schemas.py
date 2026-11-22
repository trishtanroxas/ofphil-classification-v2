from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class FinancialClassificationRequest(BaseModel):
    total_monthly_household_income: Decimal = Field(..., ge=0, description="Total monthly household income in PHP")
    household_size: int = Field(..., ge=1, le=50, description="Number of household members (must be >= 1)")

    @field_validator("total_monthly_household_income")
    @classmethod
    def validate_income_non_negative(cls, v: Decimal) -> Decimal:
        if v < Decimal("0"):
            raise ValueError("Total monthly household income cannot be negative.")
        return v


class FinancialClassificationResponse(BaseModel):
    monthly_per_capita_income: Decimal
    total_monthly_household_income: Decimal
    household_size: int
    classification: str
    classification_label: str
    reference_threshold: Optional[Decimal] = None
    pcpt_reference: Decimal = Decimal("3368.40")
    family_of_five_reference: Decimal = Decimal("16842.00")
    classification_basis: str = "OFPHIL_FINANCIAL_RUBRIC"
    rubric_version: str = "1.0"
    explanation: str


class MSWScoreFactors(BaseModel):
    health_factors: Optional[List[Decimal]] = Field(default=None, description="List of health factor severity/coping scores")
    health_severity_avg: Optional[Decimal] = Field(default=None, ge=0, le=6)
    discrimination_severity: Optional[Decimal] = Field(default=None, ge=0, le=6)
    safety_severity: Optional[Decimal] = Field(default=None, ge=0, le=6)
    roles_severity: Optional[Decimal] = Field(default=None, ge=0, le=6)
    environment_severity: Optional[Decimal] = Field(default=None, ge=0, le=6)

    health_coping_avg: Optional[Decimal] = Field(default=None, ge=0, le=6)
    discrimination_coping: Optional[Decimal] = Field(default=None, ge=0, le=6)
    safety_coping: Optional[Decimal] = Field(default=None, ge=0, le=6)
    roles_coping: Optional[Decimal] = Field(default=None, ge=0, le=6)


class MSWClassificationRequest(BaseModel):
    average_severity: Optional[Decimal] = Field(default=None, ge=0, le=6, description="Average clinical severity (0-6)")
    average_coping: Optional[Decimal] = Field(default=None, ge=0, le=6, description="Average coping capacity (0-6)")
    factors: Optional[MSWScoreFactors] = None
    total_household_income: Optional[Decimal] = Field(default=None, ge=0, description="Total monthly household income in PHP")
    is_initial_load: bool = Field(default=False, description="True only during initial intake load when income triggers apply")
    assessment_context: str = Field(default="live_recalculation", description="Context: 'initial_load' or 'live_recalculation'")


class TriggeredCondition(BaseModel):
    tier: str
    rule: str
    metric: str
    actual_value: str
    threshold: str
    context_applicable: bool = True


class MSWClassificationResponse(BaseModel):
    classification: str
    classification_label: str
    proposed_subsidy: str
    subsidy_percentage_range: str
    average_severity: Decimal
    average_coping: Decimal
    total_risk: Decimal
    total_risk_formula: str = "(Average Severity * 8.5) + (Average Coping * 5.0)"
    triggered_conditions: List[TriggeredCondition]
    classification_precedence: List[str]
    initial_load_applied: bool
    assessment_context: str
    missing_factors: List[str] = Field(default_factory=list)
    calculation_breakdown: Dict[str, Any]
    classification_basis: str = "OFPHIL_MSW_RUBRIC"
    rubric_version: str = "1.0"
    explanation: str


class CombinedClassificationRequest(BaseModel):
    total_monthly_household_income: Decimal = Field(..., ge=0)
    household_size: int = Field(..., ge=1, le=50)
    average_severity: Optional[Decimal] = Field(default=None, ge=0, le=5)
    average_coping: Optional[Decimal] = Field(default=None, ge=0, le=5)
    factors: Optional[MSWScoreFactors] = None
    is_initial_load: bool = False
    assessment_context: str = "live_recalculation"


class CombinedClassificationResponse(BaseModel):
    financial_classification: FinancialClassificationResponse
    msw_classification: MSWClassificationResponse
    monthly_per_capita_income: Decimal
    average_severity: Decimal
    average_coping: Decimal
    total_risk: Decimal
    triggered_conditions: List[TriggeredCondition]
    subsidy_recommendation: str
    discrepancy_detected: bool
    discrepancy_details: Optional[str] = None
    requires_msw_review: bool
    rubric_version: str = "1.0"
    explanations: Dict[str, str]
