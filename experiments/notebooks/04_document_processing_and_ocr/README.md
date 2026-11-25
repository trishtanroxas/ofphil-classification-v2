# Phase 04 — Document Processing and OCR

## Overview
Phase 04 establishes the active computer vision and optical character recognition pipelines for the OFPHIL Charity Patient Classification system.

The authoritative OCR engine for this phase is **PaddleOCR PP-OCRv6 ONLY**. Obsolete and comparative engines (EasyOCR, TrOCR, comparative fine-tuning) have been deprecated and archived.

## Active Notebook Structure

```text
04_document_processing_and_ocr/
│
├── 01_document_inventory_and_validation.ipynb
├── 02_document_preprocessing.ipynb
│
├── 03_yolo_document_detection/
│   ├── 01_yolo_document_dataset_preparation.ipynb
│   ├── 02_yolo_annotation_and_label_validation.ipynb
│   ├── 03_yolo_model_training.ipynb
│   ├── 04_yolo_model_evaluation.ipynb
│   └── 05_yolo_inference_and_region_extraction.ipynb
│
├── 04_paddleocr_text_extraction.ipynb
├── 05_document_classification_and_linkage.ipynb
├── 06_document_extraction_validation.ipynb
└── README.md
```

## Module Responsibilities
1. **01_document_inventory_and_validation.ipynb**: Comprehensive audit of uploaded synthetic and authorized patient documents.
2. **02_document_preprocessing.ipynb**: OpenCV image enhancement, contrast adjustment (CLAHE), deskewing, and boundary cropping.
3. **03_yolo_document_detection**: YOLO document layout and element detection (Header, Field, Table, Stamp, Signature).
4. **04_paddleocr_text_extraction.ipynb**: Authoritative PaddleOCR PP-OCRv6 text transcription, bounding coordinates, confidence metrics, and CER/WER error benchmark against ground truth.
5. **05_document_classification_and_linkage.ipynb**: Automated taxonomy assignment (Certificate of Indigency, Clinical Abstract, Surgical Quotation, Valid ID) and foreign-key linkage to patient records.
6. **06_document_extraction_validation.ipynb**: Structural and semantic validation of OCR metadata prior to MSW review.
