from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query

from app.core.audit import log_audit_event
from app.core.rbac import UserRole, require_roles
from app.schemas.assessment_schemas import (
    AssessmentCreateRequest,
    AssessmentSubmitRequest,
    AssessmentUpdateRequest,
    InstitutionalApprovalRequest,
    InterviewSaveRequest,
    MSWRecommendationRequest,
    Stage2EvaluationRequest,
    Stage2EvaluationResponse,
)
from app.services.assessment_service import assessment_service
from app.services.inquiry_service import inquiry_service

router = APIRouter(prefix="/assessments", tags=["MSW Assessments"])


def _resolve_patient_msw(patient_id: str, fallback_uid: str = "msw_lead") -> str:
    try:
        from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY
        for p in REGISTERED_PATIENTS_REGISTRY:
            if str(p.get("patient_id") or "").strip().upper() == str(patient_id or "").strip().upper():
                return inquiry_service.resolve_msw_user_id(p.get("assigned_msw") or fallback_uid)
    except Exception:
        pass
    return inquiry_service.resolve_msw_user_id(fallback_uid)


def _has_approved_charity_referral(patient_id: str) -> bool:
    try:
        from app.services.referral_service import referral_service
        for ref in referral_service.list_referrals(patient_id=patient_id):
            if str(ref.get("status") or "").upper() in ("MSW APPROVED", "APPROVED") or ref.get("charity_case_no"):
                return True
    except Exception:
        pass
    return False


def _assert_charity_patient_eligible(patient_id: str) -> None:
    """Allow Charity-registered patients AND Regular patients granted charity beneficiary
    status through an MSW-approved Medical Assistance referral (approve_referral keeps
    category=REGULAR and sets charity_status / is_charity_beneficiary / charity_case_no)."""
    try:
        from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY
        for p in REGISTERED_PATIENTS_REGISTRY:
            if str(p.get("patient_id") or "").strip().upper() == str(patient_id or "").strip().upper():
                cat = str(p.get("category") or "").strip().upper()
                is_beneficiary = (
                    bool(p.get("is_charity_beneficiary"))
                    or str(p.get("charity_status") or "").strip().upper() == "APPROVED"
                    or bool(p.get("charity_case_no"))
                )
                if cat != "CHARITY" and not is_beneficiary and not _has_approved_charity_referral(patient_id):
                    raise HTTPException(
                        status_code=403,
                        detail=f"Patient '{patient_id}' is classified as a Regular Patient ({cat or 'REGULAR'}). Only Charity Patients are eligible for MSW Charity Assessments.",
                    )
                return
    except HTTPException:
        raise
    except Exception:
        pass


@router.get("")
def list_assessments(
    patient_id: Optional[str] = Query(default=None),
    referral_id: Optional[str] = Query(default=None),
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.NURSE])),
):
    return assessment_service.list_assessments(patient_id=patient_id, referral_id=referral_id)


@router.get("/patient/{patient_id}/latest-draft")
def get_latest_patient_draft(
    patient_id: str,
    referral_id: Optional[str] = Query(default=None),
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
):
    draft = assessment_service.get_latest_draft_for_patient(patient_id=patient_id, referral_id=referral_id)
    if not draft:
        return {"found": False, "assessment": None}
    return {"found": True, "assessment": draft}


@router.post("", status_code=201)
def create_assessment(
    payload: AssessmentCreateRequest,
    role: UserRole = Depends(require_roles([UserRole.MSW])),
    x_user_id: str = Header(default="msw_lead"),
):
    _assert_charity_patient_eligible(payload.patient_id)
    record = assessment_service.create_assessment(payload, actor_id=x_user_id, role=role.value)
    log_audit_event(
        action="ASSESSMENT_CREATED",
        actor_id=x_user_id,
        role=role.value,
        resource=f"assessment:{record['id']}",
        status="SUCCESS",
        details={"patient_id": payload.patient_id, "encounter_no": record["encounter_no"]},
    )
    try:
        target_msw = _resolve_patient_msw(payload.patient_id, x_user_id)
        inquiry_service.create_msw_notification(
            recipient_user_id=target_msw,
            notification_type="ASSESSMENT_DRAFT_SAVED",
            title=f"Assessment Draft Initialized ({payload.patient_id})",
            message=f"Assessment {record['id']} (Encounter {record['encounter_no']}) has been initialized for patient {payload.patient_id}.",
            target_destination=f"/patients/{payload.patient_id}?tab=assessment",
            related_patient_id=payload.patient_id,
            related_encounter_id=record.get("encounter_no"),
            related_assessment_id=record["id"],
            dedup_key=f"ASMT_CREATED:{record['id']}:{target_msw}",
        )
    except Exception:
        pass
    return record


@router.get("/{assessment_id}")
def get_assessment(
    assessment_id: str,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
):
    record = assessment_service.get_assessment(assessment_id)
    if not record:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return record


@router.patch("/{assessment_id}")
def update_assessment(
    assessment_id: str,
    payload: AssessmentUpdateRequest,
    role: UserRole = Depends(require_roles([UserRole.MSW])),
    x_user_id: str = Header(default="msw_lead"),
):
    record = assessment_service.update_assessment(assessment_id, payload, actor_id=x_user_id, role=role.value)
    log_audit_event(
        action="ASSESSMENT_DRAFT_UPDATED",
        actor_id=x_user_id,
        role=role.value,
        resource=f"assessment:{assessment_id}",
        status="SUCCESS",
        details={"workflow_status": record["workflow_status"], "active_stage": record["active_stage"]},
    )
    try:
        pid = record.get("patient_id") or ""
        target_msw = _resolve_patient_msw(pid, x_user_id)
        inquiry_service.create_msw_notification(
            recipient_user_id=target_msw,
            notification_type="ASSESSMENT_DRAFT_SAVED",
            title=f"Assessment Draft Updated ({pid})",
            message=f"Assessment {assessment_id} saved at Stage {record.get('active_stage', 1)} ({record.get('workflow_status', 'DRAFT')}).",
            target_destination=f"/patients/{pid}?tab=assessment",
            related_patient_id=pid,
            related_encounter_id=record.get("encounter_no"),
            related_assessment_id=assessment_id,
            dedup_key=f"ASMT_DRAFT:{assessment_id}:S{record.get('active_stage', 1)}:{record.get('workflow_status', 'DRAFT')}:{target_msw}",
        )
    except Exception:
        pass
    return record


@router.post("/{assessment_id}/submit")
def submit_assessment(
    assessment_id: str,
    payload: AssessmentSubmitRequest = AssessmentSubmitRequest(),
    role: UserRole = Depends(require_roles([UserRole.MSW])),
    x_user_id: str = Header(default="msw_lead"),
):
    record = assessment_service.submit_and_classify(assessment_id, payload, actor_id=x_user_id, role=role.value)
    log_audit_event(
        action="ASSESSMENT_SUBMITTED_AND_CLASSIFIED",
        actor_id=x_user_id,
        role=role.value,
        resource=f"assessment:{assessment_id}",
        status="SUCCESS",
        details={
            "patient_id": record["patient_id"],
            "workflow_status": record["workflow_status"],
        },
    )
    try:
        pid = record.get("patient_id") or ""
        target_msw = _resolve_patient_msw(pid, x_user_id)
        comb = ((record.get("classification_result") or {}).get("combined_recommendation") or "Classified")
        inquiry_service.create_msw_notification(
            recipient_user_id=target_msw,
            notification_type="ASSESSMENT_SUBMITTED",
            title=f"Assessment Submitted for Review ({pid})",
            message=f"Assessment {assessment_id} for patient {pid} has been submitted and classified ({comb}).",
            target_destination=f"/patients/{pid}?tab=assessment",
            related_patient_id=pid,
            related_encounter_id=record.get("encounter_no"),
            related_assessment_id=assessment_id,
            dedup_key=f"ASMT_SUBMIT:{assessment_id}:{record.get('workflow_status')}:{target_msw}",
        )
    except Exception:
        pass
    return record


@router.get("/{assessment_id}/classification")
def get_assessment_classification(
    assessment_id: str,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
):
    record = assessment_service.get_assessment(assessment_id)
    if not record:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return {
        "assessment_id": assessment_id,
        "classification_result": record.get("classification_result"),
        "classification_history": record.get("classification_history", []),
    }


@router.get("/{assessment_id}/history")
def get_assessment_history(
    assessment_id: str,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
):
    record = assessment_service.get_assessment(assessment_id)
    if not record:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return {
        "assessment_id": assessment_id,
        "patient_id": record.get("patient_id"),
        "workflow_status": record.get("workflow_status"),
        "history": record.get("history", []),
    }


@router.post("/{assessment_id}/recommendation")
def post_msw_recommendation(
    assessment_id: str,
    payload: MSWRecommendationRequest,
    role: UserRole = Depends(require_roles([UserRole.MSW])),
    x_user_id: str = Header(default="msw_lead"),
):
    record = assessment_service.record_msw_recommendation(
        assessment_id, payload, actor_id=x_user_id, role=role.value
    )
    log_audit_event(
        action="MSW_RECOMMENDATION_RECORDED",
        actor_id=x_user_id,
        role=role.value,
        resource=f"assessment:{assessment_id}",
        status="SUCCESS",
        details={
            "recommended_tier": payload.recommended_tier,
            "recommended_subsidy_pct": payload.recommended_subsidy_pct,
        },
    )
    try:
        pid = record.get("patient_id") or ""
        target_msw = _resolve_patient_msw(pid, x_user_id)
        inquiry_service.create_msw_notification(
            recipient_user_id=target_msw,
            notification_type="ASSESSMENT_SUBMITTED",
            title=f"MSW Eligibility Recommendation Recorded ({pid})",
            message=f"Recommended {payload.recommended_tier} ({payload.recommended_subsidy_pct}% subsidy) for patient {pid}.",
            target_destination=f"/patients/{pid}?tab=assessment",
            related_patient_id=pid,
            related_encounter_id=record.get("encounter_no"),
            related_assessment_id=assessment_id,
            dedup_key=f"ASMT_REC:{assessment_id}:{payload.recommended_tier}:{payload.recommended_subsidy_pct}:{target_msw}",
        )
    except Exception:
        pass
    return record


@router.post("/{assessment_id}/approval")
def post_institutional_approval(
    assessment_id: str,
    payload: InstitutionalApprovalRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN])),
    x_user_id: str = Header(default="admin_officer"),
):
    record = assessment_service.record_institutional_approval(
        assessment_id, payload, actor_id=x_user_id, role=role.value
    )
    log_audit_event(
        action="INSTITUTIONAL_APPROVAL_DECISION",
        actor_id=x_user_id,
        role=role.value,
        resource=f"assessment:{assessment_id}",
        status="SUCCESS",
        details={
            "decision": payload.decision,
            "approved_subsidy_percentage": payload.approved_subsidy_percentage,
        },
    )
    try:
        pid = record.get("patient_id") or ""
        target_msw = _resolve_patient_msw(pid, record.get("created_by") or "msw_lead")
        dec = str(payload.decision or "").upper()
        if dec == "APPROVED":
            ntype = "CHARITY_APPROVED"
            title = f"Admin Approved Charity Assistance ({pid})"
            msg = f"Institutional approval granted ({payload.approved_subsidy_percentage}% subsidy) for assessment {assessment_id}."
        elif dec in ("REJECTED", "DISAPPROVED"):
            ntype = "CHARITY_DENIED_OR_PROMISSORY"
            title = f"Charity Decision Updated: {dec} ({pid})"
            msg = f"Admin recorded decision '{dec}' for patient {pid} (Assessment {assessment_id}): {payload.decision_notes or 'Review required'}."
        else:
            ntype = "ADMIN_DECISION_UPDATED"
            title = f"Admin Updated Assessment Status: {dec} ({pid})"
            msg = f"Admin updated assessment {assessment_id} for patient {pid} to {dec}."
        inquiry_service.create_msw_notification(
            recipient_user_id=target_msw,
            notification_type=ntype,
            title=title,
            message=msg,
            target_destination=f"/patients/{pid}?tab=assessment",
            related_patient_id=pid,
            related_encounter_id=record.get("encounter_no"),
            related_assessment_id=assessment_id,
            dedup_key=f"ASMT_APPROVAL:{assessment_id}:{dec}:{payload.approved_subsidy_percentage}:{target_msw}",
        )
    except Exception:
        pass
    return record


@router.post("/{assessment_id}/evaluate-stage2", response_model=Stage2EvaluationResponse)
def post_evaluate_stage2(
    assessment_id: str,
    payload: Stage2EvaluationRequest,
    role: UserRole = Depends(require_roles([UserRole.MSW])),
    x_user_id: str = Header(default="msw_lead"),
):
    result = assessment_service.evaluate_stage2(
        assessment_id, payload, actor_id=x_user_id, role=role.value
    )
    log_audit_event(
        action="STAGE2_EVALUATE_INTERVIEW",
        actor_id=x_user_id,
        role=role.value,
        resource=f"assessment:{assessment_id}",
        status="SUCCESS",
        details={
            "is_complete": result.get("is_complete"),
            "status": result.get("status"),
            "total_risk": str(result.get("total_risk")),
            "missing_factors": result.get("missing_factors", []),
        },
    )
    return result


@router.post("/{assessment_id}/interview")
def post_save_interview(
    assessment_id: str,
    payload: InterviewSaveRequest,
    role: UserRole = Depends(require_roles([UserRole.MSW])),
    x_user_id: str = Header(default="msw_lead"),
):
    dumped = payload.model_dump(exclude_unset=True)
    mark_completed = dumped.pop("mark_completed", False)
    record = assessment_service.save_interview_draft(
        assessment_id,
        payload=dumped,
        actor_id=x_user_id,
        role=role.value,
        mark_completed=mark_completed,
    )
    log_audit_event(
        action="INTERVIEW_SAVED",
        actor_id=x_user_id,
        role=role.value,
        resource=f"assessment:{assessment_id}",
        status="SUCCESS",
        details={"mark_completed": mark_completed},
    )
    return record
