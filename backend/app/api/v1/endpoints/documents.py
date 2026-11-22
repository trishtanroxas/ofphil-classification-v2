from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from app.core.audit import log_audit_event
from app.core.rbac import UserRole, require_roles
from app.schemas.document_schemas import (
    DocumentAuthenticityResultResponse,
    DocumentOCRResultResponse,
    DocumentProcessRequest,
    DocumentProcessingStatusResponse,
    DocumentReviewRequest,
    DocumentReviewResponse,
    DocumentSignatureResultResponse,
)
from app.schemas.schemas import DocumentItem
from app.services.document_authenticity_service import document_authenticity_service
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

    # Log upload without logging document image or OCR text
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
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
    x_user_id: str = Header(default="msw_lead"),
):
    doc = document_authenticity_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    storage_path = Path(doc.get("storage_path", ""))
    if not storage_path.exists():
        raise HTTPException(status_code=404, detail="Original document file not found in secure storage")

    log_audit_event(
        action="DOCUMENT_DOWNLOAD",
        actor_id=x_user_id,
        role=role.value,
        resource=f"patient_document:{document_id}",
        status="SUCCESS",
        details={"patient_id": doc.get("patient_id"), "sha256": doc.get("sha256_hash")},
    )
    return FileResponse(
        path=str(storage_path),
        filename=doc.get("filename", "document"),
        media_type=doc.get("mime_type", "application/octet-stream"),
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
        "processing_status": "NOT_CHECKED",
        "engine_version": "ofphil-docauth-v2.0",
    }
    return DocumentProcessingStatusResponse(document_id=document_id, **state)


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
        processing_status=state.get("processing_status", "NOT_CHECKED"),
        engine_used=ocr.get("engine_used", "none"),
        engine_version=ocr.get("engine_version", "ofphil-ocr-v2.0"),
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
        signature_status=sig.get("signature_status", "NOT_CHECKED"),
        signatures_detected_count=sig.get("signatures_detected_count", 0),
        regions=sig.get("regions", []),
        engine_version=sig.get("engine_version", "ofphil-docauth-v2.0"),
    )


@router.get("/{document_id}/authenticity-results", response_model=DocumentAuthenticityResultResponse)
def get_authenticity_results(
    document_id: str,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
):
    doc = document_authenticity_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    state = doc.get("processing_state") or {}
    auth = doc.get("authenticity_result") or {}
    return DocumentAuthenticityResultResponse(
        document_id=document_id,
        job_id=state.get("job_id"),
        overall_status=auth.get("overall_status", "UNVERIFIABLE"),
        tamper_risk_level=auth.get("tamper_risk_level", "Not Checked"),
        indicators=auth.get("indicators", {}),
        unavailable_checks=auth.get("unavailable_checks", []),
        engine_version=auth.get("engine_version", "ofphil-docauth-v2.0"),
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
):
    if doc_id in document_authenticity_service._records:
        removed = document_authenticity_service._records.pop(doc_id)
        document_authenticity_service._save_registry()
        db_store.documents[:] = [d for d in db_store.documents if d.get("id") != doc_id]
        return {"status": "success", "message": f"Document {doc_id} deleted successfully.", "deleted": removed}
    raise HTTPException(status_code=404, detail="Document not found")


@router.delete("")
def clear_all_documents(
    role: UserRole = Depends(require_roles([UserRole.ADMIN])),
):
    document_authenticity_service._records.clear()
    document_authenticity_service._save_registry()
    db_store.documents.clear()
    return {"status": "success", "message": "All documents cleared successfully."}
