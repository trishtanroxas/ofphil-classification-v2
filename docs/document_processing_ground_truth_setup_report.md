# OFPHIL V2 — DOCUMENT PROCESSING & GROUND TRUTH SETUP AUDIT REPORT

**Date:** 2026-11-23  
**Status:** **READY WITH DOCUMENTED LIMITATIONS**  
**Auditor:** Antigravity AI Engineering Assistant  
**Target Environment:** `ofphil-classification-v2` | Phase 04 Document Processing and OCR Pipeline  

---

## 1. Executive Summary

This report documents the inspection, organization, structural validation, and pipeline integration of the document-processing ground-truth annotations and supporting artifacts copied into `ofphil-classification-v2`.

All source artifacts copied into `data/interim/document_processing/` have been verified for file system integrity, structural validity, schema consistency, and relationship with raw document samples (`data/raw/documents/samples/supporting_docu/`). No original ground-truth labels were fabricated, modified, or overwritten. Zero execution of Jupyter notebooks, YOLO models, or OCR models was performed.

---

## 2. Directory Tree Discovered in V2

The document-processing interim directory structure is established under `data/interim/document_processing/`:

```text
data/interim/document_processing/
├── ground_truth_annotations/
│   ├── backups/
│   │   ├── fresh_backup_20261027_095057/
│   │   ├── ocr_transcription_annotations_backup_20261106_142920.csv
│   │   ├── ocr_transcription_annotations_backup_before_option1_fill.csv
│   │   ├── ocr_transcription_annotations_backup_before_sequential_id.csv
│   │   ├── ocr_transcription_annotations_backup_before_sig_encode.csv
│   │   └── ocr_transcription_annotations_backup_before_v2_migration.csv
│   ├── document_elements_manifest.csv
│   ├── ocr_transcription_annotations.csv
│   ├── ocr_transcription_annotations_v2.csv
│   ├── structured_data_annotations.csv
│   └── text_detection_annotations.csv
│
├── model_predictions_and_benchmarks/
│   ├── paddleocr/
│   │   ├── model_detection_predictions.csv
│   │   ├── model_ocr_transcription_benchmark.csv
│   │   └── paddleocr_evaluation_benchmark_report.json
│   ├── trocr_finetuned/
│   │   ├── trocr_5epoch_training_history.csv
│   │   ├── trocr_finetuned_benchmark.csv
│   │   └── trocr_finetuned_evaluation_report.json
│   └── trocr_pretrained/
│       ├── trocr_benchmark.csv
│       └── trocr_evaluation_benchmark_report.json
│
├── paddleocr_dataset/
│   ├── rec_gt_test.txt
│   ├── rec_gt_train.txt
│   └── rec_gt_val.txt
│
├── splits/
│   ├── document_level_split_manifest.json
│   ├── test_manifest_v2.csv
│   ├── test_unseen_documents_crops.csv
│   ├── train_manifest_v2.csv
│   └── val_manifest_v2.csv
│
├── standardized/
│   ├── annotation_box_types.json
│   ├── annotation_label_classes.json
│   ├── ocr_transcription_annotations.csv
│   └── text_detection_annotations.csv
│
├── annotation_box_types.json
├── annotation_label_classes.json
├── blank_transcriptions_report.md
├── blank_transcriptions_summary.csv
├── document_categorization_summary.json
├── document_inventory_manifest.csv
├── document_inventory_summary.json
├── extracted_document_entities.json
├── linkage_verification_summary.json
├── ocr_evaluation_benchmark_report.json
├── ocr_processing_summary.json
├── ocr_recognition_corpus.json
└── patient_document_linkage_manifest.csv
```

**Total files inspected in `data/interim/document_processing/`:** **56 files** across 12 subdirectories.

---

## 3. Ground Truth Annotation Inventory & Structural Validation

Every ground-truth annotation file was inspected and structurally parsed:

| Artifact Name | Format | Rows / Entries | Columns / Keys | Status | Findings & Data Integrity Notes |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `text_detection_annotations.csv` | CSV | 27,386 | 16 | **VALID** | Contains bounding boxes (`bbox_x`, `bbox_y`, `bbox_width`, `bbox_height`). Zero non-positive dimensions ($w \le 0$ or $h \le 0$). 174 unique label names across 6 primary box types (`FORM_SECTION`, `HANDWRITTEN_ENTRY`, `TABLE_CELL`, `SIGNATURE`, etc.). |
| `ocr_transcription_annotations.csv` | CSV | 27,386 | 18 | **VALID WITH WARNING** | 26,992 fully transcribed text segments; 394 missing/blank transcriptions corresponding to non-text stamps/signatures (documented in `blank_transcriptions_report.md`). Modality: 18,202 printed, 8,784 handwritten, 400 mixed. |
| `ocr_transcription_annotations_v2.csv` | CSV | 21,357 | 10 | **VALID** | Filtered dataset with RoBERTa token counts and pre-assigned split partitions (15,043 train, 3,536 validation, 2,778 test). Zero missing ground truth text. |
| `document_elements_manifest.csv` | CSV | 359 | 8 | **VALID** | Maps individual cropped document elements to parent document identifiers, element types, and coordinates. |
| `structured_data_annotations.csv` | CSV | 50 | 10 | **VALID** | Key-value extractions across 50 reference documents mapping clinical diagnosis, total amount billed, indigency certification status, and tabular features. |
| `annotation_box_types.json` | JSON | 6 types | Array | **VALID** | Valid list of allowable element bounding box categories. |
| `annotation_label_classes.json` | JSON | 168 classes | Array | **VALID** | Valid vocabulary of classification classes across clinical and socioeconomic document templates. |
| `blank_transcriptions_summary.csv` | CSV | 0 rows | 3 | **VALID** | Schema header intact (`document_category`, `label_name`, `blank_count`). |

---

## 4. Document Inventory and Linkage Findings

### A. Raw Document Inventory Manifest
- **Manifest:** `document_inventory_manifest.csv` (1,338 rows)
- **Path Verification:**
  - Manifest records document paths formatted as `data/raw/supporting document/supporting_docu/...`
  - In V2, the raw document repository is structured under `data/raw/documents/samples/supporting_docu/`.
  - Path normalization resolves **1,336 out of 1,338 documents (99.85%)** directly to existing images on disk.
  - **Unmatched Samples (2 rows):** `uploads/doc_04230422ef08.pdf` and `uploads/doc_ed04a3467923.pdf` are PDF test uploads that were excluded from image OCR batches.

### B. Patient Linkage Manifest
- **Manifest:** `patient_document_linkage_manifest.csv` (1,338 rows)
- **Linkage Status:**
  - 1,337 documents cataloged with status `NEEDS_REVIEW_FOLDER_CATALOG`.
  - 1 document mapped with status `CONSISTENT_DB_LINKED`.
- **Finding:** The ground truth reflects an archival cataloging status where documents are organized primarily by document category and capture mode rather than individual synthetic patient IDs. Synthetic patient-document linkage is separately managed via `data/synthetic/documents/linkage/synthetic_patient_document_links.csv` (1,200 links).

---

## 5. Physical Capture vs. Scan Capture Inventory

Inspection of `data/raw/documents/samples/supporting_docu/` confirms two distinct acquisition modalities:

1. **Physical Capture (`physical_capture/`):**
   - **Total Images:** 850 files across 30 document categories.
   - **Characteristics:** Variable perspective angles, mobile camera lighting, shadows, folds, and natural skew typical of point-of-care caseworker uploads.
2. **Scan Capture (`scan_capture/`):**
   - **Total Images:** 852 files across 30 document categories.
   - **Characteristics:** Flatbed-scanned documents, uniform DPI (typically 200–300 DPI), high contrast, minimal perspective distortion.
3. **Implication:** The Phase 04 preprocessing and YOLO detection pipelines must preserve capture modality metadata to benchmark OCR robustness across camera vs. scanner inputs without assuming identical resolution or orientation.

---

## 6. Mapping Ground Truth to Phase 04 Notebooks

The 23 Phase 04 notebooks located in `experiments/notebooks/04_document_processing_and_ocr/` were mapped against available ground-truth inputs:

| Notebook | Required Ground Truth Inputs | Consumed Datasets | Expected Output Artifacts | Status |
| :--- | :--- | :--- | :--- | :---: |
| `01_document_inventory_and_validation.ipynb` | `document_inventory_manifest.csv` | `data/raw/documents/samples/supporting_docu/` | `document_quality_audit.json` | **READY** |
| `02_document_preprocessing.ipynb` | `document_inventory_manifest.csv` | Raw document images | `data/interim/extracted/preprocessed_docs/` | **READY** |
| `03_yolo_document_detection/01..05` | `text_detection_annotations.csv`, `annotation_label_classes.json` | Preprocessed images & split manifests | `data/processed/yolo_dataset/`, trained YOLO models, ROI crops | **READY** |
| `04_ocr_extraction_and_text_recognition.ipynb` | `ocr_transcription_annotations.csv`, `paddleocr_dataset/` | ROI crops & document images | Extracted transcription JSON | **READY** |
| `05_ocr_model_benchmarks/01..06` | `ocr_transcription_annotations_v2.csv`, `splits/*_manifest_v2.csv` | Reference transcriptions | Comparative CER/WER benchmarks, evaluation reports | **READY** |
| `06_document_tampering_detection/01..06` | `extracted_document_entities.json` | Physical vs. scan capture pairs | Forensic metrics, tampering localization overlays | **READY WITH LIMITATIONS** (Synthetic tampering masks pending) |
| `07_document_authenticity_verification.ipynb` | `structured_data_annotations.csv` | Multi-modal OCR & seal scores | `data/processed/authenticity/verification_audit_trail.csv` | **READY** |
| `08_document_classification_and_linkage.ipynb` | `patient_document_linkage_manifest.csv` | Classified document categories | Linked patient document feature vectors | **READY** |
| `09_document_extraction_validation.ipynb` | `structured_data_annotations.csv` | Entity extraction logs | `validation_certificate.json` | **READY** |

---

## 7. Audit of Notebook Code Integrity & Clean State

All 23 notebooks in `experiments/notebooks/04_document_processing_and_ocr/` were audited for execution readiness:
- **`execution_count`:** All code cells have `execution_count: null`.
- **`outputs`:** All code cells have empty outputs (`outputs: []`).
- **No external downloads:** No auto-downloading of model weights or external datasets.
- **Path References:** Project-relative paths (`PROJECT_ROOT` / `ROOT_DIR`) are configured to resolve within the `ofphil-classification-v2` workspace.

---

## 8. Missing Ground Truth & Unresolved Limitations

1. **Synthetic Tampering Masks:** Sub-pipeline `06_document_tampering_detection` has dataset preparation templates, but pixel-level ground-truth splicing masks for forged documents are not yet present. The user will provide additional forgery ground truth later.
2. **Clinical Patient Linking:** 1,337 sample documents in `patient_document_linkage_manifest.csv` have archival category labeling (`NEEDS_REVIEW_FOLDER_CATALOG`) rather than direct patient MRN linkage. Patient matching will rely on `synthetic_patient_document_links.csv` and OCR entity extraction.
3. **2 PDF Test Uploads:** `uploads/doc_04230422ef08.pdf` and `uploads/doc_ed04a3467923.pdf` are referenced in the raw manifest but are not in the image samples folder. They represent non-image test submissions and do not affect the 1,336 image dataset.

---

## 9. Final Readiness Determination

**STATUS: READY WITH DOCUMENTED LIMITATIONS**

The copied document-processing artifacts and ground-truth annotations are organized, verified, and mapped to the Phase 04 research pipeline. The project owner can manually execute the Phase 04 notebooks in JupyterLab sequentially without path conflicts or unhandled missing dependencies.
