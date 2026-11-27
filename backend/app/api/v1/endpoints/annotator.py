import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from app.core.paths import PROJECT_ROOT

router = APIRouter(prefix="/annotator", tags=["Annotator"])

DOC_DIR = PROJECT_ROOT / "data" / "raw" / "supporting document" / "supporting_docu"
CAPTURE_DIR = DOC_DIR / "capture"
DEFAULT_CSV = PROJECT_ROOT / "data" / "interim" / "document_processing" / "ground_truth_annotations" / "text_detection_annotations.csv"
DEFAULT_OCR_CSV = PROJECT_ROOT / "data" / "interim" / "document_processing" / "ground_truth_annotations" / "ocr_transcription_annotations.csv"
DEFAULT_VIS_DIR = PROJECT_ROOT / "data" / "interim" / "document_processing" / "bounding_box_visualizations"
LABELS_CONFIG = PROJECT_ROOT / "data" / "interim" / "document_processing" / "annotation_label_classes.json"
BOX_TYPES_CONFIG = PROJECT_ROOT / "data" / "interim" / "document_processing" / "annotation_box_types.json"

DEFAULT_VIS_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_CSV.parent.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png"}

DEFAULT_BOX_TYPES = [
    {"id": "CHECKMARK_OR_CHECKBOX", "label": "Checkmark / Checkbox"},
    {"id": "HANDWRITTEN_ENTRY", "label": "Handwritten Entry"},
    {"id": "FORM_SECTION", "label": "Printed Form Section"},
    {"id": "SIGNATURE", "label": "Signature"},
    {"id": "STAMP_OR_SEAL", "label": "Official Stamp / Seal"},
    {"id": "TABLE_CELL", "label": "Table Cell"},
]

DEFAULT_LABELS = [
    "msws_no", "clinic_no", "referred_by", "surname", "first_name", "middle_name",
    "sex", "marital_status", "address", "place_of_birth", "religion", "educational_attainment",
    "source_of_income", "occupation", "philhealth_membership",
    "housing_condition", "water_source", "total_family_income", "per_capita_income",
    "total_amount_billed", "diagnosis", "doctor_signature", "barangay_seal", "hospital_stamp",
    "prescription_date", "patient_name", "medication_name", "dosage_instructions", "doctor_name", "license_no", "ptr_no",
]


def _safe_resolve_under(base_dir: Path, raw_path: str) -> Path:
    """Resolve a relative or project-relative path safely within base_dir."""
    candidate = Path(raw_path)
    if not candidate.is_absolute():
        # Support both project-relative paths and paths relative to DOC_DIR
        if (PROJECT_ROOT / candidate).exists():
            candidate = PROJECT_ROOT / candidate
        else:
            candidate = base_dir / candidate
    resolved = candidate.resolve()
    base_resolved = base_dir.resolve()
    if resolved != base_resolved and base_resolved not in resolved.parents:
        raise HTTPException(status_code=403, detail="Access denied: path outside authorized directory.")
    return resolved


def _load_json_list(path: Path, default: List[Any]) -> List[Any]:
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, list) and data:
                return data
        except Exception:
            pass
    return default


def _save_json_list(path: Path, data: List[Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def _get_annotated_file_stats(target_csv: Optional[Path] = None) -> Dict[str, int]:
    csv_path = target_csv or DEFAULT_CSV
    stats: Dict[str, int] = {}
    if csv_path.exists():
        try:
            df = pd.read_csv(csv_path)
            col = "file_name" if "file_name" in df.columns else ("image_name" if "image_name" in df.columns else None)
            if col:
                for fname, cnt in df[col].value_counts().items():
                    stats[str(fname)] = int(cnt)
        except Exception:
            pass
    return stats


@router.get("/labels")
def get_labels():
    return {"labels": _load_json_list(LABELS_CONFIG, DEFAULT_LABELS)}


@router.post("/labels")
def save_labels(payload: Dict[str, Any]):
    labels = payload.get("labels", [])
    if not isinstance(labels, list):
        raise HTTPException(status_code=400, detail="'labels' must be a list.")
    _save_json_list(LABELS_CONFIG, labels)
    return {"status": "ok", "labels": labels}


@router.get("/box_types")
def get_box_types():
    return {"box_types": _load_json_list(BOX_TYPES_CONFIG, DEFAULT_BOX_TYPES)}


@router.post("/box_types")
def save_box_types(payload: Dict[str, Any]):
    box_types = payload.get("box_types", [])
    if not isinstance(box_types, list):
        raise HTTPException(status_code=400, detail="'box_types' must be a list.")
    _save_json_list(BOX_TYPES_CONFIG, box_types)
    return {"status": "ok", "box_types": box_types}


@router.get("/images")
def list_images(category: Optional[str] = Query(default=None)):
    scan_root = CAPTURE_DIR if CAPTURE_DIR.exists() else DOC_DIR
    stats = _get_annotated_file_stats()
    images: List[Dict[str, Any]] = []
    if scan_root.exists():
        for p in sorted(scan_root.rglob("*")):
            if p.is_file() and p.suffix.lower() in ALLOWED_IMAGE_EXTS:
                rel = p.relative_to(DOC_DIR) if DOC_DIR in p.parents else p.relative_to(scan_root)
                cat = rel.parts[1] if len(rel.parts) > 2 else (rel.parts[0] if len(rel.parts) > 1 else "general")
                if category and category.lower() != "all" and cat.lower() != category.lower():
                    continue
                fname = p.name
                box_count = stats.get(fname, 0)
                images.append({
                    "file_name": fname,
                    "relative_path": str(p.relative_to(PROJECT_ROOT)).replace("\\", "/"),
                    "category": cat,
                    "mode": rel.parts[0] if len(rel.parts) > 1 else "capture",
                    "is_annotated": box_count > 0,
                    "box_count": box_count,
                })
    return {"images": images, "total": len(images)}


@router.get("/image_file")
def get_image_file(path: str = Query(...)):
    resolved = _safe_resolve_under(DOC_DIR, path)
    if not resolved.exists() or not resolved.is_file() or resolved.suffix.lower() not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(status_code=404, detail="Image file not found.")
    return FileResponse(str(resolved))


@router.get("/boxes")
def get_boxes(file_name: str = Query(...)):
    boxes: List[Dict[str, Any]] = []
    if DEFAULT_CSV.exists():
        try:
            df = pd.read_csv(DEFAULT_CSV)
            col = "file_name" if "file_name" in df.columns else "image_name"
            if col in df.columns:
                sub = df[df[col].astype(str) == file_name]
                for _, row in sub.iterrows():
                    boxes.append({
                        "x": int(row.get("x_min", row.get("x", 0))),
                        "y": int(row.get("y_min", row.get("y", 0))),
                        "w": int(row.get("width", row.get("w", 0))),
                        "h": int(row.get("height", row.get("h", 0))),
                        "label": str(row.get("label", "field")),
                        "box_type": str(row.get("box_type", "FORM_SECTION")),
                        "text": str(row.get("ocr_text", "")) if pd.notna(row.get("ocr_text", "")) else "",
                    })
        except Exception:
            pass
    return {"file_name": file_name, "boxes": boxes}


@router.post("/boxes")
def save_boxes(payload: Dict[str, Any]):
    file_name = str(payload.get("file_name") or "").strip()
    rel_path = str(payload.get("relative_path") or "").strip()
    boxes = payload.get("boxes", [])
    if not file_name:
        raise HTTPException(status_code=400, detail="Missing 'file_name'.")

    # 1. Update detection CSV (UTF-8 with BOM for Excel compatibility)
    existing_rows: List[Dict[str, Any]] = []
    if DEFAULT_CSV.exists():
        try:
            df_old = pd.read_csv(DEFAULT_CSV)
            col = "file_name" if "file_name" in df_old.columns else "image_name"
            if col in df_old.columns:
                df_old = df_old[df_old[col].astype(str) != file_name]
            existing_rows = df_old.to_dict(orient="records")
        except Exception:
            existing_rows = []

    now_iso = datetime.utcnow().isoformat()
    new_det_rows = []
    new_ocr_rows = []
    for idx, b in enumerate(boxes):
        x, y, w, h = int(b.get("x", 0)), int(b.get("y", 0)), int(b.get("w", 0)), int(b.get("h", 0))
        lbl = str(b.get("label", "field"))
        btype = str(b.get("box_type", "FORM_SECTION"))
        txt = str(b.get("text", ""))
        new_det_rows.append({
            "file_name": file_name,
            "box_id": f"{file_name}_{idx}",
            "label": lbl,
            "box_type": btype,
            "x_min": x,
            "y_min": y,
            "width": w,
            "height": h,
            "ocr_text": txt,
            "updated_at": now_iso,
        })
        if txt:
            new_ocr_rows.append({
                "file_name": file_name,
                "box_id": f"{file_name}_{idx}",
                "label": lbl,
                "ocr_text": txt,
                "updated_at": now_iso,
            })

    DEFAULT_CSV.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(existing_rows + new_det_rows).to_csv(DEFAULT_CSV, index=False, encoding="utf-8-sig")

    # 2. Update OCR CSV (UTF-8 with BOM)
    existing_ocr: List[Dict[str, Any]] = []
    if DEFAULT_OCR_CSV.exists():
        try:
            df_ocr = pd.read_csv(DEFAULT_OCR_CSV)
            if "file_name" in df_ocr.columns:
                df_ocr = df_ocr[df_ocr["file_name"].astype(str) != file_name]
            existing_ocr = df_ocr.to_dict(orient="records")
        except Exception:
            existing_ocr = []
    pd.DataFrame(existing_ocr + new_ocr_rows).to_csv(DEFAULT_OCR_CSV, index=False, encoding="utf-8-sig")

    # 3. Generate visualization image if path provided
    vis_saved = False
    if rel_path:
        try:
            img_path = _safe_resolve_under(DOC_DIR, rel_path)
            img = cv2.imread(str(img_path))
            if img is not None:
                for b in boxes:
                    x, y, w, h = int(b.get("x", 0)), int(b.get("y", 0)), int(b.get("w", 0)), int(b.get("h", 0))
                    cv2.rectangle(img, (x, y), (x + w, y + h), (0, 180, 0), 2)
                    cv2.putText(img, str(b.get("label", "")), (x, max(15, y - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 180, 0), 1)
                DEFAULT_VIS_DIR.mkdir(parents=True, exist_ok=True)
                cv2.imwrite(str(DEFAULT_VIS_DIR / f"vis_{file_name}"), img)
                vis_saved = True
        except Exception:
            vis_saved = False

    return {"status": "ok", "saved_boxes": len(new_det_rows), "visualization_saved": vis_saved}


@router.post("/ai_detect_boxes")
def ai_detect_boxes(payload: Dict[str, Any]):
    rel_path = str(payload.get("relative_path") or "").strip()
    if not rel_path:
        raise HTTPException(status_code=400, detail="Missing 'relative_path'.")
    img_path = _safe_resolve_under(DOC_DIR, rel_path)
    img = cv2.imread(str(img_path))
    if img is None:
        raise HTTPException(status_code=404, detail="Unable to load image.")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 8)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 3))
    dilated = cv2.dilate(thresh, kernel, iterations=2)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    detected = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w > 30 and h > 12:
            detected.append({"x": int(x), "y": int(y), "w": int(w), "h": int(h), "label": "field", "box_type": "FORM_SECTION", "text": ""})
    return {"boxes": detected[:100]}
