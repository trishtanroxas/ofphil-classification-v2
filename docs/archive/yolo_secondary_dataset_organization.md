# YOLO Secondary Dataset Organization & Governance

**Project**: `ofphil-classification-v2`  
**Purpose**: Structure, registry, and governance for external document layout pretraining datasets  
**Directory Root**: `data/external/yolo_document_detection/`

---

## 1. Directory Architecture

```text
data/external/yolo_document_detection/
├── raw/
│   ├── doclaynet/        # IBM DocLayNet raw COCO JSON & image archives
│   ├── funsd/             # FUNSD form understanding JSON & scans
│   ├── xfund/             # XFUND multilingual form understanding splits
│   └── sroie/             # ICDAR 2019 SROIE receipt polygons & labels
├── interim/
│   ├── extracted/         # Unpacked raw archives
│   ├── image_inventory/   # SHA-256 integrity and deduplication catalog
│   ├── annotation_conversion/ # Raw format -> normalized YOLO conversion
│   ├── class_mapping/     # Source-to-OFPHIL class mapped records
│   └── quality_checked/   # Syntax and coordinate verified splits
├── processed/
│   ├── images/
│   │   ├── train/
│   │   ├── val/
│   │   └── test/
│   ├── labels/
│   │   ├── train/
│   │   ├── val/
│   │   └── test/
│   ├── manifests/         # Split assignment manifests & provenance
│   └── dataset_configs/   # YAML configuration files for YOLO training
├── evaluation/
│   ├── manifests/         # Out-of-domain benchmark evaluation manifests
│   ├── predictions/       # Saved inference detections on external test sets
│   └── reports/           # Comparative generalization reports
└── metadata/
    ├── dataset_registry.json
    ├── dataset_sources.csv
    ├── dataset_license_tracking.csv
    ├── dataset_inventory.csv
    ├── class_mapping_registry.json
    └── dataset_preparation_log.csv
```

---

## 2. Candidate External Datasets Summary

| Dataset ID | Full Name | Publisher | Annotation Format | Classes | License | Research Designation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`doclaynet`** | DocLayNet | IBM Research | COCO JSON | 11 Layout Classes | CDLA-Permissive-1.0 | Secondary layout pretraining & transfer learning |
| **`funsd`** | FUNSD | EPFL / IBM | JSON per page | Header, Question, Answer, Other | Non-Commercial Academic | Out-of-domain form layout benchmark |
| **`xfund`** | XFUND | Microsoft Research | JSON per split | Header, Question, Answer, Other | ODC-BY (Attribution) | Multilingual form robustness benchmark |
| **`sroie`** | SROIE | ICDAR 2019 | 8-pt Polygons + JSON | Company, Date, Address, Total | CC BY 4.0 | Fee/billing total extraction benchmark |

---

## 3. Data Leakage & Split Control Protocols

To maintain scientific integrity across institutional and external datasets:
1. **Document-Level Grouping**: All crops, slices, or augmented variants originating from a single source page must be assigned to the *same* partition (`train`, `val`, or `test`). Splitting crops from one document across partitions is strictly prohibited.
2. **SHA-256 Deduplication**: Every image processed into `interim/image_inventory/` must have its SHA-256 hash computed to detect and eliminate duplicate or identical pages.
3. **Strict Domain Isolation**: External datasets (`data/external/`) must never be merged into primary OFPHIL clinical folders (`data/raw/` or `data/interim/document_processing/`).
4. **Independent Test Sets**: Evaluation of OFPHIL clinical documents must use held-out OFPHIL test splits, never contaminated by external pretraining data.
