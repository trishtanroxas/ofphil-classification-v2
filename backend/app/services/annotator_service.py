"""Service layer for the OFPHIL Document Annotator V2.

Ports the Flask annotator_app.py business logic into FastAPI V2 while
preserving exact CSV schemas, ground-truth transcriptions, backups,
and visualization directory structure.
"""

import json
import shutil
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import pandas as pd
from fastapi import HTTPException

from app.core.paths import PROJECT_ROOT

DOC_DIR = PROJECT_ROOT / "data" / "raw" / "supporting document" / "supporting_docu"
CAPTURE_DIR = DOC_DIR / "capture"
GROUND_TRUTH_DIR = PROJECT_ROOT / "data" / "interim" / "document_processing" / "ground_truth_annotations"
DEFAULT_CSV = GROUND_TRUTH_DIR / "text_detection_annotations.csv"
DEFAULT_OCR_CSV = GROUND_TRUTH_DIR / "ocr_transcription_annotations.csv"
DEFAULT_VIS_DIR = PROJECT_ROOT / "data" / "interim" / "document_processing" / "bounding_box_visualizations"
BACKUP_DIR = GROUND_TRUTH_DIR / "backups"
LABELS_CONFIG = PROJECT_ROOT / "data" / "interim" / "document_processing" / "annotation_label_classes.json"
BOX_TYPES_CONFIG = PROJECT_ROOT / "data" / "interim" / "document_processing" / "annotation_box_types.json"

ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png"}

VALID_BOX_TYPES = {
    "FORM_SECTION",
    "HANDWRITTEN_ENTRY",
    "CHECKMARK_OR_CHECKBOX",
    "SIGNATURE",
    "STAMP_OR_SEAL",
    "TABLE_CELL",
}

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
    "prescription_date", "patient_name", "medication_name", "dosage_instructions",
    "doctor_name", "license_no", "ptr_no",
]

PALETTE_BGR = [
    (255, 229, 0),   # Cyan
    (11, 158, 245),  # Amber
    (129, 185, 16),  # Emerald
    (153, 72, 236),  # Pink
    (246, 92, 139),  # Violet
    (212, 182, 6),   # Teal
    (72, 29, 225),   # Rose
    (22, 204, 132),  # Lime
    (246, 130, 59),  # Blue
]


def safe_resolve_under(base_dir: Path, raw_path: str) -> Path:
    """Resolve a relative or project-relative path safely within base_dir."""
    candidate = Path(raw_path)
    if not candidate.is_absolute():
        if (PROJECT_ROOT / candidate).exists():
            candidate = PROJECT_ROOT / candidate
        else:
            candidate = base_dir / candidate
    resolved = candidate.resolve()
    base_resolved = base_dir.resolve()
    if resolved != base_resolved and base_resolved not in resolved.parents:
        raise HTTPException(status_code=403, detail="Access denied: path outside authorized directory.")
    return resolved


def load_json_list(path: Path, default: List[Any]) -> List[Any]:
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, list) and data:
                return data
        except Exception:
            pass
    return default


def save_json_list(path: Path, data: List[Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def get_image_dimensions(img_path: Path) -> Tuple[int, int]:
    try:
        from PIL import Image
        with Image.open(img_path) as img:
            return int(img.width), int(img.height)
    except Exception:
        pass
    try:
        im = cv2.imread(str(img_path))
        if im is not None:
            return int(im.shape[1]), int(im.shape[0])
    except Exception:
        pass
    return 0, 0


def _infer_doc_category(rel_path: str) -> str:
    low = rel_path.lower()
    for cat in (
        "case_study", "clinical_abstract", "expense_receipt", "hospital_bill",
        "medical_certificate", "prescription", "treatment_plan",
        "certificate_of_indigency", "electricity_bill", "government_id", "water_bill",
    ):
        if cat in low:
            return cat
    return "assessment"


def _infer_box_type(raw_type: str, label_name: str, trans_text: str) -> str:
    rt = raw_type.strip()
    if rt and rt in VALID_BOX_TYPES:
        return rt
    b_lbl = label_name.strip().lower()
    b_trans = trans_text.strip().lower()
    if b_lbl.startswith("family_member"):
        return "TABLE_CELL"
    if "[signature]" in b_trans or ("sign" in b_lbl and "name" not in b_lbl and "title" not in b_lbl):
        return "SIGNATURE"
    if "[seal]" in b_trans or "[stamp]" in b_trans or "seal" in b_lbl or "stamp" in b_lbl:
        return "STAMP_OR_SEAL"
    if "[✓]" in trans_text or "[ ]" in trans_text or trans_text.strip() == "✓" or "check" in b_lbl:
        return "CHECKMARK_OR_CHECKBOX"
    return "FORM_SECTION"


def _create_backup(csv_path: Path) -> Optional[Path]:
    """Create a timestamped backup of an existing CSV before modifying it."""
    if not csv_path.exists() or csv_path.stat().st_size == 0:
        return None
    try:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = BACKUP_DIR / f"{csv_path.stem}_{ts}{csv_path.suffix}"
        shutil.copy2(csv_path, backup_path)
        return backup_path
    except Exception:
        return None


def get_annotated_file_stats(target_csv: Optional[Path] = None) -> Dict[str, int]:
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


def list_images(category: Optional[str] = None) -> Dict[str, Any]:
    scan_root = DOC_DIR
    stats = get_annotated_file_stats()
    images: List[Dict[str, Any]] = []
    if scan_root.exists():
        for p in sorted(scan_root.rglob("*")):
            if p.is_file() and p.suffix.lower() in ALLOWED_IMAGE_EXTS:
                rel = p.relative_to(DOC_DIR) if DOC_DIR in p.parents else p.relative_to(scan_root)
                if len(rel.parts) > 2:
                    cat = f"{rel.parts[0]}/{rel.parts[1]}"
                elif len(rel.parts) > 1:
                    cat = rel.parts[0]
                else:
                    cat = "general"
                if category and category.lower() != "all" and cat.lower() != category.lower():
                    continue
                fname = p.name
                box_count = stats.get(fname, 0)
                images.append({
                    "file_name": fname,
                    "relative_path": str(p.relative_to(PROJECT_ROOT)).replace("\\", "/"),
                    "category": cat,
                    "mode": rel.parts[0] if len(rel.parts) > 1 else "authentic",
                    "is_annotated": box_count > 0,
                    "box_count": box_count,
                })
    return {"images": images, "total": len(images)}


def get_boxes(file_name: str, csv_path: Optional[Path] = None, ocr_csv_path: Optional[Path] = None) -> Dict[str, Any]:
    target_csv = csv_path or DEFAULT_CSV
    target_ocr_csv = ocr_csv_path or DEFAULT_OCR_CSV
    raw_boxes: List[Dict[str, Any]] = []

    if target_csv.exists():
        try:
            df = pd.read_csv(target_csv).fillna("")
            col = "file_name" if "file_name" in df.columns else ("image_name" if "image_name" in df.columns else None)
            if col:
                sub = df[df[col].astype(str) == file_name]
                raw_boxes = sub.to_dict(orient="records")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to parse detection CSV: {exc}")

    # Merge existing transcriptions from OCR CSV
    if target_ocr_csv.exists() and raw_boxes:
        try:
            ocr_df = pd.read_csv(target_ocr_csv).fillna("")
            if "file_name" in ocr_df.columns:
                file_ocr = ocr_df[ocr_df["file_name"].astype(str) == file_name]
                ocr_map: Dict[Any, str] = {}
                notes_map: Dict[Any, str] = {}
                for _, row in file_ocr.iterrows():
                    bid = row.get("box_id", "")
                    text = str(row.get("ground_truth_transcription") or row.get("ocr_predicted_text") or "")
                    if text == "nan":
                        text = ""
                    note = str(row.get("transcription_quality_notes") or "")
                    if note == "nan":
                        note = ""
                    if bid != "" and str(bid) != "nan":
                        try:
                            clean_bid = int(float(bid))
                            for k in (clean_bid, str(clean_bid), f"{clean_bid}.0"):
                                ocr_map[k] = text
                                notes_map[k] = note
                        except Exception:
                            ocr_map[str(bid)] = text
                            notes_map[str(bid)] = note
                    ann_id = str(row.get("transcription_id") or row.get("annotation_id") or "")
                    if ann_id and ann_id != "nan":
                        ocr_map[ann_id] = text
                        notes_map[ann_id] = note

                for idx, b in enumerate(raw_boxes, start=1):
                    raw_bid = b.get("box_id", idx)
                    ann_id = str(b.get("annotation_id", ""))
                    try:
                        clean_bid = int(float(raw_bid))
                    except Exception:
                        clean_bid = idx
                    for k in (clean_bid, str(clean_bid), f"{clean_bid}.0", str(raw_bid), ann_id):
                        if k in ocr_map:
                            b["transcription_text"] = ocr_map[k]
                            b["transcription_quality_notes"] = notes_map.get(k, "")
                            break
        except Exception:
            pass

    # Normalize to V2 frontend format while preserving Flask fields
    boxes: List[Dict[str, Any]] = []
    for b in raw_boxes:
        x = int(float(b.get("bbox_x", b.get("x_min", b.get("x", 0))) or 0))
        y = int(float(b.get("bbox_y", b.get("y_min", b.get("y", 0))) or 0))
        w = int(float(b.get("bbox_width", b.get("width", b.get("w", 0))) or 0))
        h = int(float(b.get("bbox_height", b.get("height", b.get("h", 0))) or 0))
        lbl = str(b.get("label_name", b.get("label", "unlabeled")) or "unlabeled")
        btype = str(b.get("box_type", "FORM_SECTION") or "FORM_SECTION")
        txt = str(b.get("transcription_text", b.get("ocr_text", "")) or "")
        notes = str(b.get("transcription_quality_notes", "") or "")
        boxes.append({
            "x": x,
            "y": y,
            "w": w,
            "h": h,
            "label": lbl,
            "box_type": btype,
            "text": txt,
            "notes": notes,
            "annotation_id": str(b.get("annotation_id", "")),
            "box_id": b.get("box_id", ""),
            "image_width": int(float(b.get("image_width", 0) or 0)),
            "image_height": int(float(b.get("image_height", 0) or 0)),
        })

    return {"file_name": file_name, "boxes": boxes}


def _render_visualization(img_path: Path, rel_path: str, file_name: str, boxes: List[Dict[str, Any]], vis_dir: Path) -> Optional[Path]:
    if not img_path.exists() or not boxes:
        return None
    img = cv2.imread(str(img_path))
    if img is None:
        return None

    for b in boxes:
        x = int(b.get("x", b.get("bbox_x", 0)))
        y = int(b.get("y", b.get("bbox_y", 0)))
        bw = int(b.get("w", b.get("bbox_width", 0)))
        bh = int(b.get("h", b.get("bbox_height", 0)))
        lbl = str(b.get("label", b.get("label_name", "")))
        ch = abs(sum(ord(c) for c in lbl)) % len(PALETTE_BGR)
        color = PALETTE_BGR[ch]
        cv2.rectangle(img, (x, y), (x + bw, y + bh), color, 3)

        font_scale = 0.55
        thickness = 1
        (tw, th), baseline = cv2.getTextSize(lbl, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
        badge_h = th + baseline + 8
        badge_w = tw + 10
        badge_y1 = max(0, y - badge_h)
        badge_y2 = y
        cv2.rectangle(img, (x, badge_y1), (x + badge_w, badge_y2), color, -1)
        cv2.putText(img, lbl, (x + 5, badge_y2 - baseline - 2), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), thickness, cv2.LINE_AA)

    doc_category = _infer_doc_category(rel_path)
    try:
        p_parts = list(Path(rel_path).parts)
        if "supporting_docu" in p_parts:
            idx = p_parts.index("supporting_docu")
            sub_parts = p_parts[idx + 1:-1]
        else:
            sub_parts = [p_parts[-3], p_parts[-2]] if len(p_parts) >= 3 else [doc_category]
        out_dir = vis_dir / (Path(*sub_parts) if sub_parts else Path(doc_category))
    except Exception:
        out_dir = vis_dir

    out_dir.mkdir(parents=True, exist_ok=True)
    vis_out = out_dir / f"{Path(file_name).stem}_annotated.jpg"
    cv2.imwrite(str(vis_out), img)
    return vis_out


def save_boxes(
    file_name: str,
    rel_path: str,
    boxes: List[Dict[str, Any]],
    export_csv: bool = True,
    export_ocr: bool = True,
    export_img: bool = True,
    csv_path: Optional[Path] = None,
    ocr_csv_path: Optional[Path] = None,
    vis_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    target_csv = csv_path or DEFAULT_CSV
    target_ocr_csv = ocr_csv_path or DEFAULT_OCR_CSV
    target_vis_dir = vis_dir or DEFAULT_VIS_DIR

    doc_category = _infer_doc_category(rel_path)
    stem = Path(file_name).stem

    img_w, img_h = 0, 0
    resolved_img: Optional[Path] = None
    if rel_path:
        try:
            resolved_img = safe_resolve_under(DOC_DIR, rel_path)
            img_w, img_h = get_image_dimensions(resolved_img)
        except HTTPException:
            resolved_img = None

    warnings: List[str] = []

    # 1. SAVE DETECTION CSV
    if export_csv:
        target_csv.parent.mkdir(parents=True, exist_ok=True)
        _create_backup(target_csv)
        if target_csv.exists() and target_csv.stat().st_size > 0:
            try:
                df = pd.read_csv(target_csv)
                if "file_name" in df.columns:
                    df = df[df["file_name"].astype(str) != file_name]
                elif "image_name" in df.columns:
                    df = df[df["image_name"].astype(str) != file_name]
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f"Failed to read existing detection CSV: {exc}")
        else:
            df = pd.DataFrame()

        if boxes:
            formatted_records = []
            for idx, b in enumerate(boxes, start=1):
                lbl = str(b.get("label", b.get("label_name", "unlabeled")) or "unlabeled")
                trans = str(b.get("text", b.get("transcription_text", "")) or "")
                raw_type = str(b.get("box_type", "") or "")
                b_type = _infer_box_type(raw_type, lbl, trans)
                bw_val = int(b.get("image_width") or img_w or 0)
                bh_val = int(b.get("image_height") or img_h or 0)
                formatted_records.append({
                    "annotation_id": f"DET_{stem}_{idx:02d}",
                    "file_name": file_name,
                    "relative_path": rel_path,
                    "document_category": doc_category,
                    "box_id": idx,
                    "bbox_x": int(b.get("x", b.get("bbox_x", 0))),
                    "bbox_y": int(b.get("y", b.get("bbox_y", 0))),
                    "bbox_width": int(b.get("w", b.get("bbox_width", 0))),
                    "bbox_height": int(b.get("h", b.get("bbox_height", 0))),
                    "box_type": b_type,
                    "confidence_score": "",
                    "annotation_status": "VERIFIED",
                    "label_name": lbl,
                    "image_name": file_name,
                    "image_width": bw_val,
                    "image_height": bh_val,
                })
            df = pd.concat([df, pd.DataFrame(formatted_records)], ignore_index=True)

        try:
            df.to_csv(target_csv, index=False)
        except PermissionError:
            fallback_csv = target_csv.parent / f"{target_csv.stem}_saved_{int(time.time())}.csv"
            df.to_csv(fallback_csv, index=False)
            return {
                "status": "warning",
                "message": f"Detection CSV is locked by Excel! Saved to backup: {fallback_csv.name}. Please close Excel.",
                "saved_path": str(fallback_csv),
                "saved_boxes": len(boxes),
                "visualization_saved": False,
            }
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Detection CSV Save Error: {exc}")

    # 2. SAVE OCR TRANSCRIPTION CSV
    if export_ocr:
        target_ocr_csv.parent.mkdir(parents=True, exist_ok=True)
        _create_backup(target_ocr_csv)
        if target_ocr_csv.exists() and target_ocr_csv.stat().st_size > 0:
            try:
                ocr_df = pd.read_csv(target_ocr_csv)
                if "file_name" in ocr_df.columns:
                    ocr_df = ocr_df[ocr_df["file_name"].astype(str) != file_name]
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f"Failed to read existing OCR CSV: {exc}")
        else:
            ocr_df = pd.DataFrame()

        if boxes:
            ocr_records = []
            for idx, b in enumerate(boxes, start=1):
                lbl = str(b.get("label", b.get("label_name", "unlabeled")) or "unlabeled")
                trans_text = str(b.get("text", b.get("transcription_text", "")) or "").strip()
                raw_type = str(b.get("box_type", "") or "")
                b_type = _infer_box_type(raw_type, lbl, trans_text)
                modality = "handwritten" if b_type in ("HANDWRITTEN_ENTRY", "SIGNATURE") else "printed"
                q_note = str(b.get("notes", b.get("transcription_quality_notes", "")) or "").strip()
                if not q_note:
                    q_note = "Manual human ground truth"

                ocr_records.append({
                    "transcription_id": f"TRN_{stem}_{idx:02d}",
                    "file_name": file_name,
                    "relative_path": rel_path,
                    "document_category": doc_category,
                    "text_modality": modality,
                    "ocr_predicted_text": "",
                    "ground_truth_transcription": trans_text,
                    "character_error_rate_cer": "",
                    "word_error_rate_wer": "",
                    "is_fully_transcribed": (trans_text != ""),
                    "transcription_quality_notes": q_note,
                    "box_id": idx,
                    "label_name": lbl,
                    "box_type": b_type,
                    "ocr_model_confidence": "",
                    "is_ground_truth_verified": True,
                    "annotation_status": "completed" if trans_text else "pending",
                    "transcription_confidence": "",
                })
            ocr_df = pd.concat([ocr_df, pd.DataFrame(ocr_records)], ignore_index=True)

        try:
            ocr_df.to_csv(target_ocr_csv, index=False)
        except PermissionError:
            fallback_ocr = target_ocr_csv.parent / f"{target_ocr_csv.stem}_saved_{int(time.time())}.csv"
            ocr_df.to_csv(fallback_ocr, index=False)
            return {
                "status": "warning",
                "message": f"OCR CSV is locked by Excel! Saved to backup: {fallback_ocr.name}. Please close Excel.",
                "saved_path": str(fallback_ocr),
                "saved_boxes": len(boxes),
                "visualization_saved": False,
            }
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"OCR CSV Save Error: {exc}")

    # 3. RENDER VISUALIZATION JPG
    vis_saved = False
    vis_path_str = ""
    if export_img and resolved_img is not None and boxes:
        try:
            vis_out = _render_visualization(resolved_img, rel_path, file_name, boxes, target_vis_dir)
            if vis_out is not None:
                vis_saved = True
                vis_path_str = str(vis_out)
        except Exception as exc:
            warnings.append(f"Visualization render failed: {exc}")

    return {
        "status": "ok",
        "saved_boxes": len(boxes),
        "saved_count": len(boxes),
        "visualization_saved": vis_saved,
        "visualization_path": vis_path_str,
        "warnings": warnings,
    }


def ai_detect_boxes(rel_path: str, active_label: str = "auto_detected") -> Dict[str, Any]:
    """Dual-kernel OpenCV adaptive thresholding & morphological detection."""
    img_path = safe_resolve_under(DOC_DIR, rel_path)
    img = cv2.imread(str(img_path))
    if img is None:
        raise HTTPException(status_code=404, detail="Unable to load image.")

    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    adapt_gauss = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 6)
    adapt_mean = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 25, 10)
    thresh = cv2.bitwise_or(adapt_gauss, adapt_mean)

    k_print = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 3))
    morph_print = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, k_print)

    k_hand = cv2.getStructuringElement(cv2.MORPH_RECT, (8, 4))
    morph_hand = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, k_hand)

    combined_morph = cv2.bitwise_or(morph_print, morph_hand)
    contours, _ = cv2.findContours(combined_morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    ai_boxes: List[Dict[str, Any]] = []
    for cnt in contours:
        x, y, bw, bh = cv2.boundingRect(cnt)
        if bw > 30 and 10 < bh < 140 and bw < (w * 0.95):
            ai_boxes.append({
                "x": int(x),
                "y": int(y),
                "w": int(bw),
                "h": int(bh),
                "label": active_label,
                "box_type": "FORM_SECTION",
                "text": "",
                "notes": "",
                "image_width": int(w),
                "image_height": int(h),
            })

    ai_boxes.sort(key=lambda b: (b["y"] // 25, b["x"]))
    return {"status": "ok", "boxes": ai_boxes[:45]}


# Global lazy-loaded OCR reader for fast crop text extraction
_OCR_READER = None


def get_ocr_reader():
    global _OCR_READER
    if _OCR_READER is None:
        try:
            import easyocr
            _OCR_READER = easyocr.Reader(["en"], gpu=False, verbose=False)
        except Exception as exc:
            logger.warning(f"EasyOCR reader init failed: {exc}")
            _OCR_READER = False
    return _OCR_READER if _OCR_READER is not False else None


def ocr_extract_box(rel_path: str, x: int, y: int, w: int, h: int) -> Dict[str, Any]:
    """Crops the specified ROI from the image and runs OCR to extract text in real time."""
    img_path = safe_resolve_under(DOC_DIR, rel_path)
    img = cv2.imread(str(img_path))
    if img is None:
        raise HTTPException(status_code=404, detail="Unable to load image for OCR extraction.")

    img_h, img_w = img.shape[:2]
    # Bound crop coordinates with small 2px padding for better boundary recognition
    pad = 2
    x1 = max(0, int(x) - pad)
    y1 = max(0, int(y) - pad)
    x2 = min(img_w, int(x + w) + pad)
    y2 = min(img_h, int(y + h) + pad)

    if x2 <= x1 or y2 <= y1 or (x2 - x1) < 4 or (y2 - y1) < 4:
        return {"status": "ok", "text": "", "confidence": 0.0}

    crop = img[y1:y2, x1:x2]

    # Preprocess crop: slight upscale if small for better character clarity
    crop_h, crop_w = crop.shape[:2]
    if crop_h < 32:
        scale = 32.0 / crop_h
        crop = cv2.resize(crop, (int(crop_w * scale), 32), interpolation=cv2.INTER_CUBIC)

    reader = get_ocr_reader()
    if reader is None:
        return {"status": "warning", "text": "", "confidence": 0.0, "message": "OCR reader unavailable."}

    try:
        results = reader.readtext(crop)
        texts = []
        confs = []
        for item in results:
            # item format: (bbox, text, prob)
            t = str(item[1]).strip()
            if t:
                texts.append(t)
                confs.append(float(item[2]))
        combined_text = " ".join(texts)
        avg_conf = float(sum(confs) / len(confs)) if confs else 0.0
        return {
            "status": "ok",
            "text": combined_text,
            "confidence": round(avg_conf, 4),
            "line_count": len(texts),
        }
    except Exception as exc:
        logger.warning(f"OCR crop extraction failed: {exc}")
        return {"status": "error", "text": "", "confidence": 0.0, "message": str(exc)}


def find_counterpart_file(file_path: Path, target_mode: Optional[str] = None) -> Optional[Path]:
    parts = list(file_path.parts)
    stem = file_path.stem

    if "physical_capture" in parts:
        source_mode = "physical_capture"
        target_mode = target_mode or "scan_capture"
        mode_idx = parts.index("physical_capture")
    elif "scan_capture" in parts:
        source_mode = "scan_capture"
        target_mode = target_mode or "physical_capture"
        mode_idx = parts.index("scan_capture")
    else:
        return None

    candidate_stems: List[str] = []
    if source_mode == "physical_capture":
        if "_p_" in stem:
            candidate_stems.append(stem.replace("_p_", "_s_"))
        if stem.endswith("_p"):
            candidate_stems.append(stem[:-2] + "_s")
    else:
        if "_s_" in stem:
            candidate_stems.append(stem.replace("_s_", "_p_"))
        if stem.endswith("_s"):
            candidate_stems.append(stem[:-2] + "_p")

    if stem not in candidate_stems:
        candidate_stems.append(stem)

    parts[mode_idx] = target_mode
    target_dir = DOC_DIR / Path(*parts[mode_idx:-1])
    if not target_dir.exists():
        return None

    for c_stem in candidate_stems:
        for ext in [".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"]:
            cand = target_dir / f"{c_stem}{ext}"
            if cand.is_file():
                return cand
        matches = list(target_dir.glob(f"{c_stem}.*"))
        if matches and matches[0].is_file():
            return matches[0]

    return None


def get_counterpart_info(rel_path: str) -> Dict[str, Any]:
    if not rel_path:
        return {"has_counterpart": False}
    src_path = safe_resolve_under(DOC_DIR, rel_path)
    parts = list(src_path.parts)
    direction = "scan" if "physical_capture" in parts else ("physical" if "scan_capture" in parts else None)
    if not direction:
        return {"has_counterpart": False}

    cp_path = find_counterpart_file(src_path)
    if not cp_path or not cp_path.is_file():
        return {"has_counterpart": False}

    cp_rel = str(cp_path.relative_to(PROJECT_ROOT)).replace("\\", "/")
    sw, sh = get_image_dimensions(src_path)
    tw, th = get_image_dimensions(cp_path)
    return {
        "has_counterpart": True,
        "direction": direction,
        "counterpart_name": cp_path.name,
        "counterpart_rel_path": cp_rel,
        "source_dimensions": {"width": sw, "height": sh},
        "target_dimensions": {"width": tw, "height": th},
    }


def copy_counterpart_boxes(
    source_boxes: List[Dict[str, Any]],
    source_width: float,
    source_height: float,
    target_width: float,
    target_height: float,
) -> Dict[str, Any]:
    sw = float(source_width or 1)
    sh = float(source_height or 1)
    tw = float(target_width or 1)
    th = float(target_height or 1)
    scale_x = tw / sw
    scale_y = th / sh

    scaled_boxes: List[Dict[str, Any]] = []
    for b in source_boxes:
        nb = dict(b)
        bx = int(b.get("x", b.get("bbox_x", 0)))
        by = int(b.get("y", b.get("bbox_y", 0)))
        bw = int(b.get("w", b.get("bbox_width", 0)))
        bh = int(b.get("h", b.get("bbox_height", 0)))

        nx = max(0, round(bx * scale_x))
        ny = max(0, round(by * scale_y))
        nw = max(5, round(bw * scale_x))
        nh = max(5, round(bh * scale_y))
        if nx + nw > tw:
            nw = max(5, int(tw - nx))
        if ny + nh > th:
            nh = max(5, int(th - ny))

        nb["x"] = nx
        nb["y"] = ny
        nb["w"] = nw
        nb["h"] = nh
        nb["image_width"] = int(tw)
        nb["image_height"] = int(th)
        scaled_boxes.append(nb)

    return {"status": "ok", "boxes": scaled_boxes}


def get_batch_counterpart_summary(category: str, direction: str = "physical_to_scan") -> Dict[str, Any]:
    if not category:
        raise HTTPException(status_code=400, detail="Category is required.")
    source_mode = "physical_capture" if direction == "physical_to_scan" else "scan_capture"
    target_mode = "scan_capture" if direction == "physical_to_scan" else "physical_capture"

    source_dir = DOC_DIR / source_mode / category
    source_files = (
        [f for f in sorted(source_dir.glob("*")) if f.is_file() and f.suffix.lower() in ALLOWED_IMAGE_EXTS]
        if source_dir.exists()
        else []
    )
    det_stats = get_annotated_file_stats()

    annotated_source_count = 0
    total_source_boxes = 0
    matched_counterparts = 0
    matched_annotated_count = 0
    already_annotated_targets = 0

    for sf in source_files:
        box_count = det_stats.get(sf.name, 0)
        if box_count > 0:
            annotated_source_count += 1
            total_source_boxes += box_count
        cp = find_counterpart_file(sf, target_mode=target_mode)
        if cp:
            matched_counterparts += 1
            if box_count > 0:
                matched_annotated_count += 1
            if det_stats.get(cp.name, 0) > 0:
                already_annotated_targets += 1

    return {
        "status": "ok",
        "category": category,
        "direction": direction,
        "source_mode": source_mode,
        "target_mode": target_mode,
        "total_source_files": len(source_files),
        "annotated_source_files": annotated_source_count,
        "total_source_boxes": total_source_boxes,
        "matched_counterparts": matched_counterparts,
        "matched_annotated_count": matched_annotated_count,
        "transferable_files_count": matched_annotated_count,
        "already_annotated_targets": already_annotated_targets,
    }


def batch_copy_counterparts(
    category: str,
    direction: str = "physical_to_scan",
    overwrite: bool = False,
    export_img: bool = True,
) -> Dict[str, Any]:
    if not category:
        raise HTTPException(status_code=400, detail="Category is required.")

    _create_backup(DEFAULT_CSV)
    _create_backup(DEFAULT_OCR_CSV)

    source_mode = "physical_capture" if direction == "physical_to_scan" else "scan_capture"
    target_mode = "scan_capture" if direction == "physical_to_scan" else "physical_capture"
    source_dir = DOC_DIR / source_mode / category
    if not source_dir.exists():
        raise HTTPException(status_code=404, detail=f"Source directory not found: {source_mode}/{category}")

    source_files = [f for f in sorted(source_dir.glob("*")) if f.is_file() and f.suffix.lower() in ALLOWED_IMAGE_EXTS]
    det_stats = get_annotated_file_stats()

    transferred = 0
    skipped = 0
    errors: List[str] = []

    for sf in source_files:
        if det_stats.get(sf.name, 0) == 0:
            continue
        cp = find_counterpart_file(sf, target_mode=target_mode)
        if not cp:
            skipped += 1
            continue
        if not overwrite and det_stats.get(cp.name, 0) > 0:
            skipped += 1
            continue
        try:
            src_boxes = get_boxes(sf.name)["boxes"]
            sw, sh = get_image_dimensions(sf)
            tw, th = get_image_dimensions(cp)
            scaled = copy_counterpart_boxes(src_boxes, sw, sh, tw, th)["boxes"]
            cp_rel = str(cp.relative_to(PROJECT_ROOT)).replace("\\", "/")
            save_boxes(
                file_name=cp.name,
                rel_path=cp_rel,
                boxes=scaled,
                export_csv=True,
                export_ocr=True,
                export_img=export_img,
            )
            transferred += 1
        except Exception as exc:
            errors.append(f"{sf.name} -> {cp.name}: {exc}")

    return {
        "status": "ok" if not errors else "partial",
        "transferred_files": transferred,
        "skipped_files": skipped,
        "errors": errors,
    }
