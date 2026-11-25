import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
STORAGE_DIR = BASE_DIR / "storage"
MODELS_DIR = BASE_DIR / "experiments" / "models"
REPORTS_DIR = BASE_DIR / "reports"

# Document Screening Constants
DOCUMENT_CLASSES = [
    "header",
    "patient_info_field",
    "clinical_findings_field",
    "financial_quotation_table",
    "date_field",
    "signature_region",
    "official_stamp_seal",
]

# Random Seed for Reproducibility across CV & Splitting
GLOBAL_RANDOM_STATE = 42

# Eligibility Classification Active Models
ACTIVE_CLASSIFICATION_MODELS = [
    "RandomForest",
    "CatBoost",
    "ExplainableBoostingMachine",
]
