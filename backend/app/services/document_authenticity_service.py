"""
Document Authenticity Service for OFPHIL V2.

Adheres strictly to the approved open-source architecture under pin#arch:
- Document Upload -> SHA-256 Hash Generation -> Image Preprocessing
- ResNet-50 Document Classification / Category Mapping
- PaddleOCR PP-OCRv6 Text Extraction
- Digital Image Forensics (ELA, Noise Inconsistency, Chromatic Dispersion, ORB CMFD, Edge/Gradient analysis)
- Signature & Stamp Screening (YOLO11s ofphil_yolo_detector + morphological fallback)
- Evidence Aggregation Engine (Defensible, multi-indicator, non-binary screening)

Screening Statuses:
1. NO_SUSPICIOUS_INDICATORS
2. NEEDS_VERIFICATION
3. FLAGGED_FOR_MANUAL_REVIEW
4. INSUFFICIENT_IMAGE_QUALITY

Individual Module Statuses:
- PASSED
- SUSPICIOUS
- NOT_EVALUATED
- INSUFFICIENT_EVIDENCE
"""
import datetime
import hashlib
import io
import json
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

from app.core.config import get_settings
from app.core.paths import STORAGE_DIR, UPLOAD_STORAGE_DIR
from app.services.file_security import sanitize_filename, validate_file_upload
from app.services.mock_store import db_store
from app.services.document_screening.forgery_detection.forensic_analyzer import DocumentForensicAnalyzer
from app.services.document_screening.validation.evidence_aggregation import (
    evidence_aggregation_engine,
    ScreeningAssessment,
)
from app.services.document_screening.classification.resnet_classifier import resnet50_classifier
from app.services.document_screening.ocr.field_extractor import (
    extract_essential_fields,
    reconstruct_reading_order,
)
from app.services.document_screening.signature_screening.signature_verification_service import signature_screening_service
from app.services.document_screening.stamp_seal_screening.stamp_verification_service import stamp_seal_screening_service

settings = get_settings()

ORIGINALS_DIR = UPLOAD_STORAGE_DIR / "originals"
ORIGINALS_DIR.mkdir(parents=True, exist_ok=True)
REGISTRY_FILE = STORAGE_DIR / "documents_registry.json"

YOLO_WEIGHTS_PATH = Path("backend/models/trained/yolo/ofphil_yolo_detector-2/weights/best.pt")
if not YOLO_WEIGHTS_PATH.exists():
    YOLO_WEIGHTS_PATH = Path("backend/models/trained/yolo/ofphil_yolo_detector/weights/best.pt")


def _utc_now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


class DocumentAuthenticityService:
    def __init__(self) -> None:
        self._records: Dict[str, Dict[str, Any]] = {}
        self.forensic_analyzer = DocumentForensicAnalyzer()
        self.aggregation_engine = evidence_aggregation_engine
        self.resnet_classifier = resnet50_classifier
        self.signature_screener = signature_screening_service
        self.stamp_screener = stamp_seal_screening_service
        self._paddle_ocr = None
        self._load_registry()

    def _init_yolo(self) -> None:
        if YOLO_WEIGHTS_PATH.exists():
            try:
                from ultralytics import YOLO
                self._yolo_model = YOLO(str(YOLO_WEIGHTS_PATH))
            except Exception:
                self._yolo_model = None

    def _init_paddle_ocr(self) -> None:
        if self._paddle_ocr is None:
            try:
                from paddleocr import PaddleOCR
                self._paddle_ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
            except Exception:
                self._paddle_ocr = None

    def _load_registry(self) -> None:
        if REGISTRY_FILE.exists():
            try:
                data = json.loads(REGISTRY_FILE.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    self._records = data
            except Exception:
                self._records = {}

        # Ensure all seeded documents from db_store are registered without false "Authentic"
        for doc in db_store.documents:
            doc_id = doc.get("id")
            if doc_id and doc_id not in self._records:
                self._records[doc_id] = self._build_initial_record(
                    doc_id=doc_id,
                    filename=doc.get("filename", f"{doc_id}.pdf"),
                    document_type=doc.get("document_type", "Barangay Indigency Certificate"),
                    patient_id=doc.get("patient_id", "M26-11-00001"),
                    patient_name=doc.get("patient_name", "Juan Dela Cruz"),
                    file_size=doc.get("file_size_bytes", 1024),
                    mime_type="application/pdf" if str(doc.get("filename")).endswith(".pdf") else "image/jpeg",
                    sha256=doc.get("sha256_hash") or hashlib.sha256(doc_id.encode()).hexdigest(),
                    storage_path="",
                    uploaded_at=doc.get("uploaded_at") or _utc_now_iso(),
                    uploaded_by="system_seed",
                )

        # Migrate existing registry items to use approved screening statuses
        updated = False
        for doc_id, rec in self._records.items():
            auth_obj = rec.setdefault("authenticity_result", {})
            current_cls = auth_obj.get("authenticity_classification") or rec.get("authenticity_classification")
            if current_cls in {"Authentic", "Suspicious", "Counterfeit"}:
                # Map old 3-tier to approved 4-tier screening statuses
                if current_cls == "Authentic":
                    new_status = "NO_SUSPICIOUS_INDICATORS"
                    new_risk = "LOW"
                    new_summary = "No suspicious forensic indicators detected across evaluated screening modules."
                elif current_cls == "Counterfeit":
                    new_status = "FLAGGED_FOR_MANUAL_REVIEW"
                    new_risk = "HIGH"
                    new_summary = "Flagged forensic anomaly or structural discrepancy requiring closer manual inspection."
                else:
                    new_status = "NEEDS_VERIFICATION"
                    new_risk = "UNDETERMINED"
                    new_summary = "Partial forensic evidence or missing metadata; caseworker verification recommended."

                auth_obj["screening_status"] = new_status
                auth_obj["tamper_risk"] = new_risk
                auth_obj["authenticity_summary"] = new_summary
                auth_obj["authenticity_classification"] = new_status
                rec["screening_status"] = new_status
                rec["tamper_risk"] = new_risk
                rec["authenticity_classification"] = new_status
                rec["authenticity_summary"] = new_summary
                rec["verification_status"] = new_status
                updated = True

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
                updated = True

        if updated or not REGISTRY_FILE.exists():
            self._save_registry()

    def _build_initial_record(
        self,
        doc_id: str,
        filename: str,
        document_type: str,
        patient_id: str,
        patient_name: str,
        file_size: int,
        mime_type: str,
        sha256: str,
        storage_path: str,
        uploaded_at: str,
        uploaded_by: str,
        assessment_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        return {
            "id": doc_id,
            "patient_id": patient_id,
            "patient_name": patient_name,
            "assessment_id": assessment_id,
            "filename": filename,
            "document_type": document_type,
            "file_size_bytes": file_size,
            "mime_type": mime_type,
            "sha256_hash": sha256,
            "storage_path": storage_path,
            "uploaded_at": uploaded_at,
            "uploaded_by": uploaded_by,
            "status": "UPLOADED",
            "processing_status": "UPLOADED",
            "ocr_processed": False,
            "screening_status": "NEEDS_VERIFICATION",
            "authenticity_classification": "NEEDS_VERIFICATION",
            "tamper_risk": "UNDETERMINED",
            "verification_status": "NEEDS_VERIFICATION",
            "authenticity_summary": "Document uploaded and hashed. Pending automated processing.",
            "seal_detected": None,
            "signature_status": "NOT_EVALUATED",
            "stamp_status": "NOT_EVALUATED",
            "extracted_text": None,
            "processing_state": {
                "job_id": None,
                "processing_status": "UPLOADED",
                "engine_version": "ofphil-docproc-v2.0",
                "started_at": None,
                "completed_at": None,
                "processing_time_ms": None,
                "unavailable_checks": [],
                "error_message": None,
            },
            "ocr_result": {
                "status": "NOT_EVALUATED",
                "engine_used": "PaddleOCR PP-OCRv6",
                "engine_version": "ppocr-v6",
                "extracted_text": None,
                "confidence_score": None,
                "fields_detected": {},
                "missing_information": [],
                "unavailable_reason": "Processing not started",
            },
            "signature_result": {
                "status": "NOT_EVALUATED",
                "presence": False,
                "signature_status": "NOT_EVALUATED",
                "signatures_detected_count": 0,
                "regions": [],
                "engine_version": "YOLO11s-OFPHIL",
                "disclaimer": "Signature presence detection only; does not establish signer identity or signature authenticity.",
            },
            "stamp_result": {
                "status": "NOT_EVALUATED",
                "presence": False,
                "stamp_status": "NOT_EVALUATED",
                "stamps_detected_count": 0,
                "regions": [],
                "engine_version": "YOLO11s-OFPHIL",
                "disclaimer": "Stamp/seal screening only; does not establish official issuing authority legitimacy.",
            },
            "forensics_result": {
                "resolution_analysis": {"status": "NOT_EVALUATED", "details": "Pending processing"},
                "metadata_analysis": {"status": "NOT_EVALUATED", "details": "Pending processing"},
                "ela_analysis": {"status": "NOT_EVALUATED", "details": "Pending processing"},
                "noise_analysis": {"status": "NOT_EVALUATED", "details": "Pending processing"},
                "chromatic_analysis": {"status": "NOT_EVALUATED", "details": "Pending processing"},
                "edge_analysis": {"status": "NOT_EVALUATED", "details": "Pending processing"},
                "copy_move_analysis": {"status": "NOT_EVALUATED", "details": "Pending processing"},
            },
            "authenticity_result": {
                "status": "NEEDS_VERIFICATION",
                "screening_status": "NEEDS_VERIFICATION",
                "authenticity_classification": "NEEDS_VERIFICATION",
                "tamper_risk": "UNDETERMINED",
                "tamper_risk_level": "UNDETERMINED",
                "reason": "Document uploaded and hashed. Pending automated forensic screening.",
                "authenticity_summary": "Pending automated forensic screening.",
                "supporting_evidence": [],
                "indicators": {},
                "unavailable_checks": [],
                "engine_version": "ofphil-docproc-v2.0",
                "disclaimer": "Evidence-based screening. Missing indicators do not constitute proof of authenticity.",
            },
            "manual_review": None,
        }

    def _save_registry(self) -> None:
        try:
            REGISTRY_FILE.parent.mkdir(parents=True, exist_ok=True)
            REGISTRY_FILE.write_text(json.dumps(self._records, indent=2), encoding="utf-8")
        except Exception:
            pass

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
            img = Image.new("RGB", (720, 480), color=(250, 251, 248))
            from PIL import ImageDraw
            draw = ImageDraw.Draw(img)
            draw.rectangle([(16, 16), (704, 464)], outline=(11, 107, 58), width=3)
            draw.text((36, 36), "OFPHIL CLINICAL PATIENT DOCUMENT", fill=(11, 107, 58))
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

    def list_documents(self, patient_id: Optional[str] = None) -> List[Dict[str, Any]]:
        docs = list(self._records.values())
        if patient_id:
            docs = [d for d in docs if d.get("patient_id") == patient_id]
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
        storage_path.write_bytes(content)

        record = self._build_initial_record(
            doc_id=doc_id,
            filename=clean_filename,
            document_type=document_type,
            patient_id=patient_id,
            patient_name=patient_name,
            file_size=len(content),
            mime_type=content_type or "application/octet-stream",
            sha256=sha256,
            storage_path=str(storage_path),
            uploaded_at=_utc_now_iso(),
            uploaded_by=uploaded_by,
            assessment_id=assessment_id,
        )

        self._records[doc_id] = record
        self._save_registry()
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
            "engine_version": "ofphil-docproc-v2.0",
            "started_at": _utc_now_iso(),
            "completed_at": None,
            "processing_time_ms": None,
            "unavailable_checks": [],
            "error_message": None,
        }
        doc["status"] = "QUEUED"
        doc["processing_status"] = "QUEUED"
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
        doc["processing_state"]["error_message"] = None
        doc["status"] = "PROCESSING"
        doc["processing_status"] = "PROCESSING"
        self._save_registry()

        try:
            return self._execute_processing_pipeline(
                doc=doc,
                job_id=job_id,
                t0=t0,
                ocr_engine=ocr_engine,
                run_forensics=run_forensics,
                run_signature_detection=run_signature_detection,
            )
        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
            doc["processing_state"]["processing_status"] = "FAILED"
            doc["processing_state"]["completed_at"] = _utc_now_iso()
            doc["processing_state"]["processing_time_ms"] = elapsed_ms
            doc["processing_state"]["error_message"] = f"Pipeline error ({type(exc).__name__}): {exc}"
            doc["status"] = "FAILED"
            doc["processing_status"] = "FAILED"
            doc["screening_status"] = "NEEDS_VERIFICATION"
            doc["verification_status"] = "NEEDS_VERIFICATION"
            doc["authenticity_summary"] = f"Automated screening failed ({type(exc).__name__}). Retry or perform manual MSW review."
            self._save_registry()
            return doc

    def _execute_processing_pipeline(
        self,
        doc: Dict[str, Any],
        job_id: str,
        t0: float,
        ocr_engine: str = "auto",
        run_forensics: bool = True,
        run_signature_detection: bool = True,
    ) -> Dict[str, Any]:

        storage_path = Path(doc.get("storage_path", ""))
        if not storage_path.exists():
            doc["processing_state"]["processing_status"] = "FAILED"
            doc["processing_state"]["error_message"] = "Immutable original file missing from storage."
            doc["processing_state"]["completed_at"] = _utc_now_iso()
            doc["status"] = "FAILED"
            doc["processing_status"] = "FAILED"
            self._save_registry()
            return doc

        raw_bytes = storage_path.read_bytes()
        ext = storage_path.suffix.lower()
        is_pdf = ext == ".pdf" or raw_bytes.startswith(b"%PDF")

        unavailable_checks: List[str] = []

        # 1. Image Preprocessing & Conversion
        img_bgr: Optional[np.ndarray] = None
        if not is_pdf:
            try:
                img_bgr = cv2.imdecode(np.frombuffer(raw_bytes, np.uint8), cv2.IMREAD_COLOR)
            except Exception:
                img_bgr = None

        # 2. ResNet-50 Document Classification / Category Mapping
        classification_result = self.resnet_classifier.classify_image(
            image_bytes=raw_bytes if not is_pdf else (raw_bytes[:4096]),
            claimed_document_type=doc.get("document_type", "certificate_of_indigency")
        )
        doc["classification_result"] = classification_result
        doc_category = classification_result.get("predicted_category") or doc.get("document_type", "certificate_of_indigency")

        # 3. PaddleOCR PP-OCRv6 Text Extraction
        extracted_text: Optional[str] = None
        ocr_confidence: Optional[float] = None
        ocr_status = "NOT_EVALUATED"
        ocr_unavailable_reason = None
        engine_used = "PaddleOCR PP-OCRv6"

        if is_pdf:
            try:
                import pypdfium2 as pdfium
                pdf = pdfium.PdfDocument(raw_bytes)
                pages_text = []
                for idx in range(min(len(pdf), 3)):
                    page = pdf[idx]
                    tp = page.get_textpage()
                    pages_text.append(tp.get_text_range())
                joined = "\n".join([p.strip() for p in pages_text if p and p.strip()])
                if joined:
                    extracted_text = joined
                    ocr_confidence = 0.95
                    ocr_status = "COMPLETED"
                    engine_used = "pypdfium2-text"
                else:
                    ocr_status = "INSUFFICIENT_EVIDENCE"
                    ocr_unavailable_reason = "Scanned PDF without embedded text layer."
                    unavailable_checks.append("pdf_raster_ocr")
            except Exception as e:
                ocr_status = "INSUFFICIENT_EVIDENCE"
                ocr_unavailable_reason = f"PDF text extraction unavailable ({type(e).__name__})."
                unavailable_checks.append("pdf_text_extraction")
        else:
            if img_bgr is not None:
                extracted_text, ocr_confidence, ocr_status, ocr_unavailable_reason, detected_engine = self._run_paddle_ocr(img_bgr)
                if detected_engine:
                    engine_used = detected_engine
            else:
                ocr_status = "INSUFFICIENT_EVIDENCE"
                ocr_unavailable_reason = "Failed to decode image bytes."

        # Re-verify classification with extracted OCR keywords if initially low confidence
        if extracted_text and classification_result.get("classification_status") == "LOW_CONFIDENCE":
            classification_result = self.resnet_classifier.classify_image(
                image_bytes=raw_bytes if not is_pdf else (raw_bytes[:4096]),
                extracted_text=extracted_text,
                claimed_document_type=doc.get("document_type", "certificate_of_indigency")
            )
            doc["classification_result"] = classification_result
            doc_category = classification_result.get("predicted_category") or doc_category

        fields_detected = self._extract_structured_fields(extracted_text or "", doc.get("document_type", ""))
        doc["ocr_processed"] = extracted_text is not None and len(extracted_text.strip()) > 0
        doc["extracted_text"] = extracted_text
        doc["ocr_result"] = {
            "status": ocr_status,
            "engine_used": engine_used,
            "engine_version": "ppocr-v6",
            "extracted_text": extracted_text,
            "confidence_score": ocr_confidence,
            "fields_detected": fields_detected,
            "missing_information": [] if extracted_text else ["No machine-readable text extracted"],
            "unavailable_reason": ocr_unavailable_reason,
        }

        # 4. Signature & Stamp/Seal Screening (Dedicated CV & Morphological Screening)
        if is_pdf or img_bgr is None:
            sig_result = {
                "status": "NOT_EVALUATED",
                "presence": False,
                "signature_status": "NOT_EVALUATED",
                "signatures_detected_count": 0,
                "regions": [],
                "engine_version": "OFPHIL-Signature-Screening-v2",
                "details": "Direct raster screening unavailable for PDF format.",
                "disclaimer": "Signature presence detection only; does not establish signer identity or signature authenticity.",
            }
            stamp_result = {
                "status": "NOT_EVALUATED",
                "presence": False,
                "stamp_status": "NOT_EVALUATED",
                "stamps_detected_count": 0,
                "regions": [],
                "engine_version": "OFPHIL-StampSeal-Screening-v2",
                "details": "Direct raster screening unavailable for PDF format.",
                "disclaimer": "Stamp/seal screening only; does not establish official issuing authority legitimacy.",
            }
        else:
            sig_result = self.signature_screener.screen(img_bgr)
            stamp_result = self.stamp_screener.screen(img_bgr)

        doc["signature_result"] = sig_result
        doc["signature_status"] = sig_result["signature_status"]
        doc["stamp_result"] = stamp_result
        doc["stamp_status"] = stamp_result["stamp_status"]
        doc["seal_detected"] = stamp_result["presence"]

        # 5. Digital Image Forensics (ELA, Noise, Chromatic, ORB CMFD, Edge, Metadata, Resolution)
        if run_forensics and not is_pdf:
            forensics_data = self.forensic_analyzer.analyze(raw_bytes, doc.get("filename", ""))
        elif run_forensics and is_pdf:
            forensics_data = self._analyze_pdf_structure(raw_bytes)
            unavailable_checks.append("image_raster_forensics")
        else:
            forensics_data = {
                k: {"status": "NOT_EVALUATED", "details": "Forensic screening was disabled."}
                for k in ("resolution_analysis", "metadata_analysis", "ela_analysis", "noise_analysis", "chromatic_analysis", "edge_analysis", "copy_move_analysis")
            }

        doc["forensics_result"] = forensics_data

        # 6. Evidence Aggregation Engine
        assessment: ScreeningAssessment = self.aggregation_engine.aggregate(
            forensic_results=forensics_data,
            signature_result=sig_result,
            stamp_result=stamp_result,
            ocr_result=doc["ocr_result"],
            document_type=doc_category,
        )

        doc["screening_status"] = assessment.status
        doc["authenticity_classification"] = assessment.status
        doc["tamper_risk"] = assessment.tamper_risk
        doc["authenticity_summary"] = assessment.summary
        doc["verification_status"] = assessment.status
        doc["document_integrity_screening_score"] = assessment.document_integrity_screening_score
        doc["score_interpretation"] = assessment.score_interpretation

        doc["authenticity_result"] = {
            "status": assessment.status,
            "screening_status": assessment.status,
            "authenticity_classification": assessment.status,
            "tamper_risk": assessment.tamper_risk,
            "tamper_risk_level": assessment.tamper_risk,
            "document_integrity_screening_score": assessment.document_integrity_screening_score,
            "score_interpretation": assessment.score_interpretation,
            "score_contributors": assessment.score_contributors,
            "reason": assessment.reason,
            "authenticity_summary": assessment.summary,
            "supporting_evidence": assessment.supporting_evidence,
            "confidence_assessment": assessment.confidence_assessment,
            "indicators": {
                k: v.get("metrics", {}) for k, v in forensics_data.items()
            },
            "unavailable_checks": unavailable_checks,
            "engine_version": "ofphil-docproc-v2.0",
            "disclaimer": assessment.disclaimer,
        }

        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
        doc["processing_state"] = {
            "job_id": job_id,
            "processing_status": "COMPLETED",
            "engine_version": "ofphil-docproc-v2.0",
            "started_at": doc["processing_state"].get("started_at") or _utc_now_iso(),
            "completed_at": _utc_now_iso(),
            "processing_time_ms": elapsed_ms,
            "unavailable_checks": unavailable_checks,
            "error_message": None,
        }
        doc["status"] = "COMPLETED"
        doc["processing_status"] = "COMPLETED"
        self._save_registry()
        return doc

    def _run_paddle_ocr(self, img_bgr: np.ndarray) -> Tuple[Optional[str], Optional[float], str, Optional[str], Optional[str]]:
        try:
            self._init_paddle_ocr()
            if self._paddle_ocr is not None:
                res = self._paddle_ocr.ocr(img_bgr, cls=True)
                detections = []
                confs = []
                if res and res[0]:
                    for line in res[0]:
                        poly, (txt, conf) = line
                        if txt and txt.strip():
                            detections.append((poly, txt, float(conf)))
                            confs.append(float(conf))
                avg_conf = round(sum(confs) / len(confs), 4) if confs else 0.0
                full_text = reconstruct_reading_order(detections)
                status = "COMPLETED" if full_text else "INSUFFICIENT_EVIDENCE"
                return full_text, avg_conf, status, None, "PaddleOCR PP-OCRv6"
        except Exception:
            pass

        try:
            import easyocr
            reader = easyocr.Reader(["en"], gpu=False, verbose=False, download_enabled=False)
            results = reader.readtext(img_bgr)
            if results:
                detections = [(r[0], r[1], float(r[2])) for r in results if r[1] and r[1].strip()]
                confs = [d[2] for d in detections]
                avg_conf = round(sum(confs) / len(confs), 4) if confs else 0.0
                full_text = reconstruct_reading_order(detections)
                return full_text, avg_conf, "COMPLETED", None, "EasyOCR"
        except Exception:
            pass

        return None, None, "INSUFFICIENT_EVIDENCE", "PaddleOCR text extraction engine unavailable or failed.", None

    def _screen_signatures_and_stamps(
        self, img_bgr: Optional[np.ndarray], is_pdf: bool
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        if is_pdf or img_bgr is None:
            unavailable_sig = {
                "status": "NOT_EVALUATED",
                "presence": False,
                "signature_status": "NOT_EVALUATED",
                "signatures_detected_count": 0,
                "regions": [],
                "engine_version": "YOLO11s",
                "details": "Direct raster screening unavailable for PDF format.",
                "disclaimer": "Signature presence detection only; does not establish signer identity or signature authenticity.",
            }
            unavailable_stamp = {
                "status": "NOT_EVALUATED",
                "presence": False,
                "stamp_status": "NOT_EVALUATED",
                "stamps_detected_count": 0,
                "regions": [],
                "engine_version": "YOLO11s",
                "details": "Direct raster screening unavailable for PDF format.",
                "disclaimer": "Stamp/seal screening only; does not establish official issuing authority legitimacy.",
            }
            return unavailable_sig, unavailable_stamp

        sig_boxes: List[Dict[str, Any]] = []
        stamp_boxes: List[Dict[str, Any]] = []

        if self._yolo_model is not None:
            try:
                results = self._yolo_model(img_bgr, verbose=False)
                for r in results:
                    for b in r.boxes:
                        cls_name = self._yolo_model.names[int(b.cls[0])].upper()
                        conf = float(b.conf[0])
                        box = [int(v) for v in b.xyxy[0].tolist()]
                        if "SIGNATURE" in cls_name and conf >= 0.35:
                            sig_boxes.append({"label": "signature", "confidence": round(conf, 3), "box": box})
                        elif "STAMP" in cls_name or "SEAL" in cls_name:
                            stamp_boxes.append({"label": "stamp_or_seal", "confidence": round(conf, 3), "box": box})
            except Exception:
                pass

        if not sig_boxes:
            sig_boxes = self._detect_ink_contours(img_bgr)

        sig_presence = len(sig_boxes) > 0
        sig_result = {
            "status": "PASSED" if sig_presence else "NOT_EVALUATED",
            "presence": sig_presence,
            "signature_status": "PRESENCE_DETECTED" if sig_presence else "NOT_DETECTED",
            "signatures_detected_count": len(sig_boxes),
            "regions": sig_boxes[:5],
            "engine_version": "YOLO11s-OFPHIL",
            "details": f"{len(sig_boxes)} signature region(s) detected." if sig_presence else "No candidate handwritten signature localized.",
            "disclaimer": "Signature presence detection only; does not establish signer identity or signature authenticity.",
        }

        stamp_presence = len(stamp_boxes) > 0
        stamp_result = {
            "status": "PASSED" if stamp_presence else "NOT_EVALUATED",
            "presence": stamp_presence,
            "stamp_status": "PRESENCE_DETECTED" if stamp_presence else "NOT_DETECTED",
            "stamps_detected_count": len(stamp_boxes),
            "regions": stamp_boxes[:5],
            "engine_version": "YOLO11s-OFPHIL",
            "details": f"{len(stamp_boxes)} stamp/seal region(s) detected." if stamp_presence else "No official stamp or seal localized.",
            "disclaimer": "Stamp/seal screening only; does not establish official issuing authority legitimacy.",
        }

        return sig_result, stamp_result

    def _detect_ink_contours(self, img_bgr: np.ndarray) -> List[Dict[str, Any]]:
        try:
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            h, w = gray.shape
            if h < 60 or w < 60:
                return []
            roi_y = int(h * 0.50)
            roi = gray[roi_y:, :]
            _, thresh = cv2.threshold(roi, 180, 255, cv2.THRESH_BINARY_INV)
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 5))
            dilated = cv2.dilate(thresh, kernel, iterations=1)
            contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            regions = []
            for cnt in contours:
                x, y, cw, ch = cv2.boundingRect(cnt)
                area = cw * ch
                if 40 <= cw <= w * 0.7 and 12 <= ch <= h * 0.25 and area >= 600:
                    ink_ratio = float(np.count_nonzero(thresh[y : y + ch, x : x + cw])) / float(area)
                    if 0.03 <= ink_ratio <= 0.65:
                        regions.append({
                            "label": "candidate_signature_contour",
                            "confidence": 0.55,
                            "box": [int(x), int(roi_y + y), int(x + cw), int(roi_y + y + ch)],
                        })
            return regions
        except Exception:
            return []

    def _analyze_pdf_structure(self, raw_bytes: bytes) -> Dict[str, Any]:
        header_valid = raw_bytes.startswith(b"%PDF")
        eof_valid = b"%%EOF" in raw_bytes[-2048:]
        status = "PASSED" if (header_valid and eof_valid) else "SUSPICIOUS"
        return {
            "resolution_analysis": {"status": "PASSED", "details": "Vector PDF document payload."},
            "metadata_analysis": {
                "status": status,
                "details": "Standard PDF structure verified." if status == "PASSED" else "Malformed or corrupted PDF markers.",
                "metrics": {"header_valid": header_valid, "eof_valid": eof_valid},
            },
            "ela_analysis": {"status": "NOT_EVALUATED", "details": "ELA not applicable to direct PDF stream."},
            "noise_analysis": {"status": "NOT_EVALUATED", "details": "Noise analysis not applicable to direct PDF stream."},
            "chromatic_analysis": {"status": "NOT_EVALUATED", "details": "Chromatic analysis not applicable to direct PDF stream."},
            "edge_analysis": {"status": "NOT_EVALUATED", "details": "Edge analysis not applicable to direct PDF stream."},
            "copy_move_analysis": {"status": "NOT_EVALUATED", "details": "Raster CMFD not applicable to direct PDF stream."},
        }

    def _extract_structured_fields(self, text: str, document_type: str = "") -> Dict[str, Any]:
        return extract_essential_fields(text, document_type=document_type)

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
        doc["manual_review"] = review_record
        doc["verification_status"] = f"Manual Review: {normalized}"
        self._save_registry()
        return review_record

    def delete_document(
        self,
        document_id: str,
        deleted_by: str,
        role: str,
    ) -> Dict[str, Any]:
        doc = self._records.get(document_id)
        if not doc:
            raise KeyError(f"Document {document_id} not found")

        removed = self._records.pop(document_id)
        self._save_registry()
        db_store.documents[:] = [d for d in db_store.documents if d.get("id") != document_id]

        storage_path = Path(removed.get("storage_path") or "")
        if storage_path.exists():
            try:
                storage_path.unlink()
            except Exception:
                pass

        return {
            "document_id": document_id,
            "filename": removed.get("filename"),
            "patient_id": removed.get("patient_id"),
            "deleted_by": deleted_by,
            "deleted_role": role,
            "deleted_at": _utc_now_iso(),
            "sha256": removed.get("sha256_hash"),
        }


document_authenticity_service = DocumentAuthenticityService()
