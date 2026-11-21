"""
Centralized Path Management Module for OFPHIL Classification V2.
Provides immutable, environment-aware, project-relative pathlib.Path references
compatible across Windows, Linux, and containerized runtimes.
"""
from pathlib import Path
from typing import Union


def get_project_root() -> Path:
    """
    Locates the repository root directory dynamically.
    Works whether imported from backend, notebooks, or scripts.
    """
    current = Path(__file__).resolve()
    for parent in [current] + list(current.parents):
        # Look for indicator files/folders of the V2 project root
        if (parent / "backend").exists() and (parent / "frontend").exists():
            return parent
    # Fallback to current working directory
    return Path.cwd().resolve()


PROJECT_ROOT: Path = get_project_root()

# -----------------------------------------------------------------------------
# Data Directories
# -----------------------------------------------------------------------------
DATA_DIR: Path = PROJECT_ROOT / "data"

# Raw data (immutable source datasets)
RAW_DATA_DIR: Path = DATA_DIR / "raw"
RAW_TABULAR_DIR: Path = RAW_DATA_DIR / "tabular"
RAW_DOCUMENTS_DIR: Path = RAW_DATA_DIR / "documents"
RAW_DOCS_SYNTHETIC_DIR: Path = RAW_DOCUMENTS_DIR / "synthetic"
RAW_DOCS_SAMPLES_DIR: Path = RAW_DOCUMENTS_DIR / "samples"

# Interim data (intermediate processing outputs)
INTERIM_DATA_DIR: Path = DATA_DIR / "interim"
INTERIM_CLEANED_DIR: Path = INTERIM_DATA_DIR / "cleaned"
INTERIM_VALIDATED_DIR: Path = INTERIM_DATA_DIR / "validated"
INTERIM_EXTRACTED_DIR: Path = INTERIM_DATA_DIR / "extracted"

# Processed data (finalized ML experiment inputs)
PROCESSED_DATA_DIR: Path = DATA_DIR / "processed"
PROCESSED_TABULAR_DIR: Path = PROCESSED_DATA_DIR / "tabular"
PROCESSED_FEATURES_DIR: Path = PROCESSED_DATA_DIR / "features"
PROCESSED_SPLITS_DIR: Path = PROCESSED_DATA_DIR / "splits"
SPLIT_TRAIN_DIR: Path = PROCESSED_SPLITS_DIR / "train"
SPLIT_VAL_DIR: Path = PROCESSED_SPLITS_DIR / "validation"
SPLIT_TEST_DIR: Path = PROCESSED_SPLITS_DIR / "test"

# Dedicated synthetic data storage
SYNTHETIC_DATA_DIR: Path = DATA_DIR / "synthetic"
SYNTHETIC_TABULAR_DIR: Path = SYNTHETIC_DATA_DIR / "tabular"
SYNTHETIC_DOCUMENTS_DIR: Path = SYNTHETIC_DATA_DIR / "documents"

# -----------------------------------------------------------------------------
# Models
# -----------------------------------------------------------------------------
MODELS_DIR: Path = PROJECT_ROOT / "models"
PRETRAINED_MODELS_DIR: Path = MODELS_DIR / "pretrained"
TRAINED_MODELS_DIR: Path = MODELS_DIR / "trained"

# -----------------------------------------------------------------------------
# Experiments & Notebooks
# -----------------------------------------------------------------------------
EXPERIMENTS_DIR: Path = PROJECT_ROOT / "experiments"
NOTEBOOKS_DIR: Path = EXPERIMENTS_DIR / "notebooks"
NOTEBOOK_DATA_UNDERSTANDING_DIR: Path = NOTEBOOKS_DIR / "01_data_understanding"
NOTEBOOK_DATA_PREPARATION_DIR: Path = NOTEBOOKS_DIR / "02_data_preparation"
NOTEBOOK_FEATURE_ENGINEERING_DIR: Path = NOTEBOOKS_DIR / "03_feature_engineering"
NOTEBOOK_DOC_PROCESSING_OCR_DIR: Path = NOTEBOOKS_DIR / "04_document_processing_and_ocr"
NOTEBOOK_MODEL_SELECTION_DIR: Path = NOTEBOOKS_DIR / "05_model_selection_and_training"

# -----------------------------------------------------------------------------
# Storage & Backend Paths
# -----------------------------------------------------------------------------
STORAGE_DIR: Path = PROJECT_ROOT / "storage"
UPLOAD_STORAGE_DIR: Path = STORAGE_DIR / "uploads"
MODEL_STORAGE_DIR: Path = STORAGE_DIR / "models"
DOCS_DIR: Path = PROJECT_ROOT / "docs"


def ensure_data_directories() -> None:
    """Ensure all canonical data and model directories exist."""
    directories = [
        RAW_TABULAR_DIR,
        RAW_DOCS_SYNTHETIC_DIR,
        RAW_DOCS_SAMPLES_DIR,
        INTERIM_CLEANED_DIR,
        INTERIM_VALIDATED_DIR,
        INTERIM_EXTRACTED_DIR,
        PROCESSED_TABULAR_DIR,
        PROCESSED_FEATURES_DIR,
        SPLIT_TRAIN_DIR,
        SPLIT_VAL_DIR,
        SPLIT_TEST_DIR,
        SYNTHETIC_TABULAR_DIR,
        SYNTHETIC_DOCUMENTS_DIR,
        PRETRAINED_MODELS_DIR,
        TRAINED_MODELS_DIR,
        NOTEBOOK_DATA_UNDERSTANDING_DIR,
        NOTEBOOK_DATA_PREPARATION_DIR,
        NOTEBOOK_FEATURE_ENGINEERING_DIR,
        NOTEBOOK_DOC_PROCESSING_OCR_DIR,
        NOTEBOOK_MODEL_SELECTION_DIR,
        UPLOAD_STORAGE_DIR,
        MODEL_STORAGE_DIR,
    ]
    for d in directories:
        d.mkdir(parents=True, exist_ok=True)
