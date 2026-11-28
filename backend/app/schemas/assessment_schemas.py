from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MSWInterviewInfo(BaseModel):
    interview_date: str = Field(default="")
    interview_start_time: Optional[str] = Field(default="")
    interview_end_time: Optional[str] = Field(default="")
    assigned_msw: str = Field(default="Maria Santos, RSW")
    interviewed_person: str = Field(default="PATIENT")  # PATIENT | REPRESENTATIVE
    representative_relationship: Optional[str] = Field(default="")
    interview_method: str = Field(default="FACE_TO_FACE")  # FACE_TO_FACE | TELECONSULTATION | HOSPITAL_BEDSIDE | HOME_VISIT
    interview_status: str = Field(default="IN_PROGRESS")  # NOT_STARTED | IN_PROGRESS | COMPLETED
    consent_obtained: bool = Field(default=True)
    consent_notes: Optional[str] = Field(default="")


class PatientFamilyBackground(BaseModel):
    living_situation: str = Field(default="")
    living_situation_obs: str = Field(default="")
    household_composition: str = Field(default="")
    household_composition_obs: str = Field(default="")
    family_support: str = Field(default="")
    family_support_obs: str = Field(default="")
    employment_situation: str = Field(default="")
    employment_obs: str = Field(default="")
    income_sources: str = Field(default="")
    income_sources_obs: str = Field(default="")
    financial_responsibilities: str = Field(default="")
    financial_responsibilities_obs: str = Field(default="")


class MedicalFinancialDifficulties(BaseModel):
    medical_condition_summary: str = Field(default="")
    medical_condition_obs: str = Field(default="")
    problem_duration: str = Field(default="")
    previous_treatments: str = Field(default="")
    recommended_procedure: str = Field(default="")
    estimated_treatment_expenses: Optional[float] = Field(default=None)
    financial_barriers: str = Field(default="")
    financial_barriers_obs: str = Field(default="")
    service_accessibility: str = Field(default="")
    available_healthcare_resources: str = Field(default="")


class PsychosocialCircumstances(BaseModel):
    accessibility_concerns: str = Field(default="")
    discrimination_experienced: str = Field(default="")
    discrimination_obs: str = Field(default="")
    safety_hazards: str = Field(default="")
    safety_hazards_obs: str = Field(default="")
    social_responsibilities: str = Field(default="")
    social_responsibilities_obs: str = Field(default="")
    support_systems: str = Field(default="")
    support_systems_obs: str = Field(default="")
    basic_needs_living_conditions: str = Field(default="")
    basic_needs_obs: str = Field(default="")
    coping_capacity_narrative: str = Field(default="")
    coping_capacity_obs: str = Field(default="")


class Stage2InterviewAnswerItem(BaseModel):
    question_key: str
    question_text: Optional[str] = ""
    patient_answer: Optional[str] = ""
    msw_observation: Optional[str] = ""


class Stage2StructuredDomainFactor(BaseModel):
    factor: str
    severity_level: Optional[str] = Field(default=None, description="Deprecated legacy field; optional")
    coping_level: Optional[str] = Field(default=None, description="Deprecated legacy field; optional")
    patient_reported: Optional[str] = ""
    msw_observation: Optional[str] = ""


class Stage2EvaluationRequest(BaseModel):
    patient_id: Optional[str] = None
    total_household_income: Optional[Decimal] = None
    household_size: Optional[int] = None
    total_monthly_expenses: Optional[Decimal] = None
    sectoral_flags: Optional[Dict[str, bool]] = None
    gov_assistance_enrolled: Optional[bool] = None
    other_medical_expenses_count: Optional[int] = None
    auto_compute_scores: Optional[bool] = Field(default=False, description="Deprecated legacy flag; ignored unless legacy scoring requested")
    is_initial_load: bool = False
    assessment_context: str = "live_recalculation"
    interview_info: Optional[MSWInterviewInfo] = None
    background: Optional[PatientFamilyBackground] = None
    medical_difficulties: Optional[MedicalFinancialDifficulties] = None
    psychosocial: Optional[PsychosocialCircumstances] = None
    interview_answers: Optional[List[Stage2InterviewAnswerItem]] = None
    # Domain V: Health factors (open-ended Q&A; severity/coping optional legacy)
    health_factors: Optional[List[Stage2StructuredDomainFactor]] = None
    # Domain VI: Discrimination
    discrimination_severity_level: Optional[str] = None
    discrimination_coping_level: Optional[str] = None
    discrimination_patient_reported: Optional[str] = ""
    discrimination_msw_observation: Optional[str] = ""
    # Domain VII: Safety
    safety_severity_level: Optional[str] = None
    safety_coping_level: Optional[str] = None
    safety_patient_reported: Optional[str] = ""
    safety_msw_observation: Optional[str] = ""
    # Domain VIII: Social Roles
    roles_severity_level: Optional[str] = None
    roles_coping_level: Optional[str] = None
    roles_patient_reported: Optional[str] = ""
    roles_msw_observation: Optional[str] = ""
    # Domain IX: Environment
    environment_severity_level: Optional[str] = None
    environment_patient_reported: Optional[str] = ""
    environment_msw_observation: Optional[str] = ""


class Stage2EvaluationResponse(BaseModel):
    is_complete: bool = True
    status: str = "INTERVIEW_RECORDED"
    message: str = "Stage 2 qualitative interview recorded."
    interview_answers: List[Stage2InterviewAnswerItem] = Field(default_factory=list)
    missing_factors: List[str] = Field(default_factory=list)
    missing_mappings: List[str] = Field(default_factory=list)
    institutional_confirmation_required: bool = False
    average_severity: Optional[Decimal] = None
    average_coping: Optional[Decimal] = None
    total_risk: Optional[Decimal] = None
    total_risk_formula: Optional[str] = None
    total_household_income: Optional[Decimal] = None
    computed_domain_scores: Optional[Dict[str, Any]] = None
    financial_classification: Optional[Dict[str, Any]] = None
    msw_classification: Optional[Dict[str, Any]] = None
    triggered_conditions: List[Dict[str, Any]] = Field(default_factory=list)
    calculation_basis: Optional[str] = "STAGE2_TEXT_INTERVIEW_ONLY"
    rubric_version: Optional[str] = None
    interview_assessment: Optional[Dict[str, Any]] = None


class InterviewSaveRequest(BaseModel):
    interview_info: Optional[MSWInterviewInfo] = None
    background: Optional[PatientFamilyBackground] = None
    medical_difficulties: Optional[MedicalFinancialDifficulties] = None
    psychosocial: Optional[PsychosocialCircumstances] = None
    health_factors: Optional[List[Stage2StructuredDomainFactor]] = None
    interview_answers: Optional[List[Stage2InterviewAnswerItem]] = None
    discrimination_patient_reported: Optional[str] = None
    discrimination_msw_observation: Optional[str] = None
    safety_patient_reported: Optional[str] = None
    safety_msw_observation: Optional[str] = None
    roles_patient_reported: Optional[str] = None
    roles_msw_observation: Optional[str] = None
    environment_patient_reported: Optional[str] = None
    environment_msw_observation: Optional[str] = None
    notes: Optional[str] = None
    mark_completed: bool = False


class AssessmentCreateRequest(BaseModel):
    patient_id: str = Field(..., min_length=1)
    referral_id: Optional[str] = None
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
    referral_id: Optional[str] = None
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
    decision: Optional[str] = Field(default=None, description="APPROVED | DECLINED (manual MSW procedure subsidy decision)")
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
