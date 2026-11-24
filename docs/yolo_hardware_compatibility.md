# YOLO Hardware Compatibility & Resource Allocation Report

**Project**: `ofphil-classification-v2`  
**Host Target Specifications**:
- **GPU**: NVIDIA GeForce RTX 3050 Laptop / Desktop (4GB dedicated GDDR6 VRAM)
- **Host RAM**: 32GB DDR4/DDR5
- **OS**: Windows 11 64-bit
- **Python**: 3.12.10 (Execution Environment: `ofphil-v2`)
- **Detection Architecture**: Ultralytics YOLOv8n (3.2M parameters)

---

## 1. Memory Budgeting & Feasibility Assessment

Ultralytics YOLOv8n is an ultra-lightweight convolutional neural network designed specifically for edge devices and resource-constrained environments:

| Model Architecture | Parameter Count | Float32 Weight Size | FP16 Weight Size | GFLOPs (@640x640) | RTX 3050 4GB Compatibility |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **YOLOv8n (Nano)** | **3.2M** | **~12.5 MB** | **~6.2 MB** | **8.7** | **OPTIMAL**: Fits easily in VRAM with zero CPU offloading required. |
| YOLOv8s (Small) | 11.2M | ~45.0 MB | ~22.5 MB | 28.6 | Feasible (batch size reduction required). |
| YOLOv8m (Medium) | 25.9M | ~103 MB | ~52.0 MB | 78.9 | Risk of out-of-memory during backprop on 4GB VRAM. |

---

## 2. Conservative Hardware Recommendations (RTX 3050 4GB)

### A. Training Recommendations
- **Input Image Resolution (`imgsz`)**: `640` (standard). Document layout features (table lines, header blocks, seals) are well-resolved at $640 \times 640$. For dense fine text, $1024$ may be tested, but batch size must be reduced.
- **Batch Size (`batch`)**: 
  - `imgsz=640`: Recommended `batch=16` (estimated VRAM consumption: **1.8 GB – 2.4 GB**).
  - `imgsz=1024`: Recommended `batch=4` or `batch=8` (estimated VRAM consumption: **2.8 GB – 3.4 GB**).
- **Mixed Precision (`amp=True`)**: Enabled by default in Ultralytics for CUDA devices. Reduces activation memory by ~40% and speeds up convolution tensor cores.
- **Dataloader Workers (`workers`)**: `workers=4` to prevent Windows CPU threading deadlocks.
- **Early Stopping**: Set `patience=15` to avoid overfitting on small datasets.

### B. Inference Recommendations
- **Batch Size**: `batch=1` (single document page at a time).
- **Inference VRAM Footprint**: Under **0.8 GB** total VRAM (weights + CUDA scratchpad buffers).
- **CPU Fallback**: In the event of GPU unavailability, YOLOv8n executes on modern x86_64 CPUs with latency well under 100ms per image.
- **Operating System Overhead**: On Windows 11, Desktop Window Manager occupies 0.3–0.6 GB VRAM. With a 2.2 GB training footprint, total VRAM consumption remains comfortably within the 4.0 GB physical hardware limit.

---

## 3. Estimated vs Measured Metrics Protocol

- **Estimated**: All VRAM allocations listed above are theoretical estimates based on CUDA buffer modeling and batch size scaling.
- **Measured**: Live VRAM peaks and per-batch training throughput must be recorded empirically via `nvidia-smi` during manual execution in Notebook `03_yolo_model_training.ipynb`.
