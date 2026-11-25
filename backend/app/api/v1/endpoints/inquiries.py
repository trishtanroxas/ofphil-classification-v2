"""
Database-backed Patient & Admin Inquiry, Attachment, Reply, and Notification Endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.core.audit import log_audit_event
from app.services.email_service import send_inquiry_reply_email, send_inquiry_submission_email
from app.services.inquiry_service import inquiry_service
from app.services.sms_service import send_sms_otp

router = APIRouter(prefix="/inquiries", tags=["Patient & Admin Inquiries"])


class InquiryStatusUpdatePayload(BaseModel):
    status: str = Field(..., min_length=1)


def _require_actor(x_user_role: Optional[str], x_user_id: Optional[str]):
    role = (x_user_role or "").strip().lower()
    uid = (x_user_id or "").strip()
    if not role or not uid:
        raise HTTPException(status_code=401, detail="Authentication headers (x-user-role, x-user-id) are required.")
    return role, uid


def _resolve_patient_from_registry(patient_id: str) -> dict:
    from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY

    for p in REGISTERED_PATIENTS_REGISTRY:
        if str(p.get("patient_id", "")).strip().upper() == patient_id.strip().upper():
            return p
    raise HTTPException(status_code=404, detail=f"Authenticated patient '{patient_id}' not found in registry.")


@router.post("")
async def submit_patient_inquiry(
    subject: str = Form(...),
    message: str = Form(...),
    files: Optional[List[UploadFile]] = File(default=None),
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
):
    """
    Submits a new inquiry with optional PDF/PNG/JPG attachments for the authenticated patient.
    Derives patient identity strictly from x-user-id and REGISTERED_PATIENTS_REGISTRY.
    """
    role, uid = _require_actor(x_user_role, x_user_id)
    if role != "patient":
        raise HTTPException(status_code=403, detail="Only authenticated patients can submit patient inquiries.")

    patient_rec = _resolve_patient_from_registry(uid)
    pid = patient_rec["patient_id"]
    full_name = f"{patient_rec.get('first_name', '')} {patient_rec.get('last_name', '')}".strip() or "Patient"
    email = str(patient_rec.get("email") or "").strip()
    contact = str(patient_rec.get("contact") or "").strip()

    created = await inquiry_service.create_patient_inquiry(
        patient_id=pid,
        patient_name=full_name,
        patient_email=email,
        patient_contact=contact,
        subject=subject,
        message=message,
        files=files,
    )

    log_audit_event(
        action="PATIENT_INQUIRY_SUBMITTED",
        actor_id=pid,
        role="patient",
        resource=f"inquiry:{created['id']}",
        status="SUCCESS",
        details={"attachments_count": len(created.get("attachments", []))},
    )

    # Non-blocking email notification
    email_sent = False
    if email and "@" in email:
        try:
            email_sent = send_inquiry_submission_email(
                inquiry_id=created["id"],
                sender_name=full_name,
                sender_email=email,
                subject_category=created["subject"],
                message_text=created["message"],
                attachment_names=[a["original_filename"] for a in created.get("attachments", [])],
            )
        except Exception:
            email_sent = False

    return {"status": "success", "inquiry": created, "email_sent": email_sent}


@router.get("/patient")
def get_my_patient_inquiries(
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
):
    """Returns all inquiries belonging exclusively to the authenticated patient."""
    role, uid = _require_actor(x_user_role, x_user_id)
    if role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can access their patient inquiry list.")
    items = inquiry_service.list_patient_inquiries(uid)
    return {"items": items, "total_count": len(items)}


@router.get("/admin")
def get_admin_inquiries(
    search: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    read_filter: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
):
    """Admin/Staff directory of all patient inquiries with search, filtering, and pagination."""
    role, _ = _require_actor(x_user_role, x_user_id)
    if role not in ("admin", "nurse", "msw"):
        raise HTTPException(status_code=403, detail="Unauthorized: Admin or clinical staff access required.")
    return inquiry_service.list_admin_inquiries(
        search=search,
        status_filter=status,
        read_filter=read_filter,
        page=page,
        page_size=page_size,
    )


@router.get("/notifications/list")
def list_inquiry_notifications(
    page: int = 1,
    page_size: int = 10,
    read_filter: str = "ALL",
    type_filter: str = "ALL",
    search: str = "",
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
):
    role, uid = _require_actor(x_user_role, x_user_id)
    if role not in ("patient", "admin", "nurse", "msw"):
        raise HTTPException(status_code=403, detail="Unauthorized role.")
    return inquiry_service.list_notifications(
        actor_role=role,
        actor_id=uid,
        page=page,
        page_size=page_size,
        read_filter=read_filter,
        type_filter=type_filter,
        search=search,
    )


@router.post("/notifications/mark-all-read")
def mark_all_inquiry_notifications_read(
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
):
    role, uid = _require_actor(x_user_role, x_user_id)
    return inquiry_service.mark_all_notifications_read(actor_role=role, actor_id=uid)


@router.post("/notifications/{notif_id}/read")
def mark_inquiry_notification_read(
    notif_id: str,
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
):
    role, uid = _require_actor(x_user_role, x_user_id)
    return inquiry_service.mark_notification_read(notif_id=notif_id, actor_role=role, actor_id=uid)


@router.delete("/notifications/all")
def delete_all_user_notifications(
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
):
    role, uid = _require_actor(x_user_role, x_user_id)
    return inquiry_service.delete_all_notifications(actor_role=role, actor_id=uid)


@router.delete("/notifications/{notif_id}")
def delete_single_user_notification(
    notif_id: str,
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
):
    role, uid = _require_actor(x_user_role, x_user_id)
    return inquiry_service.delete_notification(notif_id=notif_id, actor_role=role, actor_id=uid)


@router.get("/{inquiry_id}")
def get_inquiry_conversation(
    inquiry_id: str,
    mark_read: bool = Query(default=True),
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
):
    """
    Retrieves a single inquiry with attachments and replies.
    - When Admin opens it (mark_read=true), records Admin read status & timestamp.
    - When Patient opens it (mark_read=true), marks Admin reply as read by the Patient.
    """
    role, uid = _require_actor(x_user_role, x_user_id)
    return {"inquiry": inquiry_service.get_inquiry_detail(inquiry_id, actor_role=role, actor_id=uid, mark_read=mark_read)}


@router.post("/{inquiry_id}/reply")
async def reply_to_patient_inquiry_db(
    inquiry_id: str,
    message: str = Form(...),
    channel: str = Form(default="portal"),
    subject: Optional[str] = Form(default=None),
    admin_name: Optional[str] = Form(default="OFPHIL Clinic Administration"),
    files: Optional[List[UploadFile]] = File(default=None),
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
):
    """Saves an Admin reply to the database, updates status to ANSWERED, and notifies the patient."""
    role, uid = _require_actor(x_user_role, x_user_id)
    if role not in ("admin", "nurse", "msw"):
        raise HTTPException(status_code=403, detail="Only authorized Admin or clinical staff can reply to inquiries.")

    updated = await inquiry_service.reply_to_inquiry(
        inquiry_id=inquiry_id,
        admin_user_id=uid,
        admin_name=admin_name or "OFPHIL Clinic Administration",
        message=message,
        channel=channel,
        files=files,
    )

    log_audit_event(
        action="ADMIN_INQUIRY_REPLIED",
        actor_id=uid,
        role=role,
        resource=f"inquiry:{inquiry_id}",
        status="SUCCESS",
        details={"channel": channel},
    )

    # Optional external dispatch (email / SMS)
    dispatch_info = {"email_sent": False, "sms_sent": False}
    if channel == "email" and updated.get("patient_email"):
        try:
            dispatch_info["email_sent"] = send_inquiry_reply_email(
                to_email=updated["patient_email"],
                inquiry_id=inquiry_id,
                subject=subject or f"Re: {updated['subject']}",
                reply_body=message,
                patient_name=updated["patient_name"],
            )
        except Exception:
            pass
    elif channel == "sms" and updated.get("patient_contact"):
        try:
            ok_sms, _ = send_sms_otp(
                updated["patient_contact"],
                f"OFPHIL Clinic Reply ({inquiry_id}): {message[:120]}",
            )
            dispatch_info["sms_sent"] = ok_sms
        except Exception:
            pass

    return {"status": "success", "inquiry": updated, **dispatch_info}


@router.patch("/{inquiry_id}/status")
def update_inquiry_status_endpoint(
    inquiry_id: str,
    payload: InquiryStatusUpdatePayload,
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
):
    """Updates inquiry status (READ, IN_PROGRESS, ANSWERED, CLOSED). Admin/Staff only."""
    role, uid = _require_actor(x_user_role, x_user_id)
    if role not in ("admin", "nurse", "msw"):
        raise HTTPException(status_code=403, detail="Only authorized Admin or clinical staff can update inquiry status.")
    updated = inquiry_service.update_inquiry_status(
        inquiry_id=inquiry_id,
        new_status=payload.status,
        admin_user_id=uid,
        admin_name="OFPHIL Clinic Administration",
    )
    return {"status": "success", "inquiry": updated}


@router.get("/{inquiry_id}/attachments/{attachment_id}")
def get_inquiry_attachment_file(
    inquiry_id: str,
    attachment_id: str,
    download: bool = Query(default=False),
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
):
    """
    Securely serves an inquiry attachment after verifying ownership.
    - Patients can only access attachments on their own inquiries.
    - Admin/Staff can access attachments on any inquiry.
    """
    role, uid = _require_actor(x_user_role, x_user_id)
    file_path, media_type, orig_name = inquiry_service.get_attachment_for_download(
        inquiry_id=inquiry_id,
        attachment_id=attachment_id,
        actor_role=role,
        actor_id=uid,
    )
    disposition = "attachment" if download else "inline"
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        headers={"Content-Disposition": f'{disposition}; filename="{orig_name}"'},
    )
