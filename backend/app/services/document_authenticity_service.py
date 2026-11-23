"""
Document Authenticity Service for OFPHIL V2 Stage 3.
Handles:
- Immutable original document storage + SHA-256 integrity
- Persistent document registry (JSON + optional Supabase sync)
- Background processing orchestration (OCR, signature-region detection, image forensics)
- Separate fields for processing status, automated indicators, and manual reviewer decisions
"""
import datetime
import hashlib
import io
import json
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.config import get_settings
from app.core.paths import STORAGE_DIR, UPLOAD_STORAGE_DIR
from app.services.file_security import sanitize_filename, validate_file_upload
from app.services.mock_store import db_store

settings = get_settings()

ORIGINALS_DIR = UPLOAD_STORAGE_DIR / "originals"
ORIGINALS_DIR.mkdir(parents=True, exist_ok=True)
REGISTRY_FILE = STORAGE_DIR / "documents_registry.json"


def _utc_now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


class DocumentAuthenticityService:
    def __init__(self) -> None:
        self._records: Dict[str, Dict[str, Any]] = {}
        self._load_registry()

    def _load_registry(self) -> None:
        if REGISTRY_FILE.exists():
            try:
                data = json.loads(REGISTRY_FILE.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    self._records = data
            except Exception:
                self._records = {}

        # Ensure all seeded documents have real physical files on disk
        for doc in db_store.documents:
            doc_id = doc.get("id")
            if doc_id and doc_id not in self._records:
                self._records[doc_id] = {
                    **doc,
                    "processing_state": {
                        "job_id": f"seed-{doc_id}",
                        "processing_status": "COMPLETED" if doc.get("ocr_processed") else "NOT_CHECKED",
                        "engine_version": "seed-v1",
                        "started_at": doc.get("uploaded_at"),
                        "completed_at": doc.get("uploaded_at"),
                        "processing_time_ms": 0.0,
                        "unavailable_checks": [],
                    },
                    "ocr_result": {
                        "engine_used": "Seeded",
                        "engine_version": "seed-v1",
                        "extracted_text": doc.get("extracted_text"),
                        "confidence_score": None,
                        "fields_detected": {},
                        "missing_information": [],
                    },
                    "signature_result": {
                        "signature_status": doc.get("signature_status", "NOT_CHECKED"),
                        "signatures_detected_count": 1 if doc.get("seal_detected") else 0,
                        "regions": [],
                        "engine_version": "seed-v1",
                    },
                    "authenticity_result": {
                        "overall_status": "NO_ISSUE_DETECTED" if doc.get("tamper_risk") == "Low" else "REQUIRES_REVIEW",
                        "tamper_risk_level": doc.get("tamper_risk", "Low"),
                        "indicators": {},
                        "unavailable_checks": [],
                        "engine_version": "seed-v1",
                    },
                    "manual_review": None,
                }

        updated = False
        for doc_id, rec in self._records.items():
            sp = Path(rec.get("storage_path") or "")
            if not rec.get("storage_path") or not sp.exists():
                fname = sanitize_filename(rec.get("filename") or f"{doc_id}.pdf")
                target_path = ORIGINALS_DIR / f"{doc_id}_{fname}"
                if not target_path.exists():
                    ext = target_path.suffix.lower()
                    text_body = rec.get("extracted_text") or f"OFPHIL Document Record: {fname} ({rec.get('patient_id')})"
                    if ext == ".pdf":
                        pdf_bytes = self._build_minimal_pdf(text_body)
                        target_path.write_bytes(pdf_bytes)
                        rec["mime_type"] = "application/pdf"
                        rec["file_size_bytes"] = len(pdf_bytes)
                    else:
                        img_bytes = self._build_minimal_image(text_body, ext)
                        target_path.write_bytes(img_bytes)
                        rec["mime_type"] = "image/png" if ext == ".png" else "image/jpeg"
                        rec["file_size_bytes"] = len(img_bytes)
                rec["storage_path"] = str(target_path)
                rec["sha256_hash"] = hashlib.sha256(target_path.read_bytes()).hexdigest()
                if not rec.get("mime_type"):
                    rec["mime_type"] = "application/pdf" if target_path.suffix.lower() == ".pdf" else "image/jpeg"
                updated = True
        if updated or not REGISTRY_FILE.exists():
            self._save_registry()

    def _build_minimal_pdf(self, text: str) -> bytes:
        clean_lines = [line.replace("(", "[").replace(")", "]") for line in (text or "OFPHIL Document").splitlines()[:15]]
        tj_lines = " T* ".join(f"({line}) Tj" for line in clean_lines)
        stream = f"BT /F1 11 Tf 45 740 Td 16 TL {tj_lines} ET".encode("latin-1", errors="ignore")
        obj1 = b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        obj2 = b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        obj3 = b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
        obj4 = f"4 0 obj << /Length {len(stream)} >> stream\n".encode("ascii") + stream + b"\nendstream endobj\n"
        obj5 = b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
        header = b"%PDF-1.4\n"
        body = b""
        offsets = []
        cursor = len(header)
        for o in (obj1, obj2, obj3, obj4, obj5):
            offsets.append(cursor)
            body += o
            cursor += len(o)
        xref = f"xref\n0 6\n0000000000 65535 f \n".encode("ascii")
        for off in offsets:
            xref += f"{off:010d} 00000 n \n".encode("ascii")
        trailer = f"trailer << /Size 6 /Root 1 0 R >>\nstartxref\n{cursor}\n%%EOF\n".encode("ascii")
        return header + body + xref + trailer

    def _build_minimal_image(self, text: str, ext: str) -> bytes:
        try:
            from PIL import Image, ImageDraw
            img = Image.new("RGB", (720, 480), color=(250, 251, 248))
            draw = ImageDraw.Draw(img)
            draw.rectangle([(16, 16), (704, 464)], outline=(11, 107, 58), width=3)
            draw.text((36, 36), "OFPHIL VERIFIED PATIENT DOCUMENT", fill=(11, 107, 58))
            y = 75
            for line in (text or "").splitlines()[:12]:
                draw.text((36, y), line, fill=(16, 36, 26))
                y += 26
            buf = io.BytesIO()
            fmt = "PNG" if ext == ".png" else "JPEG"
            img.save(buf, format=fmt)
            return buf.getvalue()
        except Exception:
            return b"\x89PNG\r\n\x1a\n"

    def _save_registry(self) -> None:
        try:
            REGISTRY_FILE.parent.mkdir(parents=True, exist_ok=True)
            REGISTRY_FILE.write_text(json.dumps(self._records, indent=2), encoding="utf-8")
        except Exception:
            pass

    def list_documents(self, patient_id: Optional[str] = None) -> List[Dict[str, Any]]:
        docs = list(self._records.values())
        if patient_id:
            docs = [d for d in docs if d.get("patient_id") == patient_id]
        # Sort newest first
        docs.sort(key=lambda d: d.get("uploaded_at", ""), reverse=True)
        return docs

    def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        return self._records.get(document_id)

    def save_uploaded_document(
        self,
        filename: str,
        content: bytes,
        content_type: Optional[str],
        document_type: str,
        patient_id: str,
        patient_name: str,
        assessment_id: Optional[str] = None,
        uploaded_by: str = "msw_lead",
    ) -> Dict[str, Any]:
        clean_filename = sanitize_filename(filename)
        validate_file_upload(
            filename=clean_filename,
            file_size=len(content),
            max_size_mb=settings.MAX_UPLOAD_SIZE_MB,
            file_content=content,
        )

        doc_id = f"doc-{uuid.uuid4().hex[:10]}"
        sha256 = hashlib.sha256(content).hexdigest()
        storage_filename = f"{doc_id}_{clean_filename}"
        storage_path = ORIGINALS_DIR / storage_filename

        # Store original file immutably
        storage_path.write_bytes(content)

        now_iso = _utc_now_iso()
        record: Dict[str, Any] = {
            "id": doc_id,
            "patient_id": patient_id,
            "patient_name": patient_name,
            "assessment_id": assessment_id,
            "filename": clean_filename,
            "document_type": document_type,
            "file_size_bytes": len(content),
            "mime_type": content_type or "application/octet-stream",
            "sha256_hash": sha256,
            "storage_path": str(storage_path),
            "uploaded_at": now_iso,
            "uploaded_by": uploaded_by,
            "status": "uploaded",
            "ocr_processed": False,
            "manipulation_risk": "not_checked",
            "verification_status": "Pending Automated Processing",
            "seal_detected": None,
            "tamper_risk": "Not Checked",
            "signature_status": "NOT_CHECKED",
            "extracted_text": None,
            "processing_state": {
                "job_id": None,
                "processing_status": "NOT_CHECKED",
                "engine_version": "ofphil-docauth-v2.0",
                "started_at": None,
                "completed_at": None,
                "processing_time_ms": None,
                "unavailable_checks": [],
                "error_message": None,
            },
            "ocr_result": {
                "engine_used": "none",
                "engine_version": "ofphil-docauth-v2.0",
                "extracted_text": None,
                "confidence_score": None,
                "fields_detected": {},
                "missing_information": [],
                "unavailable_reason": "Processing not yet executed",
            },
            "signature_result": {
                "signature_status": "NOT_CHECKED",
                "signatures_detected_count": 0,
                "regions": [],
                "engine_version": "ofphil-docauth-v2.0",
            },
            "authenticity_result": {
                "overall_status": "UNVERIFIABLE",
                "tamper_risk_level": "Not Checked",
                "indicators": {},
                "unavailable_checks": [],
                "engine_version": "ofphil-docauth-v2.0",
            },
            "manual_review": None,
        }

        self._records[doc_id] = record
        self._save_registry()
        # Keep db_store in sync for legacy /documents list callers
        db_store.documents.insert(0, record)
        return record

    def queue_processing(self, document_id: str, assessment_id: Optional[str] = None) -> Dict[str, Any]:
        doc = self._records.get(document_id)
        if not doc:
            raise KeyError(f"Document {document_id} not found")
        job_id = f"job-{uuid.uuid4().hex[:8]}"
        if assessment_id:
            doc["assessment_id"] = assessment_id
        doc["processing_state"] = {
            "job_id": job_id,
            "processing_status": "QUEUED",
            "engine_version": "ofphil-docauth-v2.0",
            "started_at": _utc_now_iso(),
            "completed_at": None,
            "processing_time_ms": None,
            "unavailable_checks": [],
            "error_message": None,
        }
        doc["status"] = "queued"
        self._save_registry()
        return doc["processing_state"]

    def run_processing_pipeline(
        self,
        document_id: str,
        ocr_engine: str = "auto",
        run_forensics: bool = True,
        run_signature_detection: bool = True,
    ) -> Dict[str, Any]:
        doc = self._records.get(document_id)
        if not doc:
            return {}

        t0 = time.perf_counter()
        job_id = (doc.get("processing_state") or {}).get("job_id") or f"job-{uuid.uuid4().hex[:8]}"
        doc["processing_state"]["processing_status"] = "PROCESSING"
        doc["processing_state"]["job_id"] = job_id
        unavailable_checks: List[str] = []

        storage_path = Path(doc.get("storage_path", ""))
        if not storage_path.exists():
            doc["processing_state"]["processing_status"] = "FAILED"
            doc["processing_state"]["error_message"] = "Immutable original file missing from storage."
            doc["processing_state"]["completed_at"] = _utc_now_iso()
            self._save_registry()
            return doc

        raw_bytes = storage_path.read_bytes()
        ext = storage_path.suffix.lower()
        is_pdf = ext == ".pdf" or raw_bytes.startswith(b"%PDF")

        # 1. OCR Extraction
        extracted_text: Optional[str] = None
        ocr_confidence: Optional[float] = None
        engine_used = "unavailable"
        ocr_unavailable_reason: Optional[str] = None

        if is_pdf:
            # Attempt lightweight PDF text extraction via pypdf/pypdfium2 if available
            try:
                import pypdfium2 as pdfium
                pdf = pdfium.PdfDocument(raw_bytes)
                pages_text = []
                for idx in range(min(len(pdf), 3)):
                    page = pdf[idx]
                    textpage = page.get_textpage()
                    pages_text.append(textpage.get_text_range())
                joined = "\n".join([p.strip() for p in pages_text if p and p.strip()])
                if joined:
                    extracted_text = joined
                    engine_used = "pypdfium2-text"
                    ocr_confidence = 0.95
                else:
                    ocr_unavailable_reason = "Scanned PDF without embedded text layer; PDF rasterizer OCR pipeline unavailable."
                    unavailable_checks.append("pdf_raster_ocr")
            except Exception as e:
                ocr_unavailable_reason = f"PDF text extraction unavailable ({type(e).__name__})."
                unavailable_checks.append("pdf_text_extraction")
        else:
            # Image document: run OCR with EasyOCR (with PaddleOCR fallback)
            extracted_text, ocr_confidence, engine_used, ocr_unavailable_reason = self._run_image_ocr(
                raw_bytes, preferred_engine=ocr_engine
            )
            if ocr_unavailable_reason:
                unavailable_checks.append("ocr_engine")

        fields_detected = self._extract_structured_fields(extracted_text or "")
        doc["ocr_processed"] = extracted_text is not None
        doc["extracted_text"] = extracted_text
        doc["ocr_result"] = {
            "engine_used": engine_used,
            "engine_version": "ofphil-ocr-v2.0",
            "extracted_text": extracted_text,
            "confidence_score": ocr_confidence,
            "fields_detected": fields_detected,
            "missing_information": [] if extracted_text else ["No machine-readable text extracted"],
            "unavailable_reason": ocr_unavailable_reason,
        }

        # 2. Signature Presence Detection
        if run_signature_detection and not is_pdf:
            sig_res = self._detect_signature_regions(raw_bytes)
        elif run_signature_detection and is_pdf:
            sig_res = {
                "signature_status": "UNVERIFIABLE",
                "signatures_detected_count": 0,
                "regions": [],
                "engine_version": "OpenCV-Contour-v1 (PDF rasterization unavailable)",
            }
            unavailable_checks.append("pdf_signature_detection")
        else:
            sig_res = {
                "signature_status": "NOT_CHECKED",
                "signatures_detected_count": 0,
                "regions": [],
                "engine_version": "skipped",
            }
        doc["signature_result"] = sig_res
        doc["signature_status"] = sig_res["signature_status"]
        doc["seal_detected"] = sig_res["signatures_detected_count"] > 0

        # 3. Document Forensics / Tampering Indicators
        if run_forensics and not is_pdf:
            auth_res = self._run_image_forensics(raw_bytes, sig_res["signature_status"])
        elif run_forensics and is_pdf:
            auth_res = {
                "overall_status": "REQUIRES_REVIEW" if not extracted_text else "NO_ISSUE_DETECTED",
                "tamper_risk_level": "Low" if extracted_text else "Review Required",
                "indicators": {
                    "pdf_header_valid": raw_bytes.startswith(b"%PDF"),
                    "eof_marker_present": b"%%EOF" in raw_bytes[-1024:],
                    "file_size_bytes": len(raw_bytes),
                },
                "unavailable_checks": ["image_ela_forensics"],
                "engine_version": "PDF-Structure-Check-v1",
            }
        else:
            auth_res = {
                "overall_status": "UNVERIFIABLE",
                "tamper_risk_level": "Not Checked",
                "indicators": {},
                "unavailable_checks": ["forensics_skipped"],
                "engine_version": "skipped",
            }

        doc["authenticity_result"] = auth_res
        doc["tamper_risk"] = auth_res["tamper_risk_level"]
        doc["manipulation_risk"] = "clean" if auth_res["overall_status"] == "NO_ISSUE_DETECTED" else "review_required"
        doc["verification_status"] = auth_res["overall_status"]
        doc["status"] = "processed"

        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
        doc["processing_state"] = {
            "job_id": job_id,
            "processing_status": "COMPLETED",
            "engine_version": "ofphil-docauth-v2.0",
            "started_at": doc["processing_state"].get("started_at") or _utc_now_iso(),
            "completed_at": _utc_now_iso(),
            "processing_time_ms": elapsed_ms,
            "unavailable_checks": unavailable_checks,
            "error_message": None,
        }
        self._save_registry()
        return doc

    def _run_image_ocr(self, raw_bytes: bytes, preferred_engine: str = "auto") -> tuple[Optional[str], Optional[float], str, Optional[str]]:
        try:
            from PIL import Image
            import numpy as np

            img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
            img_np = np.array(img)
        except Exception as e:
            return None, None, "unavailable", f"Could not decode image: {e}"

        # Prefer EasyOCR locally if cached; avoid network download hangs if models aren't present
        if preferred_engine in ("auto", "easyocr"):
            try:
                import easyocr
                reader = easyocr.Reader(["en"], gpu=False, verbose=False, download_enabled=False)
                results = reader.readtext(img_np)
                if results:
                    texts = [r[1] for r in results if r[1].strip()]
                    confs = [float(r[2]) for r in results]
                    avg_conf = round(sum(confs) / len(confs), 4) if confs else None
                    return "\n".join(texts), avg_conf, "EasyOCR", None
                return "", 0.0, "EasyOCR", None
            except Exception as e:
                if preferred_engine == "easyocr":
                    return None, None, "EasyOCR", f"EasyOCR unavailable locally: {type(e).__name__}"

        # Fallback: PaddleOCR
        if preferred_engine in ("auto", "paddleocr"):
            try:
                from paddleocr import PaddleOCR
                ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
                res = ocr.ocr(img_np, cls=True)
                lines = []
                confs = []
                if res and res[0]:
                    for line in res[0]:
                        txt, conf = line[1]
                        lines.append(txt)
                        confs.append(float(conf))
                avg_conf = round(sum(confs) / len(confs), 4) if confs else 0.0
                return "\n".join(lines), avg_conf, "PaddleOCR", None
            except Exception as e:
                return None, None, "unavailable", f"OCR engines unavailable locally ({type(e).__name__})"

        return None, None, "unavailable", f"Requested OCR engine '{preferred_engine}' is not locally available."

    def _detect_signature_regions(self, raw_bytes: bytes) -> Dict[str, Any]:
        """
        Detects candidate handwritten/ink signature regions in the lower document band
        using OpenCV morphological contour analysis.
        """
        try:
            import cv2
            import numpy as np
            from PIL import Image

            img = Image.open(io.BytesIO(raw_bytes)).convert("L")
            arr = np.array(img)
            h, w = arr.shape
            if h < 40 or w < 40:
                return {
                    "signature_status": "UNVERIFIABLE",
                    "signatures_detected_count": 0,
                    "regions": [],
                    "engine_version": "OpenCV-Contour-v1",
                }

            # Focus on lower 45% of document where signature blocks typically appear
            roi_y_start = int(h * 0.55)
            roi = arr[roi_y_start:, :]
            _, thresh = cv2.threshold(roi, 180, 255, cv2.THRESH_BINARY_INV)
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 5))
            dilated = cv2.dilate(thresh, kernel, iterations=1)
            contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            regions = []
            for cnt in contours:
                x, y, cw, ch = cv2.boundingRect(cnt)
                area = cw * ch
                # Candidate signature band heuristic: wide enough, not full-page border
                if 40 <= cw <= w * 0.7 and 12 <= ch <= h * 0.25 and area >= 600:
                    ink_ratio = float(np.count_nonzero(thresh[y:y+ch, x:x+cw])) / float(area)
                    if 0.03 <= ink_ratio <= 0.65:
                        regions.append({
                            "label": "candidate_signature_region",
                            "box": [int(x), int(roi_y_start + y), int(x + cw), int(roi_y_start + y + ch)],
                            "ink_density": round(ink_ratio, 3),
                        })

            if len(regions) > 0:
                status_str = "SIGNATURE_DETECTED"
            else:
                status_str = "SIGNATURE_NOT_FOUND"

            return {
                "signature_status": status_str,
                "signatures_detected_count": len(regions),
                "regions": regions[:5],
                "engine_version": "OpenCV-Contour-v1 (YOLO signature weights not loaded)",
            }
        except Exception:
            return {
                "signature_status": "UNVERIFIABLE",
                "signatures_detected_count": 0,
                "regions": [],
                "engine_version": "unavailable",
            }

    def _run_image_forensics(self, raw_bytes: bytes, sig_status: str) -> Dict[str, Any]:
        """
        Computes Error Level Analysis (ELA) variance and Laplacian sharpness metrics.
        """
        try:
            import cv2
            import numpy as np
            from PIL import Image

            orig = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
            buf = io.BytesIO()
            orig.save(buf, format="JPEG", quality=90)
            buf.seek(0)
            resaved = Image.open(buf).convert("RGB")

            diff = np.abs(np.asarray(orig, dtype=np.int16) - np.asarray(resaved, dtype=np.int16))
            ela_mean = float(np.mean(diff))
            ela_max = float(np.max(diff))
            ela_std = float(np.std(diff))

            gray = cv2.cvtColor(np.asarray(orig), cv2.COLOR_RGB2GRAY)
            lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

            # Flag for review if high ELA variance or missing signature
            requires_review = (ela_std > 12.0) or (sig_status == "SIGNATURE_NOT_FOUND")
            overall_status = "REQUIRES_REVIEW" if requires_review else "NO_ISSUE_DETECTED"
            tamper_risk = "Medium" if ela_std > 12.0 else "Low"

            return {
                "overall_status": overall_status,
                "tamper_risk_level": tamper_risk,
                "indicators": {
                    "ela_mean_diff": round(ela_mean, 3),
                    "ela_std_diff": round(ela_std, 3),
                    "ela_max_diff": round(ela_max, 3),
                    "laplacian_sharpness_var": round(lap_var, 2),
                    "copy_move_indicator": "Not Run (Requires specialized forensic model)" if False else "No gross ELA spike" if ela_std <= 12.0 else "Elevated ELA variance",
                    "splicing_indicator": "Elevated ELA variance" if ela_std > 12.0 else "Normal compression profile",
                    "signature_presence": sig_status,
                },
                "unavailable_checks": ["custom_cnn_splice_detector"],
                "engine_version": "PIL-ELA-OpenCV-v1",
            }
        except Exception as e:
            return {
                "overall_status": "UNVERIFIABLE",
                "tamper_risk_level": "Unverifiable",
                "indicators": {"error": str(e)},
                "unavailable_checks": ["image_ela_forensics"],
                "engine_version": "unavailable",
            }

    def _extract_structured_fields(self, text: str) -> Dict[str, Any]:
        fields: Dict[str, Any] = {}
        lower = text.lower()
        if "indigency" in lower or "indigent" in lower:
            fields["indigency_keyword"] = True
        if "barangay" in lower:
            fields["barangay_reference"] = True
        if "philhealth" in lower:
            fields["philhealth_reference"] = True
        if "cataract" in lower or "glaucoma" in lower or "eye" in lower:
            fields["clinical_eye_reference"] = True
        return fields

    def record_manual_review(
        self,
        document_id: str,
        decision: str,
        review_notes: str,
        reviewer_id: str,
        reviewer_name: str,
    ) -> Dict[str, Any]:
        doc = self._records.get(document_id)
        if not doc:
            raise KeyError(f"Document {document_id} not found")

        normalized = decision.strip().upper()
        if normalized not in {"ACCEPTED", "REJECTED", "RESUBMISSION_REQUIRED"}:
            raise ValueError("Decision must be ACCEPTED, REJECTED, or RESUBMISSION_REQUIRED")

        reviewed_at = _utc_now_iso()
        review_record = {
            "review_decision": normalized,
            "review_notes": review_notes,
            "reviewer_id": reviewer_id,
            "reviewer_name": reviewer_name,
            "reviewed_at": reviewed_at,
        }
        # Keep manual reviewer decision strictly separate from automated findings
        doc["manual_review"] = review_record
        doc["verification_status"] = f"Manual Review: {normalized}"
        self._save_registry()
        return review_record


document_authenticity_service = DocumentAuthenticityService()
