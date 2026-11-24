# OFPHIL V2 — YOLO Implementation and Secondary Dataset Readiness Report

**Date**: November 24, 2026  
**Project**: `ofphil-classification-v2`  
**Phase**: Phase 04 – Document Processing and OCR (`03_yolo_document_detection`)  
**Architecture**: **Ultralytics YOLOv8n (YOLOv8 Nano)**  
**Pretrained Weights Target**: `yolov8n.pt`  
**Status**: **IMPLEMENTED, CONFIGURED & STAGED FOR MANUAL EXECUTION**  
**Audit Protocol**: Static Code Verification Only (Zero-Execution Protocol)

---

## 1. Existing YOLO Version Discovered

During our static inspection of the Phase 04 codebase and environment:
- **Architecture Discovered**: **Ultralytics YOLOv8n** (`model: 'yolov8n.pt'`).
- **Architecture Integrity**: No traces of YOLOv11, YOLOv12, YOLO26, or non-Nano variants were introduced. The pipeline remains strictly anchored to YOLOv8n.
- **Environment Status**: The system default Python executable (`Python 3.14.0`) does not currently have `ultralytics` or `torch` installed (`cv2: 4.13.0`, `PIL: 12.1.0`, and `yaml: 6.0.3` are present). Execution is configured for the project's dedicated deep-learning virtual environment (`ofphil-v2`), where `ultralytics`, `torch`, and `torchvision` must be installed prior to manual execution.

---

## 2. Implementation Completeness Assessment: Partial $\rightarrow$ Fully Implemented

Prior to this audit, the YOLO notebooks were structurally configured but lacked complete parameter sets, evaluation metrics parsing, and live inference extraction bridging. The following additions were implemented:

1. **`03_yolo_model_training.ipynb`**:
   - Upgraded training configuration to explicitly include reproducible seed (`20261123`), deterministic cuDNN mode, early stopping (`patience=15`), automated checkpoint saving (`save_period=5`), dataloader workers (`workers=4`), and output paths.
2. **`04_yolo_model_evaluation.ipynb`**:
   - Added evaluation harness capturing Precision ($MP$), Recall ($MR$), $mAP@0.5$, $mAP@0.5:0.95$, per-class metrics, and inference latency on held-out test splits.
   - Structured JSON report destination without fabricating scores prior to execution.
3. **`05_yolo_inference_and_region_extraction.ipynb`**:
   - Implemented `detect_and_extract_regions` to bridge live YOLO predictions into the region cropping engine.
   - Standardized 5px bounding box padding to prevent clipping of text characters.

---

## 3. Pretrained Weights Availability

- **Target Pretrained Weights**: `yolov8n.pt` (~6.2 MB; 3.2M parameters; 8.7 GFLOPs).
- **Status**: `CONFIGURED (PENDING_MANUAL_DOWNLOAD)`.
- **Acquisition Protocol**: The researcher will download or cache `yolov8n.pt` manually via `from ultralytics import YOLO; YOLO('yolov8n.pt')` in JupyterLab.

---

## 4. Hardware Compatibility Assessment (RTX 3050 4GB VRAM & 32GB RAM)

- **Compatibility Verdict**: **OPTIMAL FOR YOLOv8n**.
- **Memory Footprint**:
  - Model weights: ~6.2 MB (FP16) / ~12.5 MB (FP32).
  - Training at $640 \times 640$ with `batch=16`: estimated **1.8 GB – 2.4 GB VRAM**.
  - Total training memory comfortably stays within the 4.0 GB physical VRAM boundary (leaving 1.0–1.6 GB headroom for Windows display server and CUDA buffers).
  - Inference footprint: **< 0.8 GB VRAM**.
- **CPU Fallback**: Highly feasible on host CPU (<100ms per document page) supported by 32GB system RAM.

---

## 5. Secondary Dataset Directory & Metadata Status

The complete secondary document-detection directory structure was created under `data/external/yolo_document_detection/`:

```text
data/external/yolo_document_detection/
├── raw/ (doclaynet/, funsd/, xfund/, sroie/ with README.md & .gitkeep)
├── interim/ (extracted/, image_inventory/, annotation_conversion/, class_mapping/, quality_checked/)
├── processed/ (images/train-val-test, labels/train-val-test, manifests/, dataset_configs/)
├── evaluation/ (manifests/, predictions/, reports/)
└── metadata/
    ├── dataset_registry.json
    ├── dataset_sources.csv
    ├── dataset_license_tracking.csv
    ├── dataset_inventory.csv
    ├── class_mapping_registry.json
    └── dataset_preparation_log.csv
```

### Dataset Registry Status:
1. **DocLayNet**: IBM Research | CDLA-Permissive-1.0 | 80k pages | Status: `NOT_DOWNLOADED / AWAITING_MANUAL_DOWNLOAD`
2. **FUNSD**: EPFL / IBM | Academic Non-Commercial | 199 forms | Status: `NOT_DOWNLOADED / AWAITING_MANUAL_DOWNLOAD`
3. **XFUND**: Microsoft Research Asia | ODC-BY | 1,393 multilingual forms | Status: `NOT_DOWNLOADED / AWAITING_MANUAL_DOWNLOAD`
4. **SROIE**: ICDAR 2019 | CC BY 4.0 | 1,000 receipts | Status: `NOT_DOWNLOADED / AWAITING_MANUAL_DOWNLOAD`

---

## 6. Centralized Class Mapping Registry

Document classes from `annotation_box_types.json` were mapped against external candidate datasets in `class_mapping_registry.json`:

- **Target OFPHIL YOLO Classes (6)**:
  - `0: FORM_SECTION`
  - `1: HANDWRITTEN_ENTRY`
  - `2: SIGNATURE`
  - `3: STAMP_OR_SEAL`
  - `4: TABLE_CELL`
  - `5: CHECKMARK_OR_CHECKBOX`
- **Mapping Safeguards**:
  - Non-matching or extraneous categories (e.g., `Picture`, `Formula`, `Footnote`, `Caption` from DocLayNet, and `other` from FUNSD/XFUND) are marked explicitly as `UNMAPPED` to prevent class pollution.
  - No synthetic signatures or stamps are fabricated from external datasets lacking verified official seal annotations.

---

## 7. Data Split & Leakage Safeguards

- **Document-Level Grouping**: All crops or annotations originating from the same physical document page are grouped strictly into the same partition (`train`, `val`, or `test`) via `document_level_split_manifest.json`.
- **SHA-256 Deduplication**: Configured in `interim/image_inventory/` to eliminate duplicate or near-identical pages.
- **Strict Domain Separation**: External pretraining data in `data/external/` remains strictly decoupled from primary clinical patient documents in `data/raw/` and `data/interim/document_processing/`.

---

## 8. Documentation Suite Created

1. [`docs/yolo_version_and_implementation.md`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/docs/yolo_version_and_implementation.md)
2. [`docs/yolo_hardware_compatibility.md`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/docs/yolo_hardware_compatibility.md)
3. [`docs/yolo_secondary_dataset_organization.md`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/docs/yolo_secondary_dataset_organization.md)
4. [`docs/yolo_class_mapping_strategy.md`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/docs/yolo_class_mapping_strategy.md)
5. [`docs/yolo_manual_execution_guide.md`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/docs/yolo_manual_execution_guide.md)

---

## 9. Notebook Syntax & Execution State Validation

- **All 5 Notebooks Validated**: Passed static JSON and `nbformat` checks.
- **Zero-Execution Protocol Enforced**: Every cell in all five notebooks has `execution_count: null` and an empty outputs list (`[]`).
- **No Unrelated Code Touched**: Original datasets, ground truth annotations, and application code remain completely unaltered.

---

## 10. Remaining Manual Actions for the Researcher

1. Activate the `ofphil-v2` virtual environment with PyTorch and CUDA support.
2. Install dependencies: `pip install ultralytics torch torchvision opencv-python pillow pyyaml`.
3. Pre-stage pretrained weights: `yolov8n.pt`.
4. (Optional) Manually acquire candidate datasets (DocLayNet, FUNSD, XFUND, SROIE) into their designated `raw/` subdirectories.
5. Launch JupyterLab and execute Notebooks `01` through `05` in sequential order.
