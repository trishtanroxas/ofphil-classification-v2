# OFPHIL V2 — Master Notebook Index

This document catalogs all 41 approved research notebooks within the OFPHIL V2 experimentation architecture, detailing their filenames, locations, and research purposes.

---

## Phase 01: Data Collection

| Notebook | File Path | Purpose |
| :--- | :--- | :--- |
| **01.01** | `01_data_collection/01_source_and_patient_record_inventory.ipynb` | Inventory available patient record datasets, document data sources, record provenance, schema structures, and verify data accessibility across authorized storage locations. |
| **01.02** | `01_data_collection/02_supporting_document_inventory.ipynb` | Inventory physical and digitized supporting documents (e.g., Certificate of Indigency, Social Case Study, Medical Abstracts, Valid IDs), cataloging file types, resolutions, and availability for linkage. |

---

## Phase 02: Data Preparation

| Notebook | File Path | Purpose |
| :--- | :--- | :--- |
| **02.01** | `02_data_preparation/01_data_quality_and_verification.ipynb` | Assess data completeness, schema consistency, duplicate records, distribution anomalies, and verify data integrity before any transformation. |
| **02.02** | `02_data_preparation/02_taxonomy_and_category_mapping.ipynb` | Standardize non-uniform categorical values, align medical diagnoses and charity eligibility classifications with standard taxonomies (MSWD / DSWD guidelines). |
| **02.03** | `02_data_preparation/03_data_cleaning_and_missing_values.ipynb` | Execute systematic data cleaning, resolve missing values via domain-justified imputation or indicator flags, and remove invalid records. |
| **02.04** | `02_data_preparation/04_patient_document_linkage_audit.ipynb` | Audit and verify the relational integrity and alignment between tabular patient profiles and their uploaded supporting documents. |
| **02.05** | `02_data_preparation/05_encoding_and_numerical_preprocessing.ipynb` | Formulate scikit-learn compatible preprocessing transformers for categorical encoding, numerical scaling, and power transformations. |
| **02.06** | `02_data_preparation/06_prepared_dataset_validation.ipynb` | Perform final validation and quality assurance of prepared datasets before feature engineering and model training splits. |

---

## Phase 03: Feature Engineering

| Notebook | File Path | Purpose |
| :--- | :--- | :--- |
| **03.01** | `03_feature_engineering/01_feature_extraction_and_creation.ipynb` | Engineer domain-specific socioeconomic and clinical features relevant to charity patient eligibility classification. |
| **03.02** | `03_feature_engineering/02_feature_transformation.ipynb` | Apply mathematical transformations (logarithmic, power, binning) to address feature skewness and optimize linear/tree model performance. |
| **03.03** | `03_feature_engineering/03_feature_selection_and_leakage_review.ipynb` | Conduct rigorous feature selection, eliminate redundant/collinear predictors, and audit for target leakage or administrative proxy features. |
| **03.04** | `03_feature_engineering/04_feature_schema_validation.ipynb` | Validate the final feature schema, ensuring data contract compliance, non-null specifications, and feature store readiness. |

---

## Phase 04: Document Processing and OCR

| Notebook | File Path | Purpose |
| :--- | :--- | :--- |
| **04.01** | `04_document_processing_and_ocr/01_document_inventory_and_validation.ipynb` | Validate the document corpus for image quality, resolution, format compliance, and corruption before vision modeling. |
| **04.02** | `04_document_processing_and_ocr/02_document_preprocessing.ipynb` | Formulate document image preprocessing pipelines (deskewing, binarization, denoising, contrast enhancement) to improve downstream OCR accuracy. |
| **04.03.01** | `04_document_processing_and_ocr/03_yolo_document_detection/01_yolo_document_dataset_preparation.ipynb` | Structure and format the document object detection dataset into the standardized YOLO directory format (images/labels, train/val/test splits, data.yaml). |
| **04.03.02** | `04_document_processing_and_ocr/03_yolo_document_detection/02_yolo_annotation_and_label_validation.ipynb` | Validate YOLO format annotation files (.txt) for coordinate boundaries, label consistency, missing files, and zero-area bounding boxes. |
| **04.03.03** | `04_document_processing_and_ocr/03_yolo_document_detection/03_yolo_model_training.ipynb` | Formulate the training pipeline, hyperparameter configuration, and experiment tracking for YOLO document region detection. |
| **04.03.04** | `04_document_processing_and_ocr/03_yolo_document_detection/04_yolo_model_evaluation.ipynb` | Evaluate YOLO document detection performance using precision, recall, mAP@0.5, and mAP@0.5:0.95 across document region classes. |
| **04.03.05** | `04_document_processing_and_ocr/03_yolo_document_detection/05_yolo_inference_and_region_extraction.ipynb` | Extract and crop detected document bounding regions and save as isolated ROI image snippets for OCR. |
| **04.04** | `04_document_processing_and_ocr/04_ocr_extraction_and_text_recognition.ipynb` | Formulate unified OCR extraction pipelines to recognize text from cropped document regions, implementing text cleaning and structured entity extraction. |
| **04.05.01** | `04_document_processing_and_ocr/05_ocr_model_benchmarks/01_paddleocr_cer_wer_benchmark.ipynb` | Benchmark pretrained PaddleOCR performance on charity documents using Character Error Rate (CER) and Word Error Rate (WER) against ground truth transcriptions. |
| **04.05.02** | `04_document_processing_and_ocr/05_ocr_model_benchmarks/02_easyocr_cer_wer_benchmark.ipynb` | Benchmark pretrained EasyOCR performance on charity documents using Character Error Rate (CER) and Word Error Rate (WER) against ground truth transcriptions. |
| **04.05.03** | `04_document_processing_and_ocr/05_ocr_model_benchmarks/03_trocr_cer_wer_benchmark.ipynb` | Benchmark pretrained Transformer OCR (TrOCR) on charity documents, evaluating vision-encoder-decoder performance on handwritten case study notes. |
| **04.05.04** | `04_document_processing_and_ocr/05_ocr_model_benchmarks/04_paddleocr_finetuning_on_ofphil.ipynb` | Formulate fine-tuning pipelines to adapt PaddleOCR text recognition on domain-specific OFPHIL charity documents, stamps, and Philippine currency notation. |
| **04.05.05** | `04_document_processing_and_ocr/05_ocr_model_benchmarks/05_trocr_finetuning_on_ofphil.ipynb` | Formulate fine-tuning workflows for Vision-Encoder-Decoder (TrOCR) models on handwritten social worker case notes and medical signatures. |
| **04.05.06** | `04_document_processing_and_ocr/05_ocr_model_benchmarks/06_ocr_engines_comparative_summary.ipynb` | Synthesize and compare benchmark results across PaddleOCR, EasyOCR, and TrOCR (both base and fine-tuned) to select the optimal document OCR engine. |
| **04.06** | `04_document_processing_and_ocr/06_document_classification_and_linkage.ipynb` | Classify extracted document types (Indigency Certificate, Medical Abstract, Social Case Study, ID) and link document-derived features to patient records. |
| **04.07** | `04_document_processing_and_ocr/07_document_extraction_validation.ipynb` | Perform end-to-end validation of the document processing pipeline, auditing OCR fidelity, entity extraction correctness, and absence of sensitive image exposure. |

---

## Phase 05: Model Selection and Training

| Notebook | File Path | Purpose |
| :--- | :--- | :--- |
| **05.01** | `05_model_selection_and_training/01_training_data_setup.ipynb` | Establish leak-proof cross-validation splits, configure Stratified K-Fold partitioning, and quarantine the final test set. |
| **05.02.01** | `05_model_selection_and_training/02_baseline_models/01_logistic_regression.ipynb` | Train and evaluate a regularized multinomial Logistic Regression baseline model using 5-fold Stratified Cross-Validation. |
| **05.02.02** | `05_model_selection_and_training/02_baseline_models/02_decision_tree.ipynb` | Train and evaluate a Decision Tree classifier baseline, assessing single-tree decision rules, interpretability, and vulnerability to overfitting. |
| **05.02.03** | `05_model_selection_and_training/02_baseline_models/03_random_forest.ipynb` | Train and tune a Random Forest ensemble baseline, assessing bagging performance gains, out-of-bag error, and feature importances. |
| **05.02.04** | `05_model_selection_and_training/02_baseline_models/04_svm.ipynb` | Train and evaluate Support Vector Classifiers (Linear and RBF kernels) for charity eligibility classification, examining margin boundaries. |
| **05.03.01** | `05_model_selection_and_training/03_gradient_boosting_models/01_xgboost.ipynb` | Train, tune, and evaluate an extreme gradient boosted decision tree (XGBoost) model for multi-class charity eligibility classification. |
| **05.03.02** | `05_model_selection_and_training/03_gradient_boosting_models/02_catboost.ipynb` | Train, tune, and evaluate a CatBoost classifier, leveraging native categorical feature handling and symmetric trees for charity eligibility classification. |
| **05.04.01** | `05_model_selection_and_training/04_interpretable_models/01_explainable_boosting_machine.ipynb` | Train and evaluate an Explainable Boosting Machine (EBM from InterpretML) to establish an inherently glass-box, interpretable benchmark for charity eligibility classification. |
| **05.05.01** | `05_model_selection_and_training/05_multimodal_fusion/01_multimodal_model_training.ipynb` | Train and evaluate multimodal fusion models that integrate structured tabular socioeconomic features with document-derived indicators and text representations. |
| **05.06** | `05_model_selection_and_training/06_model_comparison_and_tuning.ipynb` | Consolidate and benchmark cross-validation metrics across all candidate models, perform statistical significance testing, and select the winning model architecture. |
| **05.07** | `05_model_selection_and_training/07_final_model_evaluation.ipynb` | Perform the one-time, definitive evaluation of the empirically selected champion model against the untouched held-out final test set. |

---

## Phase 06: Model Artifacts and Reporting

| Notebook | File Path | Purpose |
| :--- | :--- | :--- |
| **06.01** | `06_model_artifacts_and_reporting/01_model_artifact_export.ipynb` | Package, serialize, and export the finalized champion model alongside its complete preprocessing pipeline, feature contract, and metadata for deployment. |
| **06.02** | `06_model_artifacts_and_reporting/02_experiment_results_summary.ipynb` | Consolidate all experimental findings across the entire OFPHIL V2 research lifecycle into a publication-ready synthesis report. |
