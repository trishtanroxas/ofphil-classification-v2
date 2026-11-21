# OFPHIL V2 — Storage Policy & Artifact Management

**Version:** 2.0.0-draft  
**Target Repository:** `ofphil-classification-v2`  
**Core Objective:** Establish a clean, leak-proof storage boundary ensuring zero duplicate weight storage, zero commit of heavy binaries, and strict protection of patient confidentiality.

---

## 1. Canonical Storage Directory Layout

All physical runtime files in V2 reside strictly under the top-level `storage/` directory, partitioned into explicit operational zones:

```
storage/
├── models/                     # [GIT-IGNORED] Canonical directory for all ML/DL model weights
│   ├── .gitkeep
│   ├── classification/         # Tabular CatBoost .cbm files
│   │   └── catboost_multimodal.cbm
│   ├── ocr/                    # PaddleOCR inference models & TrOCR safetensors
│   │   ├── paddleocr_ofphil_finetuned/
│   │   └── trocr_ofphil_finetuned/
│   ├── embeddings/             # Sentence-transformers cache / local artifacts
│   └── detection/              # YOLOv8 .pt checkpoint weights
│
├── uploads/                    # [GIT-IGNORED] Ephemeral runtime file uploads (multipart forms)
│   ├── .gitkeep
│   └── presets/                # Tracked sample synthetic/anonymized documents
│       └── preset_demo_indigency.jpg
│
└── cache/                      # [GIT-IGNORED] Temporary image processing slices and cropped ROIs
    └── .gitkeep
```

---

## 2. Model Weight Management & On-Demand Acquisition Strategy

### Zero-Copy Local Development (Junction / Symlink Approach)
To avoid duplicating the **1.33 GB** production model footprint on the developer's local workstation between `dss-charity-eligibity-classification` and `ofphil-classification-v2`:
- In local development on Windows, use an **NTFS Directory Junction** or **Symbolic Link** pointing from `ofphil-classification-v2/storage/models` to the primary model source.
- *Advantage:* Zero bytes duplicated on disk; updates to primary weights immediately reflect in V2 without manual re-copying.

```powershell
# Windows PowerShell Example for Local Development (Zero Disk Duplication)
New-Item -ItemType Junction -Path "..\ofphil-classification-v2\storage\models\ocr\paddleocr_ofphil_finetuned" -Target "..\dss-charity-eligibity-classification\models\paddleocr_ofphil_finetuned\recognition\best_accuracy"
```

### On-Demand Cloud & Container Model Acquisition
For independent cloud or Docker deployments (where the primary project is absent):
1. **Lazy Loading on Initialization:** Model loading is deferred until the first API call to the respective endpoint. If the model file is not present locally:
2. **Download-On-Demand Mechanism:**
   - Small models (`catboost_multimodal.cbm`, 28 KB) are bundled via secure object store (AWS S3 / GCP Cloud Storage / Hugging Face Private Hub).
   - Public baselines (`microsoft/trocr-base-handwritten`, `PP-OCRv4`, `all-MiniLM-L6-v2`) download directly into standard local caches via their respective SDKs on startup.
   - A health check endpoint (`/api/v1/system/models/status`) inspects the presence and SHA-256 integrity of all manifest models.

---

## 3. Strict Patient Confidentiality & Data Boundary

> [!CAUTION]
> Under no circumstances may raw patient health records, scanned hospital documents, or real-world charity case intake sheets from the primary project (`data/raw/`) be copied, transferred, or committed to `ofphil-classification-v2`.

### Data Protection Rules:
1. **No Real PII:** `data/raw/supporting document/` (5.09 GB) and `data/raw/charity patient record/` (Excel files) from the primary project are strictly segregated and forbidden from entering the V2 file tree.
2. **Synthetic Data Sandbox Only:** V2 is dedicated to synthetic data generation, mock demonstration fixtures, and algorithm evaluation. Any sample documents placed in `storage/uploads/presets/` must be 100% fabricated or de-identified synthetic test samples.
3. **Database Segregation:** `ofphil_v2.db` (SQLite) is initialized empty via SQLAlchemy migrations with mock seed data only. Never import `charity_beneficiary.db` directly from the primary project.

---

## 4. Git Invalidation & Exclusion Rules

The project `.gitignore` has been verified to ensure no binary artifacts or credentials can be committed:

```gitignore
# Model weights & large binaries
storage/models/*
!storage/models/.gitkeep
*.safetensors
*.bin
*.pdparams
*.pdopt
*.pdiparams
*.cbm
*.pt
*.pth
*.joblib

# Runtime uploaded documents
storage/uploads/*
!storage/uploads/.gitkeep
!storage/uploads/presets/

# Temporary caches
storage/cache/*
!storage/cache/.gitkeep
.cache/
__pycache__/

# Databases & local secrets
*.db
*.sqlite
*.sqlite3
.env
.env.*.local
```

---

## 5. Summary of Storage Footprint Targets for V2

| Milestone Stage | Expected V2 Disk Footprint | Primary Project Comparison | Notes |
| :--- | :--- | :--- | :--- |
| **Current Baseline** (FastAPI Core) | **~66 MB** | 23.14 GB | Clean microservice skeleton. |
| **Stage 1: Tabular CatBoost** | **~420 MB** | 23.14 GB | Core API + CatBoost C++ wheels + Scikit-Learn. |
| **Stage 2: + PaddleOCR Vision** | **~1.70 GB** | 23.14 GB | OpenCV headless + PaddlePaddle CPU + 73 MB OCR model. |
| **Stage 3: Full Deep Transformers (On-demand)** | **~6.50 GB** | 23.14 GB | PyTorch + TrOCR + MiniLM + YOLO. |
| **Overall Savings vs. Primary** | **Up to 16.64 GB saved** | — | Clean separation, zero progressive checkpoint bloat, zero duplicate copies. |
