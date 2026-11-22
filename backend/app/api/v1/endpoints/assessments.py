from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query

from app.core.audit import log_audit_event
from app.core.rbac import UserRole, require_roles
from app.schemas.assessment_schemas import (
    AssessmentCreateRequest,
    AssessmentSubmitRequest,
    AssessmentUpdateRequest,
    InstitutionalApprovalRequest,
    MSWRecommendationRequest,
)
from app.services.assessment_service import assessment_service

router = APIRouter(prefix="/assessments", tags=["MSW Assessments"])


@router.get("")
def list_assessments(
    patient_id: Optional[str] = Query(default=None),
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.NURSE])),
):
    return assessment_service.list_assessments(patient_id=patient_id)


@router.get("/patient/{patient_id}/latest-draft")
def get_latest_patient_draft(
    patient_id: str,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
):
    draft = assessment_service.get_latest_draft_for_patient(patient_id)
    if not draft:
        return {"found": False, "assessment": None}
    return {"found": True, "assessment": draft}


@router.post("", status_code=201)
def create_assessment(
    payload: AssessmentCreateRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
    x_user_id: str = Header(default="msw_lead"),
):
    record = assessment_service.create_assessment(payload, actor_id=x_user_id, role=role.value)
    log_audit_event(
        action="ASSESSMENT_CREATED",
        actor_id=x_user_id,
        role=role.value,
        resource=f"assessment:{record['id']}",
        status="SUCCESS",
        details={"patient_id": payload.patient_id, "encounter_no": record["encounter_no"]},
    )
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
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
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
    return record


@router.post("/{assessment_id}/submit")
def submit_assessment(
    assessment_id: str,
    payload: AssessmentSubmitRequest = AssessmentSubmitRequest(),
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
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
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
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
    return record
