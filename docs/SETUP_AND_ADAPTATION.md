# OFPHIL Classification V2: System Setup & Adaptation Master Report

This unified report consolidates the complete system configuration, primary application design adaptation, and environment architecture for **OFPHIL Classification V2 (`ofphil-classification-v2`)**.

---

# PART I — DESIGN ADAPTATION & INTERFACE ARCHITECTURE

## 1. Primary Application Reference & Design Inventory

The primary application (`dss-charity-eligibity-classification`) was inspected and used strictly as an untouched visual and UX reference:

- **Branding & Visuals**: Official OFPHIL eye emblem with "OFPHIL Ophthalmological Foundation" institutional typography.
- **Color Palette & Tokens**:
  - Primary Brand Green: `#0B6B3A`
  - Dark Primary Green: `#064826`
  - Brand Tint / Chips: `#E6F1EA`
  - Clinic Canvas Background: `#FAFBF8`
  - Hairline Border: `#D5E2D9`
  - Sage Muted Accent: `#9DBFA9`
  - Ink / Text Primary: `#10241A`
  - Text Muted: `#5A7466`
- **Typography & Geometry**:
  - Headings: `Outfit` (600/700, -0.02em letter spacing)
  - Body & Form Controls: `Figtree` (clean, accessible clinical UI)
  - Radius: `8px` (`--radius-md`) for cards, forms, and inputs; `999px` (`--radius-pill`) for status badges.

## 2. Frontend Architecture & Component Adaptation

| Feature | Primary Monolith (`dss-...`) | Version 2 (`ofphil-classification-v2`) |
|---|---|---|
| **Frontend Framework** | Flask Jinja2 Templates + HTML | Next.js 15 (App Router, React 19, TypeScript) |
| **Styling Engine** | Tailwind CSS v4 CLI + `style.css` | Tailwind CSS v4 with strict theme tokens |
| **Icons** | FontAwesome 6 + Lucide CDN | Lucide React + FontAwesome icons |
| **API Integration** | Synchronous server rendering | Centralized asynchronous client (`fetchApi`) |
| **Hosting Deployment** | Monolithic server | Independent Vercel CDN (`https://ofphil-foundation.vercel.app`) |

### Implemented Modules:
1. **Dashboard (`/`)**: 6-card bento grid (Synthetic Records, Generated Documents, OCR Processed, SBERT Embeddings, YOLO Stamps, CatBoost Accuracy) and experiment history.
2. **Authentication (`/login`)**: Multi-role login interface (Researcher, MSW, Admin).
3. **Synthetic Dataset Management (`/datasets`)**: Generation and metadata indexing of synthetic patient batches.
4. **Document Generation (`/document-generation`)**: Canvas preview of synthetic barangay certificates and medical referrals with official seals.
5. **PaddleOCR Engine (`/ocr`)**: Text extraction and structured key-value parsing.
6. **Transformer OCR (`/transformers`)**: Vision-encoder-decoder (TrOCR & Donut) for handwritten physician notes.
7. **Semantic Embeddings (`/embeddings`)**: Sentence-BERT 384-dimensional representation generator.
8. **Semantic Assessment Scoring (`/semantic-scoring`)**: Indigency and ophthalmic urgency scoring.
9. **Stamp & Signature Detection (`/detection`)**: YOLOv8 seal and signature bounding box localization.
10. **Document Manipulation Screening (`/document-analysis`)**: Error Level Analysis (ELA) and forgery screening.
11. **CatBoost Multimodal Classification (`/classification`)**: High-accuracy eligibility prediction.
12. **SHAP Explainability (`/explainability`)**: Case-level Shapley value waterfall explanations.
13. **Experiment Results (`/experiments`)**: Benchmark tracking for accuracy, F1 score, and ROC-AUC.
14. **System Settings (`/settings`)**: Deployment boundary inspector.

---

# PART II — ENVIRONMENT CONFIGURATION & WORKSPACE SETUP

## 1. Environment Configuration

- **Backend Configuration (`backend/.env` & `.env`)**:
  - Reused valid `SECRET_KEY` from the primary application.
  - Configured V2 parameters: `APP_NAME`, `API_V1_PREFIX`, `DATABASE_URL=sqlite:///./ofphil_v2.db`, and storage directories (`./storage/models`, `./storage/uploads`).
  - Added CORS support for `https://ofphil-foundation.vercel.app` and localhost.
- **Example Templates**:
  - Maintained dummy placeholders in `backend/.env.example`, `.env.example`, and `frontend/.env.example`.
- **Security Check**:
  - Real `.env` and `.env.local` files are strictly excluded from Git. Zero secret leakage.

## 2. Python Virtual Environment

- **Main Workspace Runtime**: Verified primary environment `venv312` runs **Python 3.12.10 (AMD64)**.
- **V2 Environment**: Verified local environment `.\venv` runs **Python 3.12.10 (AMD64)** matching the main workspace runtime.
- **Installed Dependencies**:
  - `fastapi` (0.165.0)
  - `uvicorn` (0.54.0)
  - `pydantic` (2.14.3)
  - `pydantic-settings` (2.16.3)
  - `sqlalchemy` (2.1.9)
  - `httpx` (0.28.1)
  - `pytest` (9.2.0)
  - `python-multipart` (0.0.34)
  - `python-dotenv` (1.2.4)
- **IDE Settings**: `.vscode/settings.json` configured to use `${workspaceFolder}\venv\Scripts\python.exe` and track `backend` modules.

## 3. Verification Summary

1. **FastAPI Endpoints**:
   - `GET /api/v1/health` ➔ `200 OK`
   - `GET /docs` (Swagger UI) ➔ `200 OK`
2. **Automated Unit Tests**:
   - `pytest backend/tests -v` ➔ **6/6 passed (100%)**.
3. **Frontend Production Build**:
   - Next.js static generation ➔ **17/17 pages compiled successfully**.
4. **Primary Project Integrity**:
   - `dss-charity-eligibity-classification` was verified completely **untouched**.
