# OFPHIL Classification V2: Data Architecture Setup Report

**Date:** 2026-11-21  
**Project:** `ofphil-classification-v2`  
**Status:** Completed and Verified  

---

## 1. Implemented Directory Structure

The approved, canonical data architecture has been established across `data/`, `models/`, and `experiments/notebooks/`:

```text
ofphil-classification-v2/
│
├── data/
│   ├── raw/
│   │   ├── tabular/
│   │   └── documents/
│   │       ├── synthetic/
│   │       └── samples/
│   │
│   ├── interim/
│   │   ├── cleaned/
│   │   ├── validated/
│   │   └── extracted/
│   │
│   ├── processed/
│   │   ├── tabular/
│   │   ├── features/
│   │   └── splits/
│   │       ├── train/
│   │       ├── validation/
│   │       └── test/
│   │
│   └── synthetic/
│       ├── tabular/
│       └── documents/
│
├── models/
│   ├── pretrained/
│   └── trained/
│
└── experiments/
    └── notebooks/
        ├── 01_data_understanding/
        ├── 02_data_preparation/
        ├── 03_feature_engineering/
        ├── 04_document_processing_and_ocr/
        └── 05_model_selection_and_training/
```

Every leaf directory contains a tracked `.gitkeep` file so Git preserves the folder hierarchy without committing binary or volatile datasets.

---

## 2. Directory Responsibilities & Invariants

- **`data/raw/`**: Stores original source datasets. Strictly immutable. Files placed here are never modified in place.
- **`data/interim/`**: Holds intermediate transformation stages:
  - `cleaned/`: Normalized headers, stripped non-clinical artifacts.
  - `validated/`: Passed schema constraints and integrity rules.
  - `extracted/`: Structured key-values from OCR and document parsing.
- **`data/processed/`**: Holds finalized inputs for CatBoost and multimodal experimentation:
  - `tabular/`: Imputed and normalized master tabular tables.
  - `features/`: Multimodal aligned vectors (tabular + text embeddings + vision features).
  - `splits/`: Leakage-free `train/`, `validation/`, and `test/` partitions.
- **`data/synthetic/`**: Isolated sandbox for procedural generation of synthetic patient tables and synthetic certificates. No actual OFPHIL patient records enter this tree.
- **`models/`**: Separate from datasets:
  - `pretrained/`: Canonical pretrained checkpoints (e.g. TrOCR, PP-OCRv4, SBERT, YOLO).
  - `trained/`: Checkpoints and serialized models produced by V2 experiments.
- **`experiments/notebooks/`**: Phase-separated Jupyter workspaces (01 through 05) importing centralized path definitions.

---

## 3. Existing Directories Reused vs. Newly Created

| Directory | Type | Action Taken |
|---|---|---|
| `backend/` | Existing | Preserved. Added centralized path module in `app/core/paths.py`. |
| `frontend/` | Existing | Preserved without modifications. |
| `docs/` | Existing | Preserved. Stored this report alongside other system docs. |
| `storage/` | Existing | Preserved for local API upload scratch buffers. |
| `data/` (and all subdirectories) | New | Created all 13 canonical data directories with `.gitkeep`. |
| `models/` (and subdirectories) | New | Created `pretrained/` and `trained/` with `.gitkeep`. |
| `experiments/notebooks/` (and subdirectories) | New | Created categories `01_` through `05_` with `.gitkeep`. |

---

## 4. Centralized Path Configuration Details

Implemented `backend/app/core/paths.py` providing dynamically resolved, OS-agnostic `pathlib.Path` objects.

### Key Exported Paths:
- `PROJECT_ROOT`: Dynamically detected root of `ofphil-classification-v2`.
- `RAW_DATA_DIR`, `RAW_TABULAR_DIR`, `RAW_DOCUMENTS_DIR`, `RAW_DOCS_SYNTHETIC_DIR`, `RAW_DOCS_SAMPLES_DIR`
- `INTERIM_DATA_DIR`, `INTERIM_CLEANED_DIR`, `INTERIM_VALIDATED_DIR`, `INTERIM_EXTRACTED_DIR`
- `PROCESSED_DATA_DIR`, `PROCESSED_TABULAR_DIR`, `PROCESSED_FEATURES_DIR`, `PROCESSED_SPLITS_DIR`, `SPLIT_TRAIN_DIR`, `SPLIT_VAL_DIR`, `SPLIT_TEST_DIR`
- `SYNTHETIC_DATA_DIR`, `SYNTHETIC_TABULAR_DIR`, `SYNTHETIC_DOCUMENTS_DIR`
- `PRETRAINED_MODELS_DIR`, `TRAINED_MODELS_DIR`
- `NOTEBOOK_DATA_UNDERSTANDING_DIR`, `NOTEBOOK_DATA_PREPARATION_DIR`, `NOTEBOOK_FEATURE_ENGINEERING_DIR`, `NOTEBOOK_DOC_PROCESSING_OCR_DIR`, `NOTEBOOK_MODEL_SELECTION_DIR`

### Notebook Integration Usage:
Notebooks can simply import paths without brittle relative path traversing:
```python
import sys
from pathlib import Path
# Add backend to path if needed
sys.path.insert(0, str(Path.cwd().parents[1] / "backend"))
from app.core import paths

# Access standardized paths
raw_csv = paths.RAW_TABULAR_DIR / "sample.csv"
train_dir = paths.SPLIT_TRAIN_DIR
```

---

## 5. Git and Environment Protection Rules

Updated `.gitignore` with strict data exclusion rules:
```gitignore
# Data Architecture Exclusions (Ignore all contents but preserve folder structure via .gitkeep)
data/**
!data/
!data/**/
!data/**/.gitkeep

# Model Weight Artifacts Exclusions
models/**
!models/
!models/**/
!models/**/.gitkeep

# Jupyter Checkpoints
.ipynb_checkpoints/
*/.ipynb_checkpoints/*
```

This guarantees:
1. No raw patient datasets or private medical documents can ever be accidentally committed.
2. Large model weight binaries (`*.pt`, `*.bin`, `*.cbm`) are blocked from Git.
3. Jupyter checkpoint metadata is excluded.
4. Clean directory trees are automatically tracked and available across all clones.

---

## 6. Verification Results

1. **Path Resolution Test**: Verified via Python interpreter:
   ```text
   Root: C:\Users\ASUS TUF\Desktop\Project in Program\Thesis Project\ofphil-classification-v2
   Raw tab: ...\data\raw\tabular
   Splits train: ...\data\processed\splits\train
   Path assertions PASSED.
   ```
2. **Backend Unit Tests**: Verified via pytest:
   ```text
   backend/tests/test_api.py ...... [100%]
   6 passed in 0.58s
   ```
3. **Primary Reference Project**: `dss-charity-eligibity-classification` was checked; **100% untouched**.
4. **Data Privacy**: No patient records were copied; no synthetic data was generated prematurely.

---

## 7. Manual Attention & Next Steps

- **None required**. The data architecture, centralized path module, Git exclusions, and notebook directories are established, tested, and committed to version control.
