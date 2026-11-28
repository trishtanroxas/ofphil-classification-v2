from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from app.core.audit import log_audit_event
from app.core.rbac import UserRole, require_roles
from app.schemas.document_schemas import (
    DocumentOCRResultResponse,
    DocumentProcessRequest,
    DocumentProcessingStatusResponse,
    DocumentReviewRequest,
    DocumentReviewResponse,
    DocumentSignatureResultResponse,
    DocumentStampResultResponse,
    DocumentStandardReportResponse,
    DocumentVerificationResultResponse,
)
from app.schemas.schemas import DocumentItem
from app.services.document_authenticity_service import document_authenticity_service
from app.services.inquiry_service import inquiry_service
from app.services.mock_store import db_store

router = APIRouter(prefix="/documents", tags=["Document Authenticity API"])


@router.get("", response_model=List[DocumentItem])
def list_documents(
    patient_id: Optional[str] = Query(default=None),
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.RESEARCHER])),
):
    return document_authenticity_service.list_documents(patient_id=patient_id)


@router.post("/upload", response_model=DocumentItem, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form("Barangay Indigency Certificate"),
    patient_id: str = Form("M26-11-00001"),
    patient_name: str = Form("Juan Dela Cruz"),
    assessment_id: Optional[str] = Form(None),
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
    x_user_id: str = Header(default="msw_lead"),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    content = await file.read()
    doc_item = document_authenticity_service.save_uploaded_document(
        filename=file.filename,
        content=content,
        content_type=file.content_type,
        document_type=document_type,
        patient_id=patient_id,
        patient_name=patient_name,
        assessment_id=assessment_id,
        uploaded_by=x_user_id,
    )

    log_audit_event(
        action="DOCUMENT_UPLOAD",
        actor_id=x_user_id,
        role=role.value,
        resource=f"patient_document:{doc_item['id']}",
        status="SUCCESS",
        details={
            "document_id": doc_item["id"],
            "patient_id": patient_id,
            "document_type": document_type,
            "sha256": doc_item["sha256_hash"],
            "file_size": doc_item["file_size_bytes"],
        },
    )
    try:
        target_msw = inquiry_service.resolve_msw_user_id(x_user_id if role == UserRole.MSW else "msw_lead")
        inquiry_service.create_msw_notification(
            recipient_user_id=target_msw,
            notification_type="DOCUMENT_UPLOADED",
            title=f"Supporting Document Uploaded ({patient_id})",
            message=f"{document_type} ({file.filename}) was uploaded for {patient_name} ({patient_id}).",
            target_destination=f"/patients/{patient_id}?tab=documents",
            related_patient_id=patient_id,
            related_assessment_id=assessment_id,
            dedup_key=f"DOC_UPLOAD:{doc_item['id']}:{target_msw}",
        )
    except Exception:
        pass
    return doc_item


@router.get("/{document_id}")
def get_document_metadata(
    document_id: str,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
    x_user_id: str = Header(default="msw_lead"),
):
    doc = document_authenticity_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    log_audit_event(
        action="DOCUMENT_METADATA_READ",
        actor_id=x_user_id,
        role=role.value,
        resource=f"patient_document:{document_id}",
        status="SUCCESS",
        details={"patient_id": doc.get("patient_id")},
    )
    return doc


@router.get("/{document_id}/download")
def download_original_document(
    document_id: str,
    patient_id: Optional[str] = Query(default=None),
    inline: bool = Query(default=False),
    x_user_role: str = Header(default="msw"),
    x_user_id: str = Header(default="msw_lead"),
):
    role_norm = (x_user_role or "msw").strip().lower()
    if role_norm not in {UserRole.ADMIN.value, UserRole.MSW.value, UserRole.PATIENT.value}:
        raise HTTPException(
            status_code=403,
            detail=f"Access forbidden: requires one of ['admin', 'msw', 'patient'], user has role '{role_norm}'",
        )
    doc = document_authenticity_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if role_norm == UserRole.PATIENT.value:
        doc_pid = str(doc.get("patient_id") or "").strip().upper()
        actor_pid = str(x_user_id or "").strip().upper()
        if not actor_pid or doc_pid != actor_pid:
            raise HTTPException(
                status_code=403,
                detail="Access denied: Patients can only view or download their own supporting documents.",
            )
    if patient_id and str(doc.get("patient_id") or "").strip().upper() != patient_id.strip().upper():
        raise HTTPException(
            status_code=403,
            detail="Access denied: Document belongs to another patient record.",
        )
    storage_path = Path(doc.get("storage_path", ""))
    if not storage_path.exists():
        raise HTTPException(status_code=404, detail="Original document file not found in secure storage")

    log_audit_event(
        action="DOCUMENT_PREVIEW" if inline else "DOCUMENT_DOWNLOAD",
        actor_id=x_user_id,
        role=role_norm,
        resource=f"patient_document:{document_id}",
        status="SUCCESS",
        details={"patient_id": doc.get("patient_id"), "sha256": doc.get("sha256_hash")},
    )
    return FileResponse(
        path=str(storage_path),
        filename=doc.get("filename", "document"),
        media_type=doc.get("mime_type", "application/octet-stream"),
        content_disposition_type="inline" if inline else "attachment",
    )


@router.post("/{document_id}/process", response_model=DocumentProcessingStatusResponse)
def process_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    payload: DocumentProcessRequest = DocumentProcessRequest(),
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
    x_user_id: str = Header(default="msw_lead"),
):
    doc = document_authenticity_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Prevent concurrent duplicate processing requests
    current_proc_status = (doc.get("processing_state") or {}).get("processing_status")
    if current_proc_status == "PROCESSING":
        return DocumentProcessingStatusResponse(
            document_id=document_id,
            job_id=(doc.get("processing_state") or {}).get("job_id"),
            processing_status="PROCESSING",
            engine_version="ofphil-docproc-v2.0",
        )

    state = document_authenticity_service.queue_processing(
        document_id=document_id,
        assessment_id=payload.assessment_id,
    )
    background_tasks.add_task(
        document_authenticity_service.run_processing_pipeline,
        document_id=document_id,
        ocr_engine=payload.ocr_engine,
        run_forensics=payload.run_forensics,
        run_signature_detection=payload.run_signature_detection,
    )

    log_audit_event(
        action="DOCUMENT_PROCESSING_QUEUED",
        actor_id=x_user_id,
        role=role.value,
        resource=f"patient_document:{document_id}",
        status="SUCCESS",
        details={"job_id": state["job_id"], "ocr_engine": payload.ocr_engine},
    )
    return DocumentProcessingStatusResponse(document_id=document_id, **state)


@router.get("/{document_id}/status", response_model=DocumentProcessingStatusResponse)
@router.get("/{document_id}/processing-status", response_model=DocumentProcessingStatusResponse)
def get_processing_status(
    document_id: str,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
):
    doc = document_authenticity_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    state = doc.get("processing_state") or {
        "job_id": "none",
        "processing_status": "UPLOADED",
        "engine_version": "ofphil-docproc-v2.0",
    }
    return DocumentProcessingStatusResponse(document_id=document_id, **state)


@router.get("/{document_id}/ocr", response_model=DocumentOCRResultResponse)
@router.get("/{document_id}/ocr-results", response_model=DocumentOCRResultResponse)
def get_ocr_results(
    document_id: str,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
):
    doc = document_authenticity_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    state = doc.get("processing_state") or {}
    ocr = doc.get("ocr_result") or {}
    return DocumentOCRResultResponse(
        document_id=document_id,
        job_id=state.get("job_id"),
        processing_status=state.get("processing_status", "UPLOADED"),
        status=ocr.get("status", "NOT_EVALUATED"),
        engine_used=ocr.get("engine_used", "PaddleOCR PP-OCRv6"),
        engine_version=ocr.get("engine_version", "ppocr-v6"),
        extracted_text=ocr.get("extracted_text"),
        confidence_score=ocr.get("confidence_score"),
        fields_detected=ocr.get("fields_detected", {}),
        missing_information=ocr.get("missing_information", []),
        unavailable_reason=ocr.get("unavailable_reason"),
    )


@router.get("/{document_id}/signature-results", response_model=DocumentSignatureResultResponse)
def get_signature_results(
    document_id: str,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
):
    doc = document_authenticity_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    state = doc.get("processing_state") or {}
    sig = doc.get("signature_result") or {}
    return DocumentSignatureResultResponse(
        document_id=document_id,
        job_id=state.get("job_id"),
        status=sig.get("status", "NOT_EVALUATED"),
        presence=sig.get("presence", False),
        signature_status=sig.get("signature_status", "NOT_EVALUATED"),
        signatures_detected_count=sig.get("signatures_detected_count", 0),
        regions=sig.get("regions", []),
        engine_version=sig.get("engine_version", "YOLO11s-OFPHIL"),
        details=sig.get("details"),
        disclaimer=sig.get("disclaimer", "Signature presence detection only; does not establish signer identity or signature authenticity."),
    )


@router.get("/{document_id}/stamp-results", response_model=DocumentStampResultResponse)
def get_stamp_results(
    document_id: str,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
):
    doc = document_authenticity_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    state = doc.get("processing_state") or {}
    stamp = doc.get("stamp_result") or {}
    return DocumentStampResultResponse(
        document_id=document_id,
        job_id=state.get("job_id"),
        status=stamp.get("status", "NOT_EVALUATED"),
        presence=stamp.get("presence", False),
        stamp_status=stamp.get("stamp_status", "NOT_EVALUATED"),
        stamps_detected_count=stamp.get("stamps_detected_count", 0),
        regions=stamp.get("regions", []),
        engine_version=stamp.get("engine_version", "YOLO11s-OFPHIL"),
        details=stamp.get("details"),
        disclaimer=stamp.get("disclaimer", "Stamp/seal screening only; does not establish official issuing authority legitimacy."),
    )


@router.get("/{document_id}/verification", response_model=DocumentVerificationResultResponse)
@router.get("/{document_id}/authenticity-results", response_model=DocumentVerificationResultResponse)
def get_verification_results(
    document_id: str,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
):
    doc = document_authenticity_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    state = doc.get("processing_state") or {}
    auth = doc.get("authenticity_result") or {}
    forensics = doc.get("forensics_result") or {}
    screening_status = auth.get("status") or doc.get("screening_status") or "NEEDS_VERIFICATION"
    tamper_risk = auth.get("tamper_risk") or doc.get("tamper_risk") or "UNDETERMINED"

    return DocumentVerificationResultResponse(
        document_id=document_id,
        job_id=state.get("job_id"),
        processing_status=state.get("processing_status", "UPLOADED"),
        document_type=doc.get("document_type", "general"),
        sha256=doc.get("sha256_hash", ""),
        status=screening_status,
        screening_status=screening_status,
        authenticity_classification=screening_status,
        tamper_risk=tamper_risk,
        tamper_risk_level=tamper_risk,
        reason=auth.get("reason") or "Evidence-based multi-factor forensic screening.",
        authenticity_summary=auth.get("authenticity_summary") or doc.get("authenticity_summary") or "Screening complete.",
        supporting_evidence=auth.get("supporting_evidence", []),
        confidence_assessment=auth.get("confidence_assessment", "MODERATE"),
        indicators=auth.get("indicators", {}),
        checks=forensics,
        unavailable_checks=auth.get("unavailable_checks", []),
        engine_version=auth.get("engine_version", "ofphil-docproc-v2.0"),
        disclaimer=auth.get("disclaimer", "Automated forensic screening provides evidence of integrity or anomalies."),
    )


@router.get("/{document_id}/report", response_model=DocumentStandardReportResponse)
def get_standard_report(
    document_id: str,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
):
    doc = document_authenticity_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    state = doc.get("processing_state") or {}
    auth = doc.get("authenticity_result") or {}
    forensics = doc.get("forensics_result") or {}
    sig = doc.get("signature_result") or {}
    stamp = doc.get("stamp_result") or {}
    ocr = doc.get("ocr_result") or {}
    review = doc.get("manual_review") or {"status": "PENDING_MSW_REVIEW"}

    checks_summary = {
        "ela": forensics.get("ela_analysis", {"status": "NOT_EVALUATED"}),
        "noise_analysis": forensics.get("noise_analysis", {"status": "NOT_EVALUATED"}),
        "chromatic_analysis": forensics.get("chromatic_analysis", {"status": "NOT_EVALUATED"}),
        "edge_analysis": forensics.get("edge_analysis", {"status": "NOT_EVALUATED"}),
        "copy_move": forensics.get("copy_move_analysis", {"status": "NOT_EVALUATED"}),
        "metadata": forensics.get("metadata_analysis", {"status": "NOT_EVALUATED"}),
        "resolution": forensics.get("resolution_analysis", {"status": "NOT_EVALUATED"}),
        "signature": {
            "status": sig.get("status", "NOT_EVALUATED"),
            "presence": sig.get("presence", False),
            "signature_status": sig.get("signature_status", "NOT_EVALUATED"),
            "authenticity": "NOT_EVALUATED",
            "details": sig.get("details"),
        },
        "stamp_seal": {
            "status": stamp.get("status", "NOT_EVALUATED"),
            "presence": stamp.get("presence", False),
            "stamp_status": stamp.get("stamp_status", "NOT_EVALUATED"),
            "legitimacy": "NOT_EVALUATED",
            "details": stamp.get("details"),
        },
        "ocr": {
            "status": ocr.get("status", "NOT_EVALUATED"),
            "engine": ocr.get("engine_used", "PaddleOCR PP-OCRv6"),
            "confidence": ocr.get("confidence_score"),
        },
    }

    return DocumentStandardReportResponse(
        document_id=document_id,
        processing_status=state.get("processing_status", "UPLOADED"),
        document_type=doc.get("document_type", "general"),
        sha256=doc.get("sha256_hash", ""),
        verification={
            "status": auth.get("status") or doc.get("screening_status") or "NEEDS_VERIFICATION",
            "tamper_risk": auth.get("tamper_risk") or doc.get("tamper_risk") or "UNDETERMINED",
            "reason": auth.get("reason", "Forensic evidence screening."),
            "summary": auth.get("authenticity_summary", ""),
            "supporting_evidence": auth.get("supporting_evidence", []),
        },
        checks=checks_summary,
        review=review,
    )


@router.post("/{document_id}/review", response_model=DocumentReviewResponse)
def review_document(
    document_id: str,
    payload: DocumentReviewRequest,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
    x_user_id: str = Header(default="msw_lead"),
):
    try:
        review = document_authenticity_service.record_manual_review(
            document_id=document_id,
            decision=payload.decision,
            review_notes=payload.review_notes,
            reviewer_id=x_user_id,
            reviewer_name=payload.reviewer_name or x_user_id,
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Document not found")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    log_audit_event(
        action="DOCUMENT_MANUAL_REVIEW",
        actor_id=x_user_id,
        role=role.value,
        resource=f"patient_document:{document_id}",
        status="SUCCESS",
        details={
            "decision": review["review_decision"],
            "reviewed_at": review["reviewed_at"],
        },
    )
    return DocumentReviewResponse(document_id=document_id, **review)


@router.delete("/{doc_id}")
def delete_document(
    doc_id: str,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
    x_user_id: str = Header(default="msw_lead"),
):
    try:
        result = document_authenticity_service.delete_document(
            document_id=doc_id,
            deleted_by=x_user_id,
            role=role.value,
        )
        log_audit_event(
            action="DOCUMENT_DELETE",
            actor_id=x_user_id,
            role=role.value,
            resource=f"patient_document:{doc_id}",
            status="SUCCESS",
            details={
                "document_id": doc_id,
                "patient_id": result["patient_id"],
                "filename": result["filename"],
                "sha256": result["sha256"],
            },
        )
        return {
            "status": "success",
            "message": f"Document {doc_id} ({result['filename']}) deleted successfully.",
            "audit_record": result,
        }
    except KeyError:
        raise HTTPException(status_code=404, detail="Document not found")


@router.delete("")
def clear_all_documents(
    role: UserRole = Depends(require_roles([UserRole.ADMIN])),
    x_user_id: str = Header(default="admin_lead"),
):
    count = len(document_authenticity_service._records)
    document_authenticity_service._records.clear()
    document_authenticity_service._save_registry()
    db_store.documents.clear()

    log_audit_event(
        action="ALL_DOCUMENTS_CLEARED",
        actor_id=x_user_id,
        role=role.value,
        resource="patient_documents:all",
        status="SUCCESS",
        details={"cleared_count": count},
    )
    return {"status": "success", "message": f"All {count} documents cleared successfully."}
