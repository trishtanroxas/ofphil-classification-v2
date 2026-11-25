# Phase 04 — Document Processing and OCR

## Overview
Phase 04 establishes the active computer vision, optical character recognition, and image-forensics screening pipelines for the OFPHIL Charity Patient Classification system (Track A).

- **Object Detection:** **YOLO11s** (`yolo11s.pt`)
- **OCR Engine:** **PaddleOCR PP-OCRv6 ONLY** (EasyOCR, TrOCR, and OCR fine-tuning are excluded)
- **Image Forensics:** OpenCV, ORB/SIFT, and Copy-Move Forgery Detection (CMFD) — *No Siamese Network*

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
├── 07_image_forgery_screening.ipynb
├── 08_signature_and_stamp_screening.ipynb
└── README.md
```

## Module Responsibilities
1. **01_document_inventory_and_validation.ipynb**: Audit of uploaded synthetic and authorized patient documents.
2. **02_document_preprocessing.ipynb**: OpenCV image enhancement, contrast adjustment (CLAHE), deskewing, and alignment.
3. **03_yolo_document_detection**: **YOLO11s** (`yolo11s.pt`) layout and element detection (Header, Patient Info, Findings, Tables, Dates, Signature, Stamp).
4. **04_paddleocr_text_extraction.ipynb**: Authoritative PaddleOCR PP-OCRv6 text transcription, bounding coordinates, confidence metrics, and CER/WER benchmarking.
5. **05_document_classification_and_linkage.ipynb**: Functional taxonomy assignment and foreign-key linkage to patient records.
6. **06_document_extraction_validation.ipynb**: Structural and semantic validation of OCR metadata prior to MSW review.
7. **07_image_forgery_screening.ipynb**: ORB/SIFT feature matching and modular CMFD screening for duplicated regions.
8. **08_signature_and_stamp_screening.ipynb**: YOLO11s signature/stamp localization and visual consistency screening (manual institutional verification required).
