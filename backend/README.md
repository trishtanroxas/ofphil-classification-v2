# OFPHIL Classification V2 — Backend API

FastAPI REST backend supporting the OFPHIL Classification V2 research and experimental framework for ophthalmological charity assistance eligibility.

## Features

- **FastAPI RESTful Architecture** with automated `/docs` (Swagger UI) and `/redoc`.
- **Pydantic Settings & Dotenv** for safe configuration management.
- **RESTful Endpoints** for:
  - Health & System status (`/api/v1/health`)
  - Datasets (`/api/v1/datasets`)
  - Documents (`/api/v1/documents`)
  - OCR (`/api/v1/ocr`, `/api/v1/transformers`)
  - Semantic Embeddings & Scoring (`/api/v1/embeddings`, `/api/v1/semantic-scoring`)
  - Detection (`/api/v1/detection`)
  - Document Screening (`/api/v1/document-analysis`)
  - CatBoost Classification (`/api/v1/classification`)
  - SHAP Explainability (`/api/v1/explainability`)
  - Experiments (`/api/v1/experiments`)
- **Automated Pytest Suite** verifying health, dataset management, OCR, and classification.

## Local Setup

1. **Activate Virtual Environment**:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
2. **Install Dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. **Configure Environment**:
   ```bash
   copy backend\.env.example backend\.env
   ```
4. **Run Server**:
   ```bash
   python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
   ```
5. **Interactive Docs**:
   Navigate to [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## Run Tests

```powershell
$env:PYTHONPATH="backend"
.\venv\Scripts\pytest backend\tests -v
```
