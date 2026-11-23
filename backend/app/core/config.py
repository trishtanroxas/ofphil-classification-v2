from functools import lru_cache
from typing import List, Union, Optional
from pathlib import Path
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from app.core.paths import (
    DATA_DIR,
    RAW_DATA_DIR,
    INTERIM_DATA_DIR,
    PROCESSED_DATA_DIR,
    SYNTHETIC_DATA_DIR,
    MODELS_DIR,
    PRETRAINED_MODELS_DIR,
    TRAINED_MODELS_DIR,
    NOTEBOOKS_DIR,
    UPLOAD_STORAGE_DIR,
    MODEL_STORAGE_DIR,
)


class Settings(BaseSettings):
    APP_NAME: str = "OFPHIL Classification V2"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "ofphil-v2-dev-insecure-secret-key-change-in-production"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "sqlite:///./ofphil_v2.db"

    # Supabase Production PostgreSQL / REST Settings
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Private AI Keys & Third-party integrations (Kept private on backend)
    OPENAI_API_KEY: str = ""
    OCR_API_KEY: str = ""
    EMBEDDING_API_KEY: str = ""
    DOCUMENT_ANALYSIS_API_KEY: str = ""

    # Optional notification / service integration tokens
    MAIL_SERVER: Optional[str] = None
    MAIL_PORT: Optional[int] = None
    MAIL_USE_TLS: bool = True
    MAIL_USERNAME: Optional[str] = None
    MAIL_PASSWORD: Optional[str] = None
    MAIL_DEFAULT_SENDER: Optional[str] = None
    SEMAPHORE_API_KEY: Optional[str] = None
    SEMAPHORE_SENDER_NAME: Optional[str] = None

    # Frontend and backend URLs
    FRONTEND_URL: str = "https://ofphil-foundation.vercel.app"
    BACKEND_URL: str = "http://localhost:8000"

    ALLOWED_ORIGINS: List[str] = [
        "https://ofphil-foundation.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # Centralized Storage & Data paths (synced with app.core.paths)
    MODEL_STORAGE_PATH: str = str(MODEL_STORAGE_DIR)
    UPLOAD_STORAGE_PATH: str = str(UPLOAD_STORAGE_DIR)
    MAX_UPLOAD_SIZE_MB: int = 20

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
