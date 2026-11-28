from fastapi import APIRouter
from app.api.v1.endpoints.endpoints import router as endpoints_router
from app.api.v1.endpoints.settings import router as settings_router
from app.api.v1.endpoints.classification import router as classification_router
from app.api.v1.endpoints.documents import router as documents_router
from app.api.v1.endpoints.assessments import router as assessments_router
from app.api.v1.endpoints.ml import router as ml_router
from app.api.v1.endpoints.auth_recovery import router as auth_recovery_router
from app.api.v1.endpoints.inquiries import router as inquiries_router
from app.api.v1.endpoints.annotator import router as annotator_router
from app.api.v1.endpoints.prototype import router as prototype_router

router = APIRouter()
router.include_router(endpoints_router)
router.include_router(settings_router)
router.include_router(classification_router)
router.include_router(documents_router)
router.include_router(assessments_router)
router.include_router(ml_router)
router.include_router(auth_recovery_router)
router.include_router(inquiries_router)
router.include_router(annotator_router)
router.include_router(prototype_router)
