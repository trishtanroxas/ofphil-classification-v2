# OFPHIL Machine Learning Pipeline Implementation Status

## 1. Component Implementation Matrix

| Component | Track | Implementation Status | Code Location | Next Action / Remaining Prerequisites |
| :--- | :--- | :--- | :--- | :--- |
| **OpenCV Preprocessing** | Track A | **Scaffold Prepared / Baseline Scripted** | `document_screening/image_processing/` | Benchmark deskewing on multi-angle mobile uploads. |
| **YOLO11s Object Detection** | Track A | **Interface Defined / Annotations Planned** | `document_screening/detection/` | Fine-tune YOLO11s on annotated Philippine indigency & quotation datasets. |
| **PaddleOCR PP-OCRv6** | Track A | **Integrated in Pipelines / Benchmark Ready** | `document_screening/ocr/` | Run CER/WER benchmark against domain medical dictionary. |
| **ORB / SIFT Matching** | Track A | **Modular Algorithm Implemented** | `document_screening/forgery_detection/` | Calibrate threshold distances on authentic vs forged seals. |
| **Copy-Move (CMFD)** | Track A | **Modular Algorithm Implemented** | `document_screening/forgery_detection/` | Calibrate block-matching sensitivity to avoid false positives on clean text. |
| **Document Validator** | Track A | **Deterministic Engine Implemented** | `document_screening/validation/` | Connect to backend master registry for real-time consistency validation. |
| **Qwen3-4B Client** | Track B | **Interface Prepared (Ollama/llama.cpp)** | `interview_assistant/llm/` | Verify hardware inference speed (Tokens/sec) on target deployment hardware. |
| **Structured Extraction** | Track B | **Prompt Templates & Schemas Implemented** | `interview_assistant/extraction/` | Benchmark JSON extraction precision on synthetic bilingual dialogues. |
| **Assessment Validator** | Track B | **Pydantic Validation Engine Ready** | `interview_assistant/validation/` | Sync bounds with Philippine regional poverty threshold definitions. |
| **Random Forest Baseline** | Track C | **Implemented with 10-Fold CV Protocol** | `eligibility_classification/models/` | Train on full frozen dataset when authorized. |
| **CatBoost Model** | Track C | **Implemented with Categorical Feature Handling** | `eligibility_classification/models/` | Hyperparameter tuning using stratified inner CV. |
| **Explainable Boosting Machine** | Track C | **Implemented with Shape Curve Plots** | `eligibility_classification/models/` | Compute local and global feature explanations. |
| **Tabular Preprocessing & Calibration** | Track C | **Implemented (Leakage-Free Pipeline)** | `eligibility_classification/preprocessing/` | Fit scalers and encoders exclusively on outer CV training folds. |

---

## 2. Strict Exclusions Documented
- **Siamese Network for Signature/Stamp Comparison:** Removed completely from Track A. Bounding boxes are detected by YOLO11s; verification is performed manually by caseworkers.
- **Logistic Regression:** Excluded from active Phase 05 model selection and training comparison due to non-linear distortion.
- **Direct LLM Decision-Making:** Strictly forbidden. Qwen3-4B serves solely as an intake and transcription aid.
