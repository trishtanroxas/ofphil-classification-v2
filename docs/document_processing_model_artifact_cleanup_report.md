# Document Processing Model Artifact Cleanup Report

**Date**: 2026-11-24  
**Project**: `ofphil-classification-v2`  
**Target Path**: `data/interim/document_processing/model_predictions_and_benchmarks/`

---

## 1. Executive Summary

As part of the document processing pipeline hygiene and ground-truth preservation maintenance, model-generated artifacts, serialized prediction files, inference logs, and benchmark evaluation outputs inside `data/interim/document_processing/model_predictions_and_benchmarks/` were inspected and selectively removed. All primary ground-truth datasets, annotations, OCR reference files, manifests, and dataset splits were strictly preserved intact.

The target directory `data/interim/document_processing/model_predictions_and_benchmarks/` remains in place to preserve the existing directory structure.

---

## 2. Removed Model Artifacts

A total of 11 model-generated files across 4 model subdirectories and the benchmark summary were identified and safely deleted:

| Original Relative Path | File Size | Description / Artifact Type |
| :--- | :--- | :--- |
| `easyocr/easyocr_benchmark.csv` | 4,507,009 bytes (~4.3 MB) | EasyOCR inference predictions and evaluation metrics |
| `easyocr/easyocr_evaluation_benchmark_report.json` | 882 bytes | EasyOCR aggregated benchmark performance metrics |
| `paddleocr/model_detection_predictions.csv` | 4,111,852 bytes (~3.9 MB) | PaddleOCR bounding box detection inference outputs |
| `paddleocr/model_ocr_transcription_benchmark.csv` | 4,639,276 bytes (~4.4 MB) | PaddleOCR transcription inference predictions and CER/WER |
| `paddleocr/paddleocr_evaluation_benchmark_report.json` | 1,616 bytes | PaddleOCR evaluation benchmark summary report |
| `trocr_finetuned/trocr_5epoch_training_history.csv` | 618 bytes | Fine-tuned TrOCR training loss and epoch history |
| `trocr_finetuned/trocr_finetuned_benchmark.csv` | 437,271 bytes (~427 KB) | Fine-tuned TrOCR inference predictions on test split |
| `trocr_finetuned/trocr_finetuned_evaluation_report.json` | 2,288 bytes | Fine-tuned TrOCR evaluation benchmark summary report |
| `trocr_pretrained/trocr_benchmark.csv` | 4,344,734 bytes (~4.1 MB) | Pretrained TrOCR inference predictions |
| `trocr_pretrained/trocr_evaluation_benchmark_report.json` | 800 bytes | Pretrained TrOCR evaluation benchmark summary report |
| `paddleocr_vs_trocr_benchmark_summary.csv` | 385 bytes | Cross-model comparative benchmark performance summary |

**Total Space Reclaimed**: ~18.04 MB across 11 files.

---

## 3. Ambiguous Files Retained for Manual Review

In accordance with strict safety instructions (*"If a file's purpose is uncertain, preserve it and report it instead of deleting it"*), the subfolder `annotations_backup/` inside `model_predictions_and_benchmarks/` was retained:

| Path | File Size | Ambiguity Details / Recommendation |
| :--- | :--- | :--- |
| `annotations_backup/ocr_transcription_annotations.csv` | 2,431 bytes | Contains ground-truth transcription rows and manual human annotations along with model evaluation fields. Preserved to prevent data loss. |
| `annotations_backup/text_detection_annotations.csv` | 2,144 bytes | Contains verified bounding box ground-truth entries. Preserved to prevent data loss. |
| `annotations_backup/structured_data_annotations.csv` | 6,028 bytes | Contains structured ground-truth entity mappings. Matches identical ground-truth annotations in parent directories. |
| `annotations_backup/ocr_evaluation_benchmark_report.json` | 843 bytes | Evaluation metrics tied to the backup annotations. |

*Recommendation*: Since these files contain ground-truth annotation subsets and backups, they should remain preserved or migrated to `data/interim/document_processing/ground_truth_annotations/backups/` if desired during a scheduled schema review.

---

## 4. Preserved Ground-Truth and Dataset Structure Validation

All critical document processing ground truth and dataset manifests were confirmed intact:

### A. Target Directory
- `data/interim/document_processing/model_predictions_and_benchmarks/` - **EXISTS** (Preserved)

### B. Core Ground-Truth Directories & Files
- `ground_truth_annotations/` - **INTACT**
  - `document_elements_manifest.csv` (76,312 bytes)
  - `ocr_transcription_annotations.csv` (6,573,311 bytes)
  - `ocr_transcription_annotations_v2.csv` (4,618,874 bytes)
  - `structured_data_annotations.csv` (6,028 bytes)
  - `text_detection_annotations.csv` (6,025,572 bytes)
  - `backups/` (All historical snapshots preserved)
- `paddleocr_dataset/` - **INTACT**
  - `rec_gt_train.txt` (599,784 bytes)
  - `rec_gt_val.txt` (141,852 bytes)
  - `rec_gt_test.txt` (102,325 bytes)
- `splits/` - **INTACT**
  - `document_level_split_manifest.json`
  - `train_manifest_v2.csv`
  - `val_manifest_v2.csv`
  - `test_manifest_v2.csv`
  - `test_unseen_documents_crops.csv`
- `standardized/` - **INTACT**
  - `annotation_box_types.json`
  - `annotation_label_classes.json`
  - `ocr_transcription_annotations.csv`
  - `text_detection_annotations.csv`

### C. Top-Level Metadata and Document Manifests
- `annotation_box_types.json` - **INTACT**
- `annotation_label_classes.json` - **INTACT**
- `blank_transcriptions_report.md` - **INTACT**
- `blank_transcriptions_summary.csv` - **INTACT**
- `document_categorization_summary.json` - **INTACT**
- `document_inventory_manifest.csv` - **INTACT**
- `document_inventory_summary.json` - **INTACT**
- `extracted_document_entities.json` - **INTACT**
- `linkage_verification_summary.json` - **INTACT**
- `ocr_evaluation_benchmark_report.json` - **INTACT**
- `ocr_processing_summary.json` - **INTACT**
- `ocr_recognition_corpus.json` - **INTACT**
- `patient_document_linkage_manifest.csv` - **INTACT**

---

## 5. Conclusion

All model predictions, inference caches, and training run histories inside `model_predictions_and_benchmarks/` have been removed without modifying or damaging ground-truth datasets, dataset splits, or the broader project structure.
