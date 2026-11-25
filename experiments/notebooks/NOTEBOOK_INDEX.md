# OFPHIL Research Notebook Index

This master index maps all active experimental notebooks across the six established research phases.

## Phase 01: Data Collection & Inventory
- `01_data_collection/01_source_and_patient_record_inventory.ipynb` — Patient master directory audit and source profiling.
- `01_data_collection/02_supporting_document_inventory.ipynb` — Audit of uploaded patient verification documents.

## Phase 02: Data Preparation
- `02_data_preparation/01_data_quality_and_verification.ipynb` — Quality integrity checks and anomalous record detection.
- `02_data_preparation/02_taxonomy_and_category_mapping.ipynb` — Alignment with Philippine socioeconomic brackets.
- `02_data_preparation/03_data_cleaning_and_missing_values.ipynb` — Systematic imputation and cleaning.
- `02_data_preparation/04_patient_document_linkage_audit.ipynb` — Referential integrity between patients and documents.
- `02_data_preparation/05_encoding_and_numerical_preprocessing.ipynb` — One-hot / ordinal encoding and transformations.
- `02_data_preparation/06_prepared_dataset_validation.ipynb` — Schema lock for development datasets.

## Phase 03: Feature Engineering
- `03_feature_engineering/01_feature_extraction_and_creation.ipynb` — Per-capita income, dependency ratio derivations.
- `03_feature_engineering/02_feature_transformation.ipynb` — Non-linear log scalers and standardization.
- `03_feature_engineering/03_feature_selection_and_leakage_review.ipynb` — Strict target leakage audit.
- `03_feature_engineering/04_feature_schema_validation.ipynb` — Immutable feature schema declaration.

## Phase 04: Document Processing & OCR (Track A: Document Fraud Screening)
- `04_document_processing_and_ocr/01_document_inventory_and_validation.ipynb` — Document vault cataloging.
- `04_document_processing_and_ocr/02_document_preprocessing.ipynb` — OpenCV image deskewing and CLAHE contrast enhancement.
- `04_document_processing_and_ocr/03_yolo_document_detection/01_yolo_document_dataset_preparation.ipynb` — Annotation dataset preparation.
- `04_document_processing_and_ocr/03_yolo_document_detection/02_yolo_annotation_and_label_validation.ipynb` — 7-class label verification.
- `04_document_processing_and_ocr/03_yolo_document_detection/03_yolo_model_training.ipynb` — **YOLO11s** (`yolo11s.pt`) document layout training.
- `04_document_processing_and_ocr/03_yolo_document_detection/04_yolo_model_evaluation.ipynb` — YOLO11s mAP50 / mAP50-95 detection evaluation.
- `04_document_processing_and_ocr/03_yolo_document_detection/05_yolo_inference_and_region_extraction.ipynb` — YOLO11s region cropping for OCR.
- `04_document_processing_and_ocr/04_paddleocr_text_extraction.ipynb` — Authoritative **PaddleOCR PP-OCRv6** extraction and CER/WER benchmarking.
- `04_document_processing_and_ocr/05_document_classification_and_linkage.ipynb` — Functional taxonomy classification and patient linking.
- `04_document_processing_and_ocr/06_document_extraction_validation.ipynb` — End-to-end OCR schema validation.
- `04_document_processing_and_ocr/07_image_forgery_screening.ipynb` — OpenCV, ORB/SIFT, and Copy-Move Forgery Detection (CMFD) screening.
- `04_document_processing_and_ocr/08_signature_and_stamp_screening.ipynb` — YOLO11s signature/stamp localization and manual verification reporting.

## Phase 05: Model Selection and Training
### Track C: Eligibility Classification (RF, CatBoost, EBM only)
- `05_model_selection_and_training/01_training_data_setup.ipynb` — Leak-free nested CV fold partitioning.
- `05_model_selection_and_training/02_random_forest.ipynb` — Random Forest ensemble baseline classifier.
- `05_model_selection_and_training/03_catboost.ipynb` — CatBoost categorical gradient boosted trees classifier.
- `05_model_selection_and_training/04_explainable_boosting_machine.ipynb` — EBM glassbox interpretable classifier.
- `05_model_selection_and_training/05_model_comparison_and_tuning.ipynb` — Benchmark comparison across RF, CatBoost, and EBM.
- `05_model_selection_and_training/06_final_model_evaluation.ipynb` — Final test set evaluation, calibration analysis, and artifact generation.

### Track B: LLM-Powered Patient Interview Assistant (Independent Track)
- `05_model_selection_and_training/07_llm_interview_assistant/01_qwen_model_selection_and_setup.ipynb` — Qwen3-4B-Instruct-2507 setup (Ollama / llama.cpp).
- `05_model_selection_and_training/07_llm_interview_assistant/02_interview_prompt_engineering.ipynb` — Bilingual/Taglish prompts and clinical guardrails.
- `05_model_selection_and_training/07_llm_interview_assistant/03_interview_conversation_and_followup_generation.ipynb` — Multi-turn context and follow-up generation.
- `05_model_selection_and_training/07_llm_interview_assistant/04_structured_response_extraction_and_validation.ipynb` — Structured JSON extraction & Pydantic validation.
- `05_model_selection_and_training/07_llm_interview_assistant/05_llm_interview_assistant_evaluation.ipynb` — Schema compliance, faithfulness, and latency evaluation.

### Semantic Text Processing (SBERT — Independent NLP Component)
- `05_model_selection_and_training/08_sbert_semantic_text_processing/01_sbert_model_selection_and_setup.ipynb` — `paraphrase-multilingual-MiniLM-L12-v2` (384-d) setup.
- `05_model_selection_and_training/08_sbert_semantic_text_processing/02_text_preprocessing_and_embedding_generation.ipynb` — Filipino/English/Taglish text normalization & embedding generation.
- `05_model_selection_and_training/08_sbert_semantic_text_processing/03_semantic_similarity_analysis.ipynb` — Cosine similarity & paraphrase analysis.
- `05_model_selection_and_training/08_sbert_semantic_text_processing/04_interview_text_representation.ipynb` — MSW-confirmed interview text representation.
- `05_model_selection_and_training/08_sbert_semantic_text_processing/05_sbert_evaluation.ipynb` — Synthetic semantic & Taglish evaluation.

## Phase 06: Model Artifacts and Reporting
- `06_model_artifacts_and_reporting/01_model_artifact_export.ipynb` — Reproducible serialization of pipelines and thresholds.
- `06_model_artifacts_and_reporting/02_experiment_results_summary.ipynb` — Consolidated performance metrics report.
