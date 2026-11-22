from fastapi import APIRouter
from app.api.v1.endpoints.endpoints import router as endpoints_router
from app.api.v1.endpoints.settings import router as settings_router

router = APIRouter()
router.include_router(endpoints_router)
router.include_router(settings_router)
