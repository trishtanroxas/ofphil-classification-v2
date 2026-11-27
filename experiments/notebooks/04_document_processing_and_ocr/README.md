# Phase 04 — Document Processing and OCR

## Overview
Phase 04 implements the complete document processing, OCR recognition fine-tuning, visual feature extraction, and forensic screening workflow for the OFPHIL Charity Patient Classification system (Track A).

- **OCR Engine:** **PaddleOCR PP-OCRv6** (`PP-OCRv6_medium_rec` SVTR fine-tuning + `PP-OCRv6_medium_det` DBNet inference-only)
- **Visual Feature Extraction:** **ResNet-50** (`ResNet50_Weights.DEFAULT`, 2048-d visual embeddings)
- **Image Forensics:** Error Level Analysis (ELA) + ORB/SIFT Copy-Move Forgery Detection (CMFD) — *No Siamese Network*
- **Signature & Stamp Screening:** Presence screening only (YOLO weights when available + OpenCV HSV/contour fallback) — *Manual institutional verification required*

## Active Notebook Structure & Execution Order

```text
04_document_processing_and_ocr/
├── 01_document_inventory_and_validation.ipynb
├── 02_document_preprocessing.ipynb
├── 04_paddleocr_text_extraction.ipynb
├── 05_document_classification_and_linkage.ipynb
├── 06_document_extraction_validation.ipynb
├── 07_image_forgery_screening.ipynb
├── 08_signature_and_stamp_screening.ipynb
├── resnet50/
│   ├── 01_resnet50_dataset_preparation.ipynb
│   ├── 02_resnet50_image_preprocessing_and_augmentation.ipynb
│   ├── 03_resnet50_feature_extraction.ipynb
│   ├── 04_resnet50_evaluation.ipynb
│   └── 05_resnet50_inference_and_feature_export.ipynb
└── README.md
```

## Centralized Model & Artifact Locations
- `models/phase_04/paddleocr_recognition/`: Best/last SVTR checkpoints, config, and training history.
- `models/phase_04/resnet50/`: Best/last ResNet-50 checkpoints, label mapping, preprocessing config, and evaluation metrics.
- `models/phase_04/document_classification/`: Canonical taxonomy schema.
- `data/interim/document_processing/`: Inventory manifest, preprocessed images, extracted OCR entities, classification/linkage JSON, and forensic/signature screening reports.
- `data/processed/features/`: `document_derived_features.csv` and `resnet50_document_embeddings.parquet`.
- `data/processed/validation/`: `document_extraction_validation_report.json` and `document_pipeline_validation_report.csv`.
