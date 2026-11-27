# OFPHIL Classification V2 — Research Notebooks

## Finalized 6-Component AI/ML Architecture

| Component | Technology | Primary Responsibility |
|---|---|---|
| CNN | **ResNet-50** | Document image feature extraction and visual processing |
| LLM | **Qwen3-4B** (`qwen3:4b-instruct-2507`) | Patient interview processing, follow-up question generation, and structured response extraction |
| OCR | **PaddleOCR** | Text extraction from supporting documents |
| Baseline Classifier | **Random Forest** | Baseline charity eligibility classification |
| Gradient Boosting Classifier | **CatBoost** | Predictive charity eligibility classification |
| Explainable Classifier | **Explainable Boosting Machine (EBM)** | Interpretable eligibility classification and feature-level explanations |

## Conceptual Multimodal Pipeline

1. **Supporting Documents**: `ResNet-50` Image Processing → `PaddleOCR` Text Extraction → Structured Patient Information
2. **Patient Interview**: `Qwen3-4B` (`qwen3:4b-instruct-2507`) → Pre-Interview Processing → Follow-Up Questions → Post-Interview Structured Output
3. **Eligibility Decision Support**: Structured Patient & Socioeconomic Features → `Random Forest` / `CatBoost` / `EBM` → Model Comparison & Explainability → Authorized Social Worker Review
