from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api.v1.router import router as api_v1_router

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="OFPHIL Classification V2 - Clinical Decision Support & AI Experimentation API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Set up CORS for Vercel and local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 API router
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "version": "2.0.0",
        "status": "operational",
        "docs": "/docs",
        "api_v1": settings.API_V1_PREFIX
    }
