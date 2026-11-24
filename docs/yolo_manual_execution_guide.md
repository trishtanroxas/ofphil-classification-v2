# YOLO Manual Execution & Training Guide

**Project**: `ofphil-classification-v2`  
**Architecture**: Ultralytics YOLOv8n (YOLOv8 Nano)  
**Execution Environment**: Windows 11 / JupyterLab (`ofphil-v2`)  
**Hardware Target**: NVIDIA GeForce RTX 3050 (4GB VRAM) / 32GB RAM

---

## 1. Prerequisites & Environment Setup

### A. Python Environment Verification
Verify that the `ofphil-v2` Python environment is active and required packages are installed:
```powershell
# Open PowerShell in project root
cd "c:\Users\ASUS TUF\Desktop\Project in Program\Thesis Project\ofphil-classification-v2"

# Install required deep learning packages if not present
pip install ultralytics torch torchvision opencv-python pillow pyyaml
```

### B. CUDA Device Verification
Ensure PyTorch detects the NVIDIA GeForce RTX 3050 GPU:
```powershell
python -c "import torch; print('CUDA Available:', torch.cuda.is_available(), '| Device:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None')"
```

### C. Pretrained Weight Acquisition
Ultralytics automatically downloads `yolov8n.pt` from GitHub releases upon first instantiation. To manually pre-stage the weights:
```powershell
python -c "from ultralytics import YOLO; model = YOLO('yolov8n.pt'); print('YOLOv8n successfully initialized and cached.')"
```

---

## 2. Notebook Execution Sequence

Open JupyterLab and navigate to:  
`experiments/notebooks/04_document_processing_and_ocr/03_yolo_document_detection/`

Execute the five notebooks strictly in numerical order:

### Step 1: `01_yolo_document_dataset_preparation.ipynb`
- Generates normalized bounding box labels in YOLO format (`labels/train`, `labels/val`, `labels/test`).
- Writes the dataset descriptor `data.yaml`.

### Step 2: `02_yolo_annotation_and_label_validation.ipynb`
- Scans all generated labels.
- Validates bounding box boundary invariants ($0 \le x_c, y_c, w, h \le 1$).
- Confirms zero data leakage across document-level splits.

### Step 3: `03_yolo_model_training.ipynb`
- Reviews the training configuration in `training_hyperparameters.yaml`.
- Executes `execute_yolo_training(training_config)` to fine-tune `yolov8n.pt` on the OFPHIL dataset.
- Produces `best.pt` and `last.pt` checkpoints under `models/document_processing/yolo/ofphil_yolo_detector/weights/`.

### Step 4: `04_yolo_model_evaluation.ipynb`
- Evaluates the trained `best.pt` checkpoint on the held-out test split.
- Generates precision, recall, $mAP@0.5$, and $mAP@0.5:0.95$ metrics.
- Serializes `yolo_test_evaluation_report.json`.

### Step 5: `05_yolo_inference_and_region_extraction.ipynb`
- Executes batch region extraction on document samples.
- Extracts cropped ROIs (headers, demographic sections, signatures) with a 5px margin.
- Saves cropped images to `data/interim/document_processing/extracted_roi_crops/` and emits `extracted_roi_manifest.csv` for downstream OCR.
