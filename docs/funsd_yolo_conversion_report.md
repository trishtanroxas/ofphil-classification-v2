# FUNSD YOLO Conversion & Processing Report

**Project**: `ofphil-classification-v2`  
**Pipeline Track**: Secondary Dataset YOLOv8n Conversion  
**Script**: `convert_funsd_to_yolo.py`

---

## 1. Coordinate Normalization Methodology

FUNSD stores bounding boxes as absolute pixel coordinates in `[x1, y1, x2, y2]` format. YOLO requires normalized bounding box coordinates in `[class_id, x_center, y_center, width, height]` format:

$$\text{width} = \frac{x_2 - x_1}{\text{image\_width}}, \quad \text{height} = \frac{y_2 - y_1}{\text{image\_height}}$$
$$x_{\text{center}} = \frac{x_1 + \frac{x_2 - x_1}{2}}{\text{image\_width}}, \quad y_{\text{center}} = \frac{y_1 + \frac{y_2 - y_1}{2}}{\text{image\_height}}$$

### Conversion Guardrails Enforced:
1. Coordinates are clamped to image pixel bounds before calculation.
2. Degenerate boxes ($x_2 \le x_1$ or $y_2 \le y_1$) are rejected.
3. Strict invariant checks: $0.0 \le x_c, y_c \le 1.0$ and $0.0 < w, h \le 1.0$.

---

## 2. Conversion Statistics

| Split | Raw Documents | Raw Entities | Converted Bounding Boxes (`FORM_SECTION: 0`) | Unmapped Entities | Invalid Boxes | Converted YOLO Labels |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Train** | 149 | 7,411 | 441 | 6,970 | 0 | 149 |
| **Test** | 50 | 2,332 | 122 | 2,210 | 0 | 50 |
| **Total** | **199** | **9,743** | **563** | **9,180** | **0** | **199** |

- **Empty Label Files**: 4 images (3 train, 1 test) contain no `header` entities. In accordance with standard object detection practices (Ultralytics YOLO guidelines), empty `.txt` files were created to serve as legitimate background negative samples, preventing false positive hallucination.
- **Output Storage**:
  - Images: `data/external/yolo_document_detection/processed/images/{train, test}/`
  - Labels: `data/external/yolo_document_detection/processed/labels/{train, test}/`
- **Benchmark Role**: Converted annotations provide an out-of-domain evaluation ground truth for testing the cross-domain generalization of `FORM_SECTION` detection on noisy scanned forms.
