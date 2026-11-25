# Document Processing Path Repair & Ground-Truth Verification Report

**Date**: 2026-11-24  
**Project**: `ofphil-classification-v2`  
**Task**: Immediate Document-Processing Path Correction and Ground-Truth Repair  
**Status**: **PARTIALLY RESOLVED** (Ground-truth annotations 100% resolved; 2 source PDF references remain missing from original uploads)

---

## 1. Executive Summary

A comprehensive path correction and verification procedure was executed on the active document-processing datasets within `ofphil-classification-v2`. Prior to modifications, timestamped backups of all target manifests and annotation datasets were generated under `data/interim/document_processing/ground_truth_annotations/backups/`. 

The 424 affected rows in both `ground_truth_annotations/ocr_transcription_annotations.csv` and `ground_truth_annotations/text_detection_annotations.csv` were safely corrected to point to their verified physical image locations on disk. All annotation values, bounding boxes, labels, text contents, and row counts were preserved 100% intact. An exhaustive investigation into the two missing PDF references in `document_inventory_manifest.csv` and `patient_document_linkage_manifest.csv` was also conducted.

---

## 2. Backup Integrity and Hash Verification

Backups were created before making any edits:

| Target File | Original Rows (excl. header) | File Size (Bytes) | SHA-256 Checksum | Backup Path |
| :--- | :--- | :--- | :--- | :--- |
| `ocr_transcription_annotations.csv` | 27,386 | 6,573,311 | `724cc1b781e762d7a8657ff317a6cefdcbf917e1cc2c8a35fdbaa1af8367b29d` | `ground_truth_annotations/backups/ocr_transcription_annotations_backup_20261124_070839.csv` |
| `text_detection_annotations.csv` | 27,386 | 6,025,572 | `47f1300a463104c02b24aaf6ac6af665ce6c035062927d4bb8d33422e93d6e79` | `ground_truth_annotations/backups/text_detection_annotations_backup_20261124_070839.csv` |
| `document_inventory_manifest.csv` | 1,338 | 326,974 | `0ae72f7b826dd21748139c2d69768d19917b416a136bd5b284a5ef75fd0224c7` | `ground_truth_annotations/backups/document_inventory_manifest_backup_20261124_070839.csv` |
| `patient_document_linkage_manifest.csv` | 1,338 | 208,216 | `64710c5542cc090221c757bac88f2803765c7f2e3c7c1cb779b273a4d1826853` | `ground_truth_annotations/backups/patient_document_linkage_manifest_backup_20261124_070839.csv` |

All backups were verified byte-for-byte against their source files prior to any updates.

---

## 3. Path Correction Details

### Affected Datasets & Pattern
- **Files Modified**:
  1. `data/interim/document_processing/ground_truth_annotations/ocr_transcription_annotations.csv`
  2. `data/interim/document_processing/ground_truth_annotations/text_detection_annotations.csv`
- **Original Truncated Pattern**: `supporting_docu/scan_capture/referral`
- **Correct Canonical Path Pattern**: `data/raw/supporting document/supporting_docu/scan_capture/referral/<file_name>`
- **Number of Rows Corrected**: Exactly **424 rows** in each CSV file.
- **Unique Affected Image Files**: **21 files** (`ref_s_040.jpg` through `ref_s_060.jpg`).

### Verification of Physical Files on Disk
All 21 image files were checked and verified to exist at:
`c:\Users\ASUS TUF\Desktop\Project in Program\Thesis Project\ofphil-classification-v2\data\raw\supporting document\supporting_docu\scan_capture\referral/`

- `ref_s_040.jpg` to `ref_s_060.jpg` — **All 21 files present on disk**.

### Data Preservation Check
- Row count before: 27,386 | Row count after: 27,386 (0 rows added or removed).
- Column count and order: 100% identical.
- Unaffected rows (26,962 rows): 100% identical to original backup.
- All annotation fields (bounding boxes `bbox_x`, `bbox_y`, `bbox_width`, `bbox_height`, `ground_truth_transcription`, `confidence_score`, `label_name`, `box_type`, etc.): **Preserved with zero modifications**.

---

## 4. Missing PDF Investigation

### Targeted Files
1. `uploads/doc_04230422ef08.pdf` (Document Category: Direct Upload, SHA-256 recorded: `8f5b2acc0e00becbdfc2e80e79576fc49b61021723d2bae124f728dbc6c5c7fe`)
2. `uploads/doc_ed04a3467923.pdf` (Document Category: Direct Upload, SHA-256 recorded: `c9f65ecc9449bb946290e125d43ae5635aaaed061593e829be56e78b28cd45ee`)

### Investigation Findings
- A filesystem search was performed across all directories within `ofphil-classification-v2`, including `data/raw/documents/`, `data/interim/document_processing/`, `storage/`, and root directories.
- The two PDF files are **not present** anywhere in the project repository.
- Manifest status:
  - Both records in `patient_document_linkage_manifest.csv` were already flagged as `linked_patient_id: UNASSIGNED` and `linkage_status: NEEDS_REVIEW_FOLDER_CATALOG`.
- Action Taken:
  - In accordance with the strict safety guidelines, **no fake/placeholder files were fabricated**, and **no rows were deleted**.
  - Both references remain preserved in `document_inventory_manifest.csv` and `patient_document_linkage_manifest.csv` and are categorized as:
    ```
    STATUS: MISSING_SOURCE_FILE
    REASON: Direct upload PDFs were not preserved in the repository uploads directory. Source files must be recovered from the original authorized data collection buffer if required for end-to-end PDF processing.
    ```

---

## 5. Comprehensive Post-Correction Path Resolution Audit

Every active CSV dataset and manifest was verified against the actual Windows filesystem:

| Dataset / Manifest File | Path Column Checked | Unique File Paths | Resolved On Disk | Missing | Resolution Rate | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ground_truth_annotations/ocr_transcription_annotations.csv` | `relative_path` | 1,349 | 1,349 | 0 | **100.00%** | **PASS** |
| `ground_truth_annotations/text_detection_annotations.csv` | `relative_path` | 1,349 | 1,349 | 0 | **100.00%** | **PASS** |
| `ground_truth_annotations/document_elements_manifest.csv` | `image_path` | 203 | 203 | 0 | **100.00%** | **PASS** |
| `standardized/ocr_transcription_annotations.csv` | `relative_path` | 1,017 | 1,017 | 0 | **100.00%** | **PASS** |
| `standardized/text_detection_annotations.csv` | `relative_path` | 1,017 | 1,017 | 0 | **100.00%** | **PASS** |
| `splits/train_manifest_v2.csv` | `image_path` | 916 | 916 | 0 | **100.00%** | **PASS** |
| `splits/val_manifest_v2.csv` | `image_path` | 202 | 202 | 0 | **100.00%** | **PASS** |
| `splits/test_manifest_v2.csv` | `image_path` | 200 | 200 | 0 | **100.00%** | **PASS** |
| `splits/test_unseen_documents_crops.csv` | `relative_path` | 149 | 149 | 0 | **100.00%** | **PASS** |
| `document_inventory_manifest.csv` | `relative_path` | 1,338 | 1,336 | 2 | **99.85%** | **PARTIAL** |
| `patient_document_linkage_manifest.csv` | `relative_path` | 1,338 | 1,336 | 2 | **99.85%** | **PARTIAL** |

---

## 6. Execution Compliance Confirmation

- **Jupyter Notebooks**: Zero (0) notebooks executed.
- **Model Training / Inference**: Zero (0) models trained; no inference executed.
- **Tabular Data**: Phase 02 and Phase 03 datasets left completely untouched.

---

## 7. Final Determination

**STATUS: PARTIALLY RESOLVED**

All active ground-truth annotation paths (`ocr_transcription_annotations.csv` and `text_detection_annotations.csv`), all standardized datasets, all dataset split manifests, and all element manifests have achieved **100.00% path resolution** against the filesystem. The overall dataset resolution stands at **99.85%** due exclusively to the 2 historical upload PDFs documented under `MISSING_SOURCE_FILE`.
