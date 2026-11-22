from fastapi import APIRouter, Depends, Header
from app.core.rbac import UserRole, require_roles
from app.core.audit import log_audit_event
from app.schemas.classification_schemas import (
    CombinedClassificationRequest,
    CombinedClassificationResponse,
    FinancialClassificationRequest,
    FinancialClassificationResponse,
    MSWClassificationRequest,
    MSWClassificationResponse,
)
from app.services.classification_service import (
    classify_financial,
    classify_msw,
    evaluate_combined,
)

router = APIRouter(prefix="/classification", tags=["OFPHIL Classification"])


@router.post("/financial", response_model=FinancialClassificationResponse)
def post_financial_classification(
    payload: FinancialClassificationRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.RESEARCHER])),
    x_user_id: str = Header(default="msw_lead"),
):
    result = classify_financial(payload)
    log_audit_event(
        action="CLASSIFICATION_FINANCIAL",
        actor_id=x_user_id,
        role=role.value,
        resource="ofphil_financial_rubric_v1",
        status="SUCCESS",
        details={
            "classification": result.classification,
            "household_size": payload.household_size,
            "per_capita": str(result.monthly_per_capita_income),
        },
    )
    return result


@router.post("/msw", response_model=MSWClassificationResponse)
def post_msw_classification(
    payload: MSWClassificationRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.RESEARCHER])),
    x_user_id: str = Header(default="msw_lead"),
):
    result = classify_msw(payload)
    log_audit_event(
        action="CLASSIFICATION_MSW",
        actor_id=x_user_id,
        role=role.value,
        resource="ofphil_msw_rubric_v1",
        status="SUCCESS",
        details={
            "classification": result.classification,
            "total_risk": str(result.total_risk),
            "initial_load_applied": result.initial_load_applied,
            "trigger_count": len(result.triggered_conditions),
        },
    )
    return result


@router.post("/evaluate", response_model=CombinedClassificationResponse)
def post_combined_classification(
    payload: CombinedClassificationRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.RESEARCHER])),
    x_user_id: str = Header(default="msw_lead"),
):
    result = evaluate_combined(payload)
    log_audit_event(
        action="CLASSIFICATION_EVALUATE",
        actor_id=x_user_id,
        role=role.value,
        resource="ofphil_combined_rubric_v1",
        status="SUCCESS",
        details={
            "financial_tier": result.financial_classification.classification,
            "msw_tier": result.msw_classification.classification,
            "discrepancy_detected": result.discrepancy_detected,
        },
    )
    return result
