from fastapi import APIRouter, Depends, Header

from app.core.audit import log_audit_event
from app.core.rbac import UserRole, require_roles
from app.schemas.ml_schemas import MLPredictRequest, MLPredictResponse
from app.services.ml_prediction_service import ml_prediction_service

router = APIRouter(prefix="/ml", tags=["Explainable ML Integration"])


@router.get("/models")
def list_ml_models(
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.RESEARCHER])),
):
    return ml_prediction_service.get_model_inventory()


@router.post("/predict", response_model=MLPredictResponse)
def predict_ml_eligibility(
    payload: MLPredictRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.RESEARCHER])),
    x_user_id: str = Header(default="msw_lead"),
):
    res = ml_prediction_service.predict(payload)
    log_audit_event(
        action="ML_PREDICTION_REQUEST",
        actor_id=x_user_id,
        role=role.value,
        resource=f"ml_model:{res.model_version}",
        status="SUCCESS",
        details={
            "assessment_id": payload.assessment_id,
            "prediction_enabled": res.prediction_enabled,
            "status": res.status,
            "disagrees_with_api": res.disagrees_with_api,
        },
    )
    return res
