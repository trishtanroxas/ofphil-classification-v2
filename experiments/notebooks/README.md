# OFPHIL V2 — Jupyter Notebook Architecture

This directory houses the experimentation and research lifecycle for the **OFPHIL V2: Charity Patient Eligibility Classification** project. The workflow is organized into six sequential research phases designed to ensure reproducibility, data integrity, zero target leakage, and objective empirical model selection.

---

## Architecture Overview

```text
experiments/
└── notebooks/
    │
    ├── 01_data_collection/
    │   ├── 01_source_and_patient_record_inventory.ipynb
    │   └── 02_supporting_document_inventory.ipynb
    │
    ├── 02_data_preparation/
    │   ├── 01_data_quality_and_verification.ipynb
    │   ├── 02_taxonomy_and_category_mapping.ipynb
    │   ├── 03_data_cleaning_and_missing_values.ipynb
    │   ├── 04_patient_document_linkage_audit.ipynb
    │   ├── 05_encoding_and_numerical_preprocessing.ipynb
    │   └── 06_prepared_dataset_validation.ipynb
    │
    ├── 03_feature_engineering/
    │   ├── 01_feature_extraction_and_creation.ipynb
    │   ├── 02_feature_transformation.ipynb
    │   ├── 03_feature_selection_and_leakage_review.ipynb
    │   └── 04_feature_schema_validation.ipynb
    │
    ├── 04_document_processing_and_ocr/
    │   ├── 01_document_inventory_and_validation.ipynb
    │   ├── 02_document_preprocessing.ipynb
    │   │
    │   ├── 03_yolo_document_detection/
    │   │   ├── 01_yolo_document_dataset_preparation.ipynb
    │   │   ├── 02_yolo_annotation_and_label_validation.ipynb
    │   │   ├── 03_yolo_model_training.ipynb
    │   │   ├── 04_yolo_model_evaluation.ipynb
    │   │   └── 05_yolo_inference_and_region_extraction.ipynb
    │   │
    │   ├── 04_ocr_extraction_and_text_recognition.ipynb
    │   │
    │   ├── 05_ocr_model_benchmarks/
    │   │   ├── 01_paddleocr_cer_wer_benchmark.ipynb
    │   │   ├── 02_easyocr_cer_wer_benchmark.ipynb
    │   │   ├── 03_trocr_cer_wer_benchmark.ipynb
    │   │   ├── 04_paddleocr_finetuning_on_ofphil.ipynb
    │   │   ├── 05_trocr_finetuning_on_ofphil.ipynb
    │   │   └── 06_ocr_engines_comparative_summary.ipynb
    │   │
    │   ├── 06_document_classification_and_linkage.ipynb
    │   └── 07_document_extraction_validation.ipynb
    │
    ├── 05_model_selection_and_training/
    │   ├── 01_training_data_setup.ipynb
    │   │
    │   ├── 02_baseline_models/
    │   │   ├── 01_logistic_regression.ipynb
    │   │   ├── 02_decision_tree.ipynb
    │   │   ├── 03_random_forest.ipynb
    │   │   └── 04_svm.ipynb
    │   │
    │   ├── 03_gradient_boosting_models/
    │   │   ├── 01_xgboost.ipynb
    │   │   └── 02_catboost.ipynb
    │   │
    │   ├── 04_interpretable_models/
    │   │   └── 01_explainable_boosting_machine.ipynb
    │   │
    │   ├── 05_multimodal_fusion/
    │   │   └── 01_multimodal_model_training.ipynb
    │   │
    │   ├── 06_llm_interview_assistant/
    │   │   ├── 01_llm_model_selection_and_setup.ipynb
    │   │   ├── 02_interview_prompt_engineering.ipynb
    │   │   ├── 03_interview_conversation_and_followup_generation.ipynb
    │   │   ├── 04_structured_response_extraction_and_validation.ipynb
    │   │   └── 05_llm_interview_assistant_evaluation.ipynb
    │   │
    │   ├── 07_model_comparison_and_tuning.ipynb
    │   └── 08_final_model_evaluation.ipynb
    │
    └── 06_model_artifacts_and_reporting/
        ├── 01_model_artifact_export.ipynb
        └── 02_experiment_results_summary.ipynb
```

---

## Research Phases

### Phase 01: Data Collection
Focuses on auditing and cataloging all raw tabular records and supporting physical/digitized documents. Verifies data provenance, schemas, and institutional access authorization without displaying unmasked Protected Health Information (PHI).

### Phase 02: Data Preparation
Handles data quality audits, missing value resolution, taxonomy mapping to standard MSWD/DSWD charity classifications, categorical encoding, and patient-document relational linkage verification. Enforces strict zero-leakage transformers.

### Phase 03: Feature Engineering
Extracts domain-relevant socioeconomic hardship indicators (per-capita income, poverty thresholds, dependency ratios) and clinical urgency factors. Validates feature transformations and executes rigorous target leakage audits before locking the feature contract.

### Phase 04: Document Processing and OCR
Decouples visual region detection from text recognition:
- **YOLO Document Detection**: Prepares datasets, validates annotations, trains and evaluates YOLO for detecting document regions (headers, demographic blocks, socioeconomic tables, stamps/signatures), and extracts region crops.
- **OCR Engine Benchmarks & Fine-Tuning**: Benchmarks PaddleOCR, EasyOCR, and TrOCR using standard Character Error Rate (CER) and Word Error Rate (WER) metrics. Provides domain fine-tuning and comparative synthesis.
- **Linkage**: Extracts verified documentary indicators and fuses them with patient case files.

### Phase 05: Model Selection and Training
Maintains two strictly decoupled, parallel model research tracks:

#### Track A: Eligibility Classification Models
Predicts charity patient eligibility (`ELIGIBLE` vs `INELIGIBLE`) using validated, leak-free pre-decision features:
- **Baselines**: Logistic Regression, Decision Tree, Random Forest, Support Vector Machine (`02_baseline_models/`).
- **Gradient Boosting**: XGBoost, CatBoost (`03_gradient_boosting_models/`).
- **Interpretable Models**: Explainable Boosting Machine (`04_interpretable_models/`).
- **Multimodal Fusion**: Early and late fusion combining tabular indicators with document-derived features (`05_multimodal_fusion/`).
- **Benchmarking & Champion Selection**: Evaluated across identical 5-fold Stratified Cross-Validation partitions (`07_model_comparison_and_tuning.ipynb` and `08_final_model_evaluation.ipynb`).

#### Track B: LLM Interview Assistant (`06_llm_interview_assistant/`)
An independent conversational AI decision-support component designed to assist Medical Social Workers (MSWs) during **Stage 2 patient intake interviews**:
- `01_llm_model_selection_and_setup.ipynb`: Formulates an evidence-based multi-criteria evaluation of local edge models (Qwen 2.5 7B, Llama 3.1 8B, Mistral 7B) versus cloud APIs (Gemini 1.5 Flash, GPT-4o-mini).
- `02_interview_prompt_engineering.ipynb`: Designs system prompts, behavioral guardrails, and structured interview prompts across 5 clinical and psychosocial domains.
- `03_interview_conversation_and_followup_generation.ipynb`: Implements multi-turn dialogue state tracking, empathetic Taglish follow-up question generation, and MSW-in-the-loop triage (`ACCEPTED`, `EDITED`, `REJECTED`).
- `04_structured_response_extraction_and_validation.ipynb`: Normalizes free-text interview disclosures into validated Pydantic JSON schemas with verbatim provenance and caseworker verification flags.
- `05_llm_interview_assistant_evaluation.ipynb`: Evaluates conversational relevance, factual faithfulness, schema compliance, Taglish sensitivity, and inference latency across synthetic stress-test scenarios.

*Strict Architectural Boundaries:*
1. The LLM is **NOT** an eligibility classifier and is never included in Track A's champion model selection or ROC-AUC benchmarking.
2. The LLM never assigns clinical severity ratings, coping scores, or financial distress indices.
3. The LLM operates strictly as a human-in-the-loop copilot; all extracted facts require MSW review before confirmation.
4. Retrieval-Augmented Generation (RAG) and vector databases are deliberately excluded from this initial phase and reserved for future institutional policy integrations.

### Phase 06: Model Artifacts and Reporting
Packages and serializes the winning Track A model architecture alongside its preprocessor and feature contract. Summarizes end-to-end experimental findings across both Track A (classification) and Track B (interview assistant) into thesis-ready documentation.

---

## Research & Data Governance Rules

1. **Raw Data Preservation:** Raw datasets in `data/raw/` are strictly read-only.
2. **Confidentiality:** Direct patient identifiers (names, addresses, contact numbers) are quarantined and never displayed.
3. **Target Leakage Prevention:** Decision proxies (e.g., approved discounts) are excluded from predictor sets.
4. **Reproducibility:** Random seeds (e.g., `20261123`) are fixed and recorded across all splits and algorithms.
5. **Decoupled Model Roles:** Conversational LLM assistance and quantitative eligibility classification remain strictly independent components.

