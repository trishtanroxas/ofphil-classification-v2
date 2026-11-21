# OFPHIL Classification V2: Primary Web Application Template Adaptation Report

## Executive Summary

This report documents the architectural, visual, and functional adaptation of the primary OFPHIL web application design system (`dss-charity-eligibity-classification`) to the new experimental machine learning project (`ofphil-classification-v2`).

The primary project served strictly as an untouched reference. In `ofphil-classification-v2`, we established a decoupled, cloud-ready architecture featuring a **Next.js frontend** formatted for Vercel deployment and a robust **FastAPI Python backend** with RESTful endpoints, Pydantic settings, and test coverage.

---

## 1. Primary Application Design Inventory

Inspection of `dss-charity-eligibity-classification` identified the following core design elements:
- **Logo and Branding**: Official OFPHIL green eye emblem with typography branding ("OFPHIL Ophthalmological Foundation").
- **Layout Architecture**: Fixed/responsive left sidebar navigation (280px desktop, collapsible on mobile), unified topbar header with breadcrumb/app title and accessibility controls, and a central container with subtle `#FAFBF8` clinic background.
- **Color Identity**:
  - Primary Brand Green: `#0B6B3A`
  - Dark Primary Green: `#064826`
  - Light Brand Tint / Badge Background: `#E6F1EA`
  - Clinic Main Background: `#FAFBF8`
  - Hairline Border: `#D5E2D9`
  - Muted Sage Accent: `#9DBFA9`
  - Ink / Text Primary: `#10241A`
  - Text Secondary: `#2E4538`
  - Text Muted: `#5A7466`
- **Typography**:
  - Headings: `Outfit` (600/700 weight, -0.02em letter spacing)
  - Body & UI: `Figtree` (clean, human clinical readability)
  - Code/Metrics: System monospaced font
- **Radius System**:
  - 8px (`rounded-lg` / `var(--radius-md)`) for cards, forms, inputs, and modals.
  - 999px (`rounded-full`) for status pills, badges, and avatars.
- **Shadow System**: Single-layer hairline shadows (`0 1px 2px rgba(16, 36, 26, 0.04)`).

---

## 2. Extracted Design Tokens

| Token | CSS Variable | Hex / Value | Usage in V2 |
|---|---|---|---|
| Primary | `--color-primary` / `--green-primary` | `#0B6B3A` | Buttons, active navigation, key icons, primary badges |
| Primary Dark | `--color-primary-dark` / `--green-dark` | `#064826` | Hover states, card headings |
| Primary Tint | `--color-primary-tint` / `--green-tint` | `#E6F1EA` | Active menu items, highlight chips |
| Clinic Background | `--color-clinic-bg` / `--bg-main` | `#FAFBF8` | Page background, table alternate rows |
| Border Hairline | `--color-hairline` / `--border-light` | `#D5E2D9` | All card borders, dividers, table lines |
| Sage Accent | `--color-sage` / `--accent-sage` | `#9DBFA9` | Secondary visual accents |
| Ink Primary | `--color-ink` / `--text-primary` | `#10241A` | Main page titles, tabular data, body text |
| Text Muted | `--text-muted` | `#5A7466` | Subtitles, helper text, table headers |
| Border Radius (Cards) | `--radius-md` | `8px` | Bento cards, modals, form controls |
| Border Radius (Pills) | `--radius-full` | `999px` | Status badges, category indicators |

---

## 3. Frontend Architecture Comparison

| Feature | Primary Application (`dss-...`) | Version 2 (`ofphil-classification-v2`) |
|---|---|---|
| **Frontend Framework** | Flask Jinja2 Templates + HTML | Next.js (App Router, React 19, TypeScript) |
| **Styling** | Tailwind CSS v4 CLI + `style.css` | Tailwind CSS v4 + strict token variables |
| **Icons** | FontAwesome 6 + Lucide CDN | Lucide React + FontAwesome icons |
| **State & API Handling** | Server-side rendered Flask routes | Decoupled client-side REST API consumer (`fetchApi`) |
| **Deployment Target** | Monolithic server | Independent Vercel frontend + separate backend |

---

## 4. Components Adapted

1. **`AppShell` & `Sidebar`**:
   - Reusable navigation bar replicating the primary layout.
   - Branded OFPHIL logo, badge tags, and 12-module route listing.
   - Mobile-responsive slide-out drawer with backdrop blur.
2. **`Header`**:
   - Topbar tracking breadcrumb context, platform title, and status indicators.
3. **`DashboardLayout`**:
   - Standardized wrapper enforcing spacing, topbar, and sidebar across all 12 modules.
4. **Form Controls & Inputs**:
   - 8px rounded inputs with `#D5E2D9` borders and `#0B6B3A` active focus rings.
5. **Data Tables & Bento Metrics**:
   - Minimalist table borders, `#FAFBF8` header styling, and 6-card summary bento grid.

---

## 5. Pages & Modules Implemented

All 12 experimental modules requested have been fully structured and connected:

1. **Dashboard (`/`)**: 6 key experimental metrics (Total Synthetic Records, Generated Documents, OCR Processed, Semantic Embeddings, Stamp/Signature YOLO, CatBoost Classifier) and an Experiment Activity Table.
2. **Authentication (`/login`)**: Role-based login (Researcher, MSW, Admin) supporting the OFPHIL visual style.
3. **Synthetic Dataset Management (`/datasets`)**: Creation and inspection of synthetic tabular patient batches.
4. **Document Generation (`/document-generation`)**: Canvas preview and parameter controls for generating synthetic barangay certificates and clinical referrals.
5. **PaddleOCR Engine (`/ocr`)**: Execution interface for printed document text extraction and structured entity detection.
6. **Transformer OCR (`/transformers`)**: TrOCR & Donut deep vision transformer runner for handwritten clinical notes.
7. **Semantic Embeddings (`/embeddings`)**: Sentence-BERT 384-dimensional dense representation vector generator.
8. **Semantic Assessment Scoring (`/semantic-scoring`)**: Indigency and clinical urgency scoring on narrative text.
9. **Stamp & Signature Detection (`/detection`)**: YOLOv8 seal and signature bounding box localization.
10. **Document Manipulation Screening (`/document-analysis`)**: Error Level Analysis (ELA) and forensic tamper detection.
11. **CatBoost Classification (`/classification`)**: Multimodal tabular + extracted document feature classifier.
12. **SHAP Explainability (`/explainability`)**: Shapley value waterfall breakdowns for transparent social worker decisions.
13. **Experiment Results (`/experiments`)**: Benchmark tracking for accuracy, F1 score, and ROC AUC.
14. **System Settings (`/settings`)**: Vercel frontend / FastAPI backend configuration inspector.

---

## 6. FastAPI Backend & REST API Implementation

The backend is built in `backend/app` using FastAPI:

- **Versioned API Prefix**: `/api/v1`
- **Endpoints Registered**:
  - `GET /api/v1/health`
  - `GET /api/v1/datasets`, `POST /api/v1/datasets`
  - `GET /api/v1/documents`, `POST /api/v1/documents/upload`
  - `POST /api/v1/ocr`
  - `POST /api/v1/transformers`
  - `POST /api/v1/embeddings`
  - `POST /api/v1/semantic-scoring`
  - `POST /api/v1/detection`
  - `POST /api/v1/document-analysis`
  - `POST /api/v1/classification`
  - `POST /api/v1/explainability`
  - `GET /api/v1/experiments`
- **Documentation**: Swagger UI accessible at `/docs` and ReDoc at `/redoc`.
- **CORS Configuration**: Handles localhost and `*.vercel.app` frontend origins safely.
- **Environment Management**: Centralized settings class in `backend/app/core/config.py` backed by `backend/.env.example` and `pydantic-settings`.
- **Test Suite**: Automated `pytest` in `backend/tests/test_api.py` passing 6/6 test cases with mock store validation.

---

## 7. Files Created and Modified

### Backend:
- `backend/app/main.py`
- `backend/app/core/config.py`
- `backend/app/core/security.py`
- `backend/app/schemas/schemas.py`
- `backend/app/services/mock_store.py`
- `backend/app/api/v1/router.py`
- `backend/app/api/v1/endpoints/endpoints.py`
- `backend/tests/test_api.py`
- `backend/requirements.txt`
- `backend/.env.example`
- `backend/.env`
- `backend/README.md`

### Frontend:
- `frontend/package.json`
- `frontend/tsconfig.json`
- `frontend/next.config.js`
- `frontend/.env.example`
- `frontend/.env.local`
- `frontend/src/lib/api.ts`
- `frontend/src/app/globals.css`
- `frontend/src/app/layout.tsx`
- `frontend/src/components/AppShell.tsx`
- `frontend/src/components/DashboardLayout.tsx`
- `frontend/src/app/page.tsx`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/datasets/page.tsx`
- `frontend/src/app/document-generation/page.tsx`
- `frontend/src/app/ocr/page.tsx`
- `frontend/src/app/transformers/page.tsx`
- `frontend/src/app/embeddings/page.tsx`
- `frontend/src/app/semantic-scoring/page.tsx`
- `frontend/src/app/detection/page.tsx`
- `frontend/src/app/document-analysis/page.tsx`
- `frontend/src/app/classification/page.tsx`
- `frontend/src/app/explainability/page.tsx`
- `frontend/src/app/experiments/page.tsx`
- `frontend/src/app/settings/page.tsx`

### Project Root:
- `.gitignore`
- `OFPHIL_V2_PRIMARY_DESIGN_ADAPTATION_REPORT.md`

---

## 8. Verification & Test Results

1. **Primary Project Preservation**: Verified untouched; zero modifications to `dss-charity-eligibity-classification`.
2. **Backend Unit Testing**:
   ```text
   backend\tests\test_api.py ...... [100%]
   6 passed in 0.64s
   ```
3. **Data Security**: All data structures represent purely synthetic records; no real patient names or private health information are present in the repository.
4. **Vercel / Backend Decoupling**: API endpoints do not expose credentials; private keys remain in the Python backend `.env`.

---

## 9. Next Implementation Steps

- Connect live PaddleOCR and PyTorch YOLOv8 weights into `backend/app/services/` upon checkpoint availability.
- Deploy Next.js frontend to Vercel and point `NEXT_PUBLIC_API_BASE_URL` to the hosted FastAPI compute server.
