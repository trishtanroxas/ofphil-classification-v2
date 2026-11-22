from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AssessmentCreateRequest(BaseModel):
    patient_id: str = Field(..., min_length=1)
    encounter_no: Optional[str] = None
    interview_date: Optional[str] = None
    source_of_referral: Optional[str] = None
    stage1_data: Optional[Dict[str, Any]] = None
    stage2_data: Optional[Dict[str, Any]] = None
    stage3_documents: Optional[List[str]] = None
    is_initial_load: bool = True


class AssessmentUpdateRequest(BaseModel):
    active_stage: Optional[int] = Field(default=None, ge=1, le=4)
    workflow_status: Optional[str] = None
    interview_date: Optional[str] = None
    source_of_referral: Optional[str] = None
    stage1_data: Optional[Dict[str, Any]] = None
    stage2_data: Optional[Dict[str, Any]] = None
    stage3_documents: Optional[List[str]] = None
    is_initial_load: Optional[bool] = None


class AssessmentSubmitRequest(BaseModel):
    is_initial_load: bool = False
    assessment_context: str = "live_recalculation"


class MSWRecommendationRequest(BaseModel):
    recommended_tier: str = Field(..., min_length=1)
    recommended_subsidy_pct: float = Field(..., ge=0, le=100)
    case_notes: str = Field(..., min_length=3, max_length=4000)
    discrepancy_explanation: Optional[str] = None
    override_reason: Optional[str] = None
    msw_assessor_name: Optional[str] = None


class InstitutionalApprovalRequest(BaseModel):
    decision: str = Field(..., description="APPROVED | REJECTED | RETURNED_FOR_REVISION")
    approved_subsidy_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    decision_notes: str = Field(..., min_length=3, max_length=4000)
    approver_name: Optional[str] = None
