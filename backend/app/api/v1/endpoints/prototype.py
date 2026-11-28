"""
Prototype System API Endpoints.
Demonstrates the complete approved OFPHIL Clinical Decision Support Architecture:
1. Pipeline 1: ResNet-50 Classification, PaddleOCR, Signatures/Stamps, Forensics, Evidence Aggregation
2. Pipeline 2: LLM Structured Interview (Qwen3-4B representation), Information Extraction, 4-D Consistency
3. Pipeline 3: ML Eligibility Classification (Logistic Regression, CatBoost, EBM, Soft-Voting Ensemble)
4. Centralized Consolidation & Data Reconciliation (Zero Late Fusion)
5. MSW Verification & Explainable Assessment Report Generation

Every endpoint strictly enforces role-based access control, input validation, and emits:
execution_mode: "PROTOTYPE_SIMULATED"
All demonstration data is saved to backend/storage/prototype/ completely isolated from ML research.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query

from app.core.audit import log_audit_event
from app.core.rbac import UserRole, require_roles
from app.schemas.prototype_schemas import (
    PrototypeAssessmentReportRequest,
    PrototypeAssessmentReportResponse,
    PrototypeConsolidationRequest,
    PrototypeConsolidationResponse,
    PrototypeDocumentClassificationRequest,
    PrototypeDocumentClassificationResponse,
    PrototypeEligibilityPredictionRequest,
    PrototypeEligibilityPredictionResponse,
    PrototypeEvidenceAggregationRequest,
    PrototypeEvidenceAggregationResponse,
    PrototypeForensicAnalysisRequest,
    PrototypeForensicAnalysisResponse,
    PrototypeInterviewConsistencyRequest,
    PrototypeInterviewConsistencyResponse,
    PrototypeInterviewTurnRequest,
    PrototypeInterviewTurnResponse,
    PrototypeMSWVerificationRequest,
    PrototypeOCRExtractionRequest,
    PrototypeOCRExtractionResponse,
    PrototypeSignatureStampScreeningRequest,
    PrototypeSignatureStampScreeningResponse,
)
from app.services.prototype_system_service import prototype_system_service

router = APIRouter(prefix="/prototype", tags=["Prototype System API (Architecture Demonstration)"])


# -----------------------------------------------------------------------------
# PIPELINE 1: DOCUMENT SCREENING & IMAGE FORENSICS
# -----------------------------------------------------------------------------

@router.post("/documents/classify", response_model=PrototypeDocumentClassificationResponse)
def prototype_classify_document(
    payload: PrototypeDocumentClassificationRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.RESEARCHER])),
    x_user_id: str = Header(default="msw_lead"),
):
    """
    Demonstrates ResNet-50 5-class document categorization.
    Categories: certificate_of_indigency, government_id, electricity_bill, water_bill, medical_certificate.
    """
    res = prototype_system_service.classify_document(
        document_id=payload.document_id,
        patient_id=payload.patient_id,
        document_name=payload.document_name,
        simulate_category=payload.simulate_category,
    )
    log_audit_event(
        action="PROTOTYPE_DOC_CLASSIFICATION",
        actor_id=x_user_id,
        role=role.value,
        resource=f"document:{payload.document_id}",
        status="SUCCESS",
        details={"category": res.predicted_category, "mode": res.execution_mode},
    )
    return res


@router.post("/documents/ocr", response_model=PrototypeOCRExtractionResponse)
def prototype_extract_ocr(
    payload: PrototypeOCRExtractionRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.RESEARCHER])),
    x_user_id: str = Header(default="msw_lead"),
):
    """
    Demonstrates PaddleOCR PP-OCRv6 multilingual text and key-value extraction.
    """
    res = prototype_system_service.extract_ocr(
        document_id=payload.document_id,
        document_category=payload.document_category,
    )
    log_audit_event(
        action="PROTOTYPE_DOC_OCR",
        actor_id=x_user_id,
        role=role.value,
        resource=f"document:{payload.document_id}",
        status="SUCCESS",
        details={"fields_extracted": len(res.extracted_fields), "mode": res.execution_mode},
    )
    return res


@router.post("/documents/screening/signatures-stamps", response_model=PrototypeSignatureStampScreeningResponse)
def prototype_screen_signatures_stamps(
    payload: PrototypeSignatureStampScreeningRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.RESEARCHER])),
    x_user_id: str = Header(default="msw_lead"),
):
    """
    Demonstrates dedicated morphological and Hough-based signature and stamp screening (Zero YOLO).
    """
    res = prototype_system_service.screen_signatures_and_stamps(
        document_id=payload.document_id,
        has_signature_expected=payload.has_signature_expected,
        has_stamp_expected=payload.has_stamp_expected,
    )
    log_audit_event(
        action="PROTOTYPE_SIGNATURE_STAMP_SCREENING",
        actor_id=x_user_id,
        role=role.value,
        resource=f"document:{payload.document_id}",
        status="SUCCESS",
        details={"overall_status": res.overall_status, "mode": res.execution_mode},
    )
    return res


@router.post("/documents/forensics", response_model=PrototypeForensicAnalysisResponse)
def prototype_analyze_forensics(
    payload: PrototypeForensicAnalysisRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.RESEARCHER])),
    x_user_id: str = Header(default="msw_lead"),
):
    """
    Demonstrates 5 image forensic analyzers: ELA, Laplacian noise, chromatic dispersion, ORB copy-move, edge disparity.
    """
    res = prototype_system_service.analyze_forensics(document_id=payload.document_id)
    log_audit_event(
        action="PROTOTYPE_FORENSIC_ANALYSIS",
        actor_id=x_user_id,
        role=role.value,
        resource=f"document:{payload.document_id}",
        status="SUCCESS",
        details={"score": res.overall_forensic_score, "anomalies": res.anomaly_count, "mode": res.execution_mode},
    )
    return res


@router.post("/documents/evidence-aggregation", response_model=PrototypeEvidenceAggregationResponse)
def prototype_aggregate_evidence(
    payload: PrototypeEvidenceAggregationRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.RESEARCHER])),
    x_user_id: str = Header(default="msw_lead"),
):
    """
    Demonstrates deterministic rule-based evidence aggregation.
    No trained tampering classifier. Allowed verdicts:
    NO_SUSPICIOUS_INDICATORS, NEEDS_VERIFICATION, FLAGGED_FOR_MANUAL_REVIEW, INSUFFICIENT_IMAGE_QUALITY.
    """
    res = prototype_system_service.aggregate_evidence(
        document_id=payload.document_id,
        classification_result=payload.classification_result,
        ocr_result=payload.ocr_result,
        signature_result=payload.signature_result,
        stamp_result=payload.stamp_result,
        forensic_result=payload.forensic_result,
    )
    log_audit_event(
        action="PROTOTYPE_EVIDENCE_AGGREGATION",
        actor_id=x_user_id,
        role=role.value,
        resource=f"document:{payload.document_id}",
        status="SUCCESS",
        details={"verdict": res.screening_verdict, "risk": res.risk_level, "mode": res.execution_mode},
    )
    return res


# -----------------------------------------------------------------------------
# PIPELINE 2: LLM-ASSISTED PATIENT INTERVIEW
# -----------------------------------------------------------------------------

@router.post("/interview/turn", response_model=PrototypeInterviewTurnResponse)
def prototype_interview_turn(
    payload: PrototypeInterviewTurnRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.RESEARCHER])),
    x_user_id: str = Header(default="msw_lead"),
):
    """
    Demonstrates Qwen3-4B-Instruct-2507 structured interview turn and entity extraction.
    """
    res = prototype_system_service.process_interview_turn(
        patient_id=payload.patient_id,
        conversation_history=payload.conversation_history,
        patient_statement=payload.patient_statement,
    )
    log_audit_event(
        action="PROTOTYPE_INTERVIEW_TURN",
        actor_id=x_user_id,
        role=role.value,
        resource=f"patient:{payload.patient_id}",
        status="SUCCESS",
        details={"turn": res.conversation_turn, "mode": res.execution_mode},
    )
    return res


@router.post("/interview/consistency", response_model=PrototypeInterviewConsistencyResponse)
def prototype_interview_consistency(
    payload: PrototypeInterviewConsistencyRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.RESEARCHER])),
    x_user_id: str = Header(default="msw_lead"),
):
    """
    Demonstrates the 4-dimension interview consistency assessment:
    1. Information Consistency (35%)
    2. Response Completeness (25%)
    3. Cross-Field Consistency (25%)
    4. Clarification Resolution (15%)
    """
    res = prototype_system_service.assess_interview_consistency(
        patient_id=payload.patient_id,
        interview_transcript=payload.interview_transcript,
        structured_responses=payload.structured_responses,
        clarification_answers=payload.clarification_answers,
        interview_answers=payload.interview_answers,
        clarification_items=payload.clarification_items,
        background=payload.background,
        medical_difficulties=payload.medical_difficulties,
        psychosocial=payload.psychosocial,
        total_household_income=payload.total_household_income,
        household_size=payload.household_size,
    )
    log_audit_event(
        action="PROTOTYPE_INTERVIEW_CONSISTENCY",
        actor_id=x_user_id,
        role=role.value,
        resource=f"patient:{payload.patient_id}",
        status="SUCCESS",
        details={"consistency_score": res.overall_consistency_score, "mode": res.execution_mode},
    )
    return res


# -----------------------------------------------------------------------------
# PIPELINE 3: ML ELIGIBILITY CLASSIFICATION (APPROVED 27 PREDICTORS)
# -----------------------------------------------------------------------------

@router.post("/eligibility/predict", response_model=PrototypeEligibilityPredictionResponse)
def prototype_predict_eligibility(
    payload: PrototypeEligibilityPredictionRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.RESEARCHER])),
    x_user_id: str = Header(default="msw_lead"),
):
    """
    Demonstrates ML Eligibility Classification using the approved models:
    Logistic Regression, CatBoost, EBM, and Soft Voting Ensemble.
    Uses strictly the 27 approved predictors.
    """
    res = prototype_system_service.predict_eligibility(
        patient_id=payload.patient_id,
        selected_model=payload.selected_model,
        features_27=payload.features_27,
    )
    log_audit_event(
        action="PROTOTYPE_ELIGIBILITY_PREDICTION",
        actor_id=x_user_id,
        role=role.value,
        resource=f"patient:{payload.patient_id}",
        status="SUCCESS",
        details={"model": res.model_name, "tier": res.predicted_grant_tier, "mode": res.execution_mode},
    )
    return res


# -----------------------------------------------------------------------------
# CENTRALIZED PATIENT DATA CONSOLIDATION (ZERO LATE FUSION)
# -----------------------------------------------------------------------------

@router.post("/consolidation/reconcile", response_model=PrototypeConsolidationResponse)
def prototype_consolidate_patient(
    payload: PrototypeConsolidationRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.RESEARCHER])),
    x_user_id: str = Header(default="msw_lead"),
):
    """
    Consolidates evidence from the 3 independent pipelines for MSW verification.
    Preserves pipeline independence — NO Multimodal Late Fusion.
    """
    res = prototype_system_service.consolidate_patient_data(
        patient_id=payload.patient_id,
        patient_demographics=payload.patient_demographics,
        document_screenings=payload.document_screenings,
        interview_findings=payload.interview_findings,
        eligibility_prediction=payload.eligibility_prediction,
    )
    log_audit_event(
        action="PROTOTYPE_DATA_CONSOLIDATION",
        actor_id=x_user_id,
        role=role.value,
        resource=f"patient:{payload.patient_id}",
        status="SUCCESS",
        details={"readiness": res.overall_readiness_for_msw, "mode": res.execution_mode},
    )
    return res


# -----------------------------------------------------------------------------
# MSW VERIFICATION & ASSESSMENT REPORT GENERATION
# -----------------------------------------------------------------------------

@router.post("/msw/verify")
def prototype_record_msw_verification(
    payload: PrototypeMSWVerificationRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
    x_user_id: str = Header(default="msw_lead"),
):
    """
    Records human caseworker verification and recommendation overrides.
    """
    res = prototype_system_service.record_msw_verification(
        patient_id=payload.patient_id,
        msw_id=payload.msw_id or x_user_id,
        verification_status=payload.verification_status,
        msw_remarks=payload.msw_remarks,
        document_check_notes=payload.document_check_notes,
        interview_check_notes=payload.interview_check_notes,
        eligibility_override_notes=payload.eligibility_override_notes,
        recommended_grant_tier=payload.recommended_grant_tier,
        recommended_subsidy_percentage=payload.recommended_subsidy_percentage,
    )
    log_audit_event(
        action="PROTOTYPE_MSW_VERIFICATION",
        actor_id=x_user_id,
        role=role.value,
        resource=f"patient:{payload.patient_id}",
        status="SUCCESS",
        details={"status": payload.verification_status, "mode": "PROTOTYPE_SIMULATED"},
    )
    return {"status": "SUCCESS", "message": "MSW Verification recorded.", "data": res}


@router.post("/reports/assessment", response_model=PrototypeAssessmentReportResponse)
def prototype_generate_assessment_report(
    payload: PrototypeAssessmentReportRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.RESEARCHER])),
    x_user_id: str = Header(default="msw_lead"),
):
    """
    Generates explainable assessment report consolidating all 3 pipeline outputs and MSW decisions.
    """
    res = prototype_system_service.generate_assessment_report(
        patient_id=payload.patient_id,
        assessment_id=payload.assessment_id,
        include_full_forensics=payload.include_full_forensics,
        include_interview_transcript=payload.include_interview_transcript,
    )
    log_audit_event(
        action="PROTOTYPE_REPORT_GENERATION",
        actor_id=x_user_id,
        role=role.value,
        resource=f"report:{res.report_id}",
        status="SUCCESS",
        details={"patient_id": payload.patient_id, "mode": res.execution_mode},
    )
    return res
