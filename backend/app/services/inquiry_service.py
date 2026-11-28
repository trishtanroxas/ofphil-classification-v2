"""
Database-backed Patient & Admin Inquiry, Attachment, Reply, Read-Receipt, and Notification Service.
Uses SQLite (backend/storage/inquiries.db) with foreign keys and transactions, plus
secure non-public attachment storage under UPLOAD_STORAGE_DIR / "inquiries".
"""
import datetime
import math
import shutil
import sqlite3
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, UploadFile, status

from app.core.paths import STORAGE_DIR, UPLOAD_STORAGE_DIR
from app.services.file_security import sanitize_filename, validate_file_signature

INQUIRIES_DB_PATH = STORAGE_DIR / "inquiries.db"
INQUIRY_UPLOAD_DIR = UPLOAD_STORAGE_DIR / "inquiries"

ALLOWED_INQUIRY_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
ALLOWED_INQUIRY_MIMES = {"application/pdf", "image/png", "image/jpeg"}
MAX_FILES_PER_INQUIRY = 5
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_TOTAL_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB

VALID_INQUIRY_STATUSES = {"NEW", "READ", "IN_PROGRESS", "ANSWERED", "CLOSED"}


def _utc_now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _format_size(num_bytes: int) -> str:
    if num_bytes < 1024:
        return f"{num_bytes} B"
    if num_bytes < 1024 * 1024:
        return f"{num_bytes / 1024:.1f} KB"
    return f"{num_bytes / (1024 * 1024):.2f} MB"


class InquiryService:
    def __init__(self, db_path: Path = INQUIRIES_DB_PATH, upload_dir: Path = INQUIRY_UPLOAD_DIR) -> None:
        self.db_path = db_path
        self.upload_dir = upload_dir
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=15.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS inquiries (
                    id TEXT PRIMARY KEY,
                    patient_id TEXT NOT NULL,
                    patient_name TEXT NOT NULL,
                    patient_email TEXT NOT NULL DEFAULT '',
                    patient_contact TEXT NOT NULL DEFAULT '',
                    source TEXT NOT NULL DEFAULT 'patient_portal',
                    subject TEXT NOT NULL,
                    message TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'NEW',
                    admin_read INTEGER NOT NULL DEFAULT 0,
                    admin_read_at TEXT,
                    admin_read_by TEXT,
                    assigned_admin TEXT,
                    patient_has_unread_reply INTEGER NOT NULL DEFAULT 0,
                    patient_reply_read_at TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_inquiries_patient_id ON inquiries(patient_id);
                CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
                CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);

                CREATE TABLE IF NOT EXISTS inquiry_attachments (
                    id TEXT PRIMARY KEY,
                    inquiry_id TEXT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
                    reply_id TEXT,
                    uploader_role TEXT NOT NULL,
                    original_filename TEXT NOT NULL,
                    stored_filename TEXT NOT NULL,
                    content_type TEXT NOT NULL,
                    file_size INTEGER NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_att_inquiry_id ON inquiry_attachments(inquiry_id);

                CREATE TABLE IF NOT EXISTS inquiry_replies (
                    id TEXT PRIMARY KEY,
                    inquiry_id TEXT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
                    admin_user_id TEXT NOT NULL,
                    admin_name TEXT NOT NULL,
                    channel TEXT NOT NULL DEFAULT 'portal',
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_replies_inquiry_id ON inquiry_replies(inquiry_id);

                CREATE TABLE IF NOT EXISTS inquiry_read_receipts (
                    id TEXT PRIMARY KEY,
                    inquiry_id TEXT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
                    user_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    read_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_receipts_inquiry_id ON inquiry_read_receipts(inquiry_id);

                CREATE TABLE IF NOT EXISTS inquiry_notifications (
                    id TEXT PRIMARY KEY,
                    recipient_role TEXT NOT NULL,
                    recipient_id TEXT NOT NULL,
                    inquiry_id TEXT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
                    event_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    is_read INTEGER NOT NULL DEFAULT 0,
                    read_at TEXT,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_notif_recipient ON inquiry_notifications(recipient_role, recipient_id, is_read);

                CREATE TABLE IF NOT EXISTS msw_notifications (
                    id TEXT PRIMARY KEY,
                    recipient_user_id TEXT NOT NULL,
                    recipient_role TEXT NOT NULL DEFAULT 'msw',
                    notification_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    related_patient_id TEXT,
                    related_encounter_id TEXT,
                    related_assessment_id TEXT,
                    target_destination TEXT NOT NULL,
                    dedup_key TEXT UNIQUE,
                    is_read INTEGER NOT NULL DEFAULT 0,
                    read_at TEXT,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_msw_notif_recipient ON msw_notifications(recipient_role, recipient_user_id, is_read, created_at DESC);
                """
            )

    @staticmethod
    def _derive_patient_badge(row: Dict[str, Any]) -> str:
        st = row["status"]
        if st == "CLOSED":
            return "CLOSED"
        if row.get("patient_has_unread_reply"):
            return "UNREAD REPLY"
        if st == "ANSWERED" or (row.get("replies") and len(row["replies"]) > 0):
            return "ANSWERED"
        return "WAITING FOR RESPONSE"

    def _hydrate_inquiry(self, conn: sqlite3.Connection, row: sqlite3.Row) -> Dict[str, Any]:
        inq = dict(row)
        inq["admin_read"] = bool(inq["admin_read"])
        inq["patient_has_unread_reply"] = bool(inq["patient_has_unread_reply"])

        att_rows = conn.execute(
            "SELECT * FROM inquiry_attachments WHERE inquiry_id = ? ORDER BY created_at ASC",
            (inq["id"],),
        ).fetchall()
        attachments = []
        for a in att_rows:
            ad = dict(a)
            attachments.append(
                {
                    "id": ad["id"],
                    "inquiry_id": ad["inquiry_id"],
                    "reply_id": ad["reply_id"],
                    "uploader_role": ad["uploader_role"],
                    "original_filename": ad["original_filename"],
                    "content_type": ad["content_type"],
                    "file_type": "pdf" if ad["content_type"] == "application/pdf" else "image",
                    "file_size": ad["file_size"],
                    "file_size_display": _format_size(ad["file_size"]),
                    "created_at": ad["created_at"],
                }
            )

        rep_rows = conn.execute(
            "SELECT * FROM inquiry_replies WHERE inquiry_id = ? ORDER BY created_at ASC",
            (inq["id"],),
        ).fetchall()
        replies = []
        for r in rep_rows:
            rd = dict(r)
            rd["attachments"] = [a for a in attachments if a["reply_id"] == rd["id"]]
            replies.append(rd)

        inq["attachments"] = [a for a in attachments if a["reply_id"] is None]
        inq["all_attachments_count"] = len(attachments)
        inq["replies"] = replies
        inq["patient_badge"] = self._derive_patient_badge(inq)
        return inq

    async def _validate_and_read_uploads(
        self, files: Optional[List[UploadFile]]
    ) -> List[Dict[str, Any]]:
        if not files:
            return []
        non_empty = [f for f in files if f and f.filename]
        if len(non_empty) > MAX_FILES_PER_INQUIRY:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum {MAX_FILES_PER_INQUIRY} files allowed per inquiry.",
            )

        parsed: List[Dict[str, Any]] = []
        total_bytes = 0
        for uf in non_empty:
            raw_name = sanitize_filename(uf.filename or "attachment")
            ext = Path(raw_name).suffix.lower()
            if ext not in ALLOWED_INQUIRY_EXTENSIONS:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail=f"Unsupported file '{raw_name}'. Allowed formats: PDF, PNG, JPG/JPEG.",
                )
            content = await uf.read()
            size = len(content)
            if size == 0:
                raise HTTPException(status_code=400, detail=f"File '{raw_name}' is empty.")
            if size > MAX_FILE_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File '{raw_name}' exceeds the 5 MB per-file limit.",
                )
            total_bytes += size
            if total_bytes > MAX_TOTAL_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Total attachment size exceeds the 25 MB per-inquiry limit.",
                )
            detected_mime = validate_file_signature(content)
            if detected_mime not in ALLOWED_INQUIRY_MIMES:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail=f"File '{raw_name}' content does not match PDF, PNG, or JPG/JPEG.",
                )
            parsed.append(
                {
                    "original_filename": raw_name,
                    "ext": ext,
                    "content_type": detected_mime,
                    "file_size": size,
                    "bytes": content,
                }
            )
        return parsed

    def _save_attachments_to_disk_and_db(
        self,
        conn: sqlite3.Connection,
        inquiry_id: str,
        parsed_files: List[Dict[str, Any]],
        uploader_role: str,
        reply_id: Optional[str] = None,
        created_at: Optional[str] = None,
    ) -> List[Path]:
        written_paths: List[Path] = []
        if not parsed_files:
            return written_paths

        target_dir = self.upload_dir / inquiry_id
        target_dir.mkdir(parents=True, exist_ok=True)
        ts = created_at or _utc_now_iso()

        for item in parsed_files:
            att_id = f"ATT-{uuid.uuid4().hex[:10].upper()}"
            stored_name = f"{uuid.uuid4().hex}{item['ext']}"
            dest = target_dir / stored_name
            dest.write_bytes(item["bytes"])
            written_paths.append(dest)

            conn.execute(
                """
                INSERT INTO inquiry_attachments
                    (id, inquiry_id, reply_id, uploader_role, original_filename, stored_filename, content_type, file_size, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    att_id,
                    inquiry_id,
                    reply_id,
                    uploader_role,
                    item["original_filename"],
                    stored_name,
                    item["content_type"],
                    item["file_size"],
                    ts,
                ),
            )
        return written_paths

    async def create_patient_inquiry(
        self,
        patient_id: str,
        patient_name: str,
        patient_email: str,
        patient_contact: str,
        subject: str,
        message: str,
        files: Optional[List[UploadFile]] = None,
    ) -> Dict[str, Any]:
        subj = (subject or "").strip()
        msg = (message or "").strip()
        if not subj:
            raise HTTPException(status_code=422, detail="Inquiry subject is required.")
        if not msg:
            raise HTTPException(status_code=422, detail="Inquiry message is required.")

        parsed_files = await self._validate_and_read_uploads(files)
        inq_id = f"INQ-{datetime.datetime.now().strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"
        now = _utc_now_iso()
        written_paths: List[Path] = []

        try:
            with self._connect() as conn:
                conn.execute(
                    """
                    INSERT INTO inquiries
                        (id, patient_id, patient_name, patient_email, patient_contact, source, subject, message,
                         status, admin_read, patient_has_unread_reply, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, 'patient_portal', ?, ?, 'NEW', 0, 0, ?, ?)
                    """,
                    (inq_id, patient_id, patient_name, patient_email, patient_contact, subj, msg, now, now),
                )
                written_paths = self._save_attachments_to_disk_and_db(
                    conn=conn,
                    inquiry_id=inq_id,
                    parsed_files=parsed_files,
                    uploader_role="patient",
                    reply_id=None,
                    created_at=now,
                )
                notif_id = f"NTF-{uuid.uuid4().hex[:10].upper()}"
                conn.execute(
                    """
                    INSERT INTO inquiry_notifications
                        (id, recipient_role, recipient_id, inquiry_id, event_type, title, message, is_read, created_at)
                    VALUES (?, 'admin', 'admin', ?, 'NEW_INQUIRY', ?, ?, 0, ?)
                    """,
                    (
                        notif_id,
                        inq_id,
                        f"New Patient Inquiry: {subj}",
                        f"{patient_name} ({patient_id}) submitted inquiry {inq_id}.",
                        now,
                    ),
                )
                # Also emit MSW notification for the patient's assigned MSW
                assigned_msw_uid = "msw_lead"
                try:
                    from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY
                    for p in REGISTERED_PATIENTS_REGISTRY:
                        if str(p.get("patient_id") or "").strip().upper() == str(patient_id).strip().upper():
                            raw_msw = str(p.get("assigned_msw") or "msw_lead")
                            if "(" in raw_msw and ")" in raw_msw:
                                assigned_msw_uid = raw_msw.split("(")[-1].split(")")[0].strip() or "msw_lead"
                            elif raw_msw.strip():
                                assigned_msw_uid = "msw_lead" if "maria santos" in raw_msw.lower() else raw_msw.strip()
                            break
                except Exception:
                    assigned_msw_uid = "msw_lead"

                msw_notif_id = f"MSWN-{uuid.uuid4().hex[:10].upper()}"
                conn.execute(
                    """
                    INSERT OR IGNORE INTO msw_notifications
                        (id, recipient_user_id, recipient_role, notification_type, title, message,
                         related_patient_id, related_encounter_id, related_assessment_id,
                         target_destination, dedup_key, is_read, created_at)
                    VALUES (?, ?, 'msw', 'PATIENT_INQUIRY', ?, ?, ?, NULL, NULL, ?, ?, 0, ?)
                    """,
                    (
                        msw_notif_id,
                        assigned_msw_uid,
                        f"Patient Inquiry Requires MSW Attention: {subj}",
                        f"{patient_name} ({patient_id}) submitted inquiry {inq_id}: {msg[:110]}",
                        patient_id,
                        f"/patients/{patient_id}?tab=inquiries&inquiry_id={inq_id}",
                        f"INQ:{inq_id}:{assigned_msw_uid}",
                        now,
                    ),
                )
                conn.commit()
                row = conn.execute("SELECT * FROM inquiries WHERE id = ?", (inq_id,)).fetchone()
                return self._hydrate_inquiry(conn, row)
        except HTTPException:
            raise
        except Exception as exc:
            for p in written_paths:
                try:
                    p.unlink(missing_ok=True)
                except Exception:
                    pass
            raise HTTPException(status_code=500, detail=f"Failed to save inquiry: {exc}")

    def list_patient_inquiries(self, patient_id: str) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM inquiries WHERE UPPER(patient_id) = UPPER(?) ORDER BY created_at DESC",
                (patient_id.strip(),),
            ).fetchall()
            return [self._hydrate_inquiry(conn, r) for r in rows]

    def list_admin_inquiries(
        self,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        read_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        where_clauses: List[str] = []
        params: List[Any] = []

        if status_filter and status_filter.upper() != "ALL":
            where_clauses.append("status = ?")
            params.append(status_filter.upper())

        if read_filter == "unread":
            where_clauses.append("admin_read = 0")
        elif read_filter == "read":
            where_clauses.append("admin_read = 1")

        if search and search.strip():
            q = f"%{search.strip().lower()}%"
            where_clauses.append(
                "(LOWER(id) LIKE ? OR LOWER(patient_id) LIKE ? OR LOWER(patient_name) LIKE ? OR LOWER(subject) LIKE ?)"
            )
            params.extend([q, q, q, q])

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        offset = max(0, (max(1, page) - 1) * max(1, page_size))

        with self._connect() as conn:
            total_count = conn.execute(
                f"SELECT COUNT(*) FROM inquiries {where_sql}", params
            ).fetchone()[0]
            unread_count = conn.execute(
                "SELECT COUNT(*) FROM inquiries WHERE admin_read = 0"
            ).fetchone()[0]
            rows = conn.execute(
                f"SELECT * FROM inquiries {where_sql} ORDER BY created_at DESC LIMIT ? OFFSET ?",
                [*params, page_size, offset],
            ).fetchall()
            items = [self._hydrate_inquiry(conn, r) for r in rows]

        return {
            "items": items,
            "total_count": total_count,
            "unread_count": unread_count,
            "page": max(1, page),
            "page_size": max(1, page_size),
        }

    def get_inquiry_detail(
        self,
        inquiry_id: str,
        actor_role: str,
        actor_id: str,
        mark_read: bool = True,
    ) -> Dict[str, Any]:
        now = _utc_now_iso()
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM inquiries WHERE id = ?", (inquiry_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Inquiry not found.")

            if actor_role == "patient":
                if str(row["patient_id"]).strip().upper() != actor_id.strip().upper():
                    raise HTTPException(status_code=403, detail="Unauthorized: you can only view your own inquiries.")
                if mark_read and row["patient_has_unread_reply"]:
                    conn.execute(
                        "UPDATE inquiries SET patient_has_unread_reply = 0, patient_reply_read_at = ? WHERE id = ?",
                        (now, inquiry_id),
                    )
                    conn.execute(
                        """
                        INSERT INTO inquiry_read_receipts (id, inquiry_id, user_id, role, read_at)
                        VALUES (?, ?, ?, 'patient', ?)
                        """,
                        (f"RCP-{uuid.uuid4().hex[:10].upper()}", inquiry_id, actor_id, now),
                    )
                    conn.execute(
                        """
                        UPDATE inquiry_notifications
                        SET is_read = 1, read_at = ?
                        WHERE inquiry_id = ? AND recipient_role = 'patient' AND UPPER(recipient_id) = UPPER(?) AND is_read = 0
                        """,
                        (now, inquiry_id, actor_id),
                    )
                    conn.commit()
                    row = conn.execute("SELECT * FROM inquiries WHERE id = ?", (inquiry_id,)).fetchone()
            elif actor_role in ("admin", "nurse", "msw"):
                if mark_read and not row["admin_read"]:
                    next_status = "READ" if row["status"] == "NEW" else row["status"]
                    conn.execute(
                        """
                        UPDATE inquiries
                        SET admin_read = 1, admin_read_at = ?, admin_read_by = ?, status = ?, updated_at = ?
                        WHERE id = ?
                        """,
                        (now, actor_id, next_status, now, inquiry_id),
                    )
                    conn.execute(
                        """
                        INSERT INTO inquiry_read_receipts (id, inquiry_id, user_id, role, read_at)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (f"RCP-{uuid.uuid4().hex[:10].upper()}", inquiry_id, actor_id, actor_role, now),
                    )
                    conn.execute(
                        """
                        UPDATE inquiry_notifications
                        SET is_read = 1, read_at = ?
                        WHERE inquiry_id = ? AND recipient_role = 'admin' AND is_read = 0
                        """,
                        (now, inquiry_id),
                    )
                    conn.commit()
                    row = conn.execute("SELECT * FROM inquiries WHERE id = ?", (inquiry_id,)).fetchone()
            else:
                raise HTTPException(status_code=403, detail="Unauthorized role.")

            return self._hydrate_inquiry(conn, row)

    async def reply_to_inquiry(
        self,
        inquiry_id: str,
        admin_user_id: str,
        admin_name: str,
        message: str,
        channel: str = "portal",
        files: Optional[List[UploadFile]] = None,
    ) -> Dict[str, Any]:
        msg = (message or "").strip()
        if not msg:
            raise HTTPException(status_code=422, detail="Reply message cannot be empty.")

        parsed_files = await self._validate_and_read_uploads(files)
        now = _utc_now_iso()
        rep_id = f"REP-{uuid.uuid4().hex[:10].upper()}"
        written_paths: List[Path] = []

        try:
            with self._connect() as conn:
                row = conn.execute("SELECT * FROM inquiries WHERE id = ?", (inquiry_id,)).fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Inquiry not found.")

                conn.execute(
                    """
                    INSERT INTO inquiry_replies (id, inquiry_id, admin_user_id, admin_name, channel, message, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (rep_id, inquiry_id, admin_user_id, admin_name, channel, msg, now),
                )
                written_paths = self._save_attachments_to_disk_and_db(
                    conn=conn,
                    inquiry_id=inquiry_id,
                    parsed_files=parsed_files,
                    uploader_role="admin",
                    reply_id=rep_id,
                    created_at=now,
                )
                conn.execute(
                    """
                    UPDATE inquiries
                    SET status = 'ANSWERED',
                        admin_read = 1,
                        admin_read_at = COALESCE(admin_read_at, ?),
                        admin_read_by = COALESCE(admin_read_by, ?),
                        assigned_admin = ?,
                        patient_has_unread_reply = 1,
                        updated_at = ?
                    WHERE id = ?
                    """,
                    (now, admin_user_id, admin_name, now, inquiry_id),
                )
                conn.execute(
                    """
                    INSERT INTO inquiry_notifications
                        (id, recipient_role, recipient_id, inquiry_id, event_type, title, message, is_read, created_at)
                    VALUES (?, 'patient', ?, ?, 'ADMIN_REPLY', ?, ?, 0, ?)
                    """,
                    (
                        f"NTF-{uuid.uuid4().hex[:10].upper()}",
                        row["patient_id"],
                        inquiry_id,
                        f"Clinic Reply: {row['subject']}",
                        f"{admin_name} replied to your inquiry ({inquiry_id}).",
                        now,
                    ),
                )
                conn.commit()
                updated_row = conn.execute("SELECT * FROM inquiries WHERE id = ?", (inquiry_id,)).fetchone()
                return self._hydrate_inquiry(conn, updated_row)
        except HTTPException:
            raise
        except Exception as exc:
            for p in written_paths:
                try:
                    p.unlink(missing_ok=True)
                except Exception:
                    pass
            raise HTTPException(status_code=500, detail=f"Failed to save reply: {exc}")

    def update_inquiry_status(
        self,
        inquiry_id: str,
        new_status: str,
        admin_user_id: str,
        admin_name: str,
    ) -> Dict[str, Any]:
        st = (new_status or "").strip().upper()
        if st not in VALID_INQUIRY_STATUSES:
            raise HTTPException(status_code=422, detail=f"Invalid status '{new_status}'.")
        now = _utc_now_iso()
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM inquiries WHERE id = ?", (inquiry_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Inquiry not found.")

            conn.execute(
                """
                UPDATE inquiries
                SET status = ?,
                    admin_read = 1,
                    admin_read_at = COALESCE(admin_read_at, ?),
                    admin_read_by = COALESCE(admin_read_by, ?),
                    assigned_admin = COALESCE(assigned_admin, ?),
                    updated_at = ?
                WHERE id = ?
                """,
                (st, now, admin_user_id, admin_name, now, inquiry_id),
            )
            if st in ("IN_PROGRESS", "CLOSED"):
                conn.execute(
                    """
                    INSERT INTO inquiry_notifications
                        (id, recipient_role, recipient_id, inquiry_id, event_type, title, message, is_read, created_at)
                    VALUES (?, 'patient', ?, ?, 'STATUS_CHANGE', ?, ?, 0, ?)
                    """,
                    (
                        f"NTF-{uuid.uuid4().hex[:10].upper()}",
                        row["patient_id"],
                        inquiry_id,
                        f"Inquiry Status Updated: {st.replace('_', ' ')}",
                        f"Your inquiry '{row['subject']}' ({inquiry_id}) is now {st.replace('_', ' ')}.",
                        now,
                    ),
                )
            conn.commit()
            updated_row = conn.execute("SELECT * FROM inquiries WHERE id = ?", (inquiry_id,)).fetchone()
            return self._hydrate_inquiry(conn, updated_row)

    def get_attachment_for_download(
        self,
        inquiry_id: str,
        attachment_id: str,
        actor_role: str,
        actor_id: str,
    ) -> Tuple[Path, str, str]:
        with self._connect() as conn:
            inq = conn.execute("SELECT patient_id FROM inquiries WHERE id = ?", (inquiry_id,)).fetchone()
            if not inq:
                raise HTTPException(status_code=404, detail="Inquiry not found.")

            if actor_role == "patient":
                if str(inq["patient_id"]).strip().upper() != actor_id.strip().upper():
                    raise HTTPException(status_code=403, detail="Unauthorized: cannot access another patient's attachment.")
            elif actor_role not in ("admin", "nurse", "msw"):
                raise HTTPException(status_code=403, detail="Unauthorized role.")

            att = conn.execute(
                "SELECT * FROM inquiry_attachments WHERE id = ? AND inquiry_id = ?",
                (attachment_id, inquiry_id),
            ).fetchone()
            if not att:
                raise HTTPException(status_code=404, detail="Attachment not found.")

            file_path = (self.upload_dir / inquiry_id / att["stored_filename"]).resolve()
            base_resolved = self.upload_dir.resolve()
            if base_resolved not in file_path.parents or not file_path.exists():
                raise HTTPException(status_code=404, detail="Attachment file missing on server.")

            return (file_path, att["content_type"], att["original_filename"])

    @staticmethod
    def resolve_msw_user_id(raw_assigned_msw: Optional[str]) -> str:
        raw = str(raw_assigned_msw or "").strip()
        if not raw:
            return "msw_lead"
        if "(" in raw and ")" in raw:
            extracted = raw.split("(")[-1].split(")")[0].strip()
            if extracted:
                return extracted
        if "maria santos" in raw.lower() or "msw_lead" in raw.lower():
            return "msw_lead"
        return raw

    def create_msw_notification(
        self,
        recipient_user_id: str,
        notification_type: str,
        title: str,
        message: str,
        target_destination: str,
        related_patient_id: Optional[str] = None,
        related_encounter_id: Optional[str] = None,
        related_assessment_id: Optional[str] = None,
        dedup_key: Optional[str] = None,
        created_at: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        uid = self.resolve_msw_user_id(recipient_user_id)
        ts = created_at or _utc_now_iso()
        notif_id = f"MSWN-{uuid.uuid4().hex[:10].upper()}"
        with self._connect() as conn:
            if dedup_key:
                existing = conn.execute(
                    "SELECT * FROM msw_notifications WHERE dedup_key = ?",
                    (dedup_key,),
                ).fetchone()
                if existing:
                    return {**dict(existing), "is_read": bool(existing["is_read"])}

            conn.execute(
                """
                INSERT OR IGNORE INTO msw_notifications
                    (id, recipient_user_id, recipient_role, notification_type, title, message,
                     related_patient_id, related_encounter_id, related_assessment_id,
                     target_destination, dedup_key, is_read, created_at)
                VALUES (?, ?, 'msw', ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
                """,
                (
                    notif_id,
                    uid,
                    notification_type,
                    title,
                    message,
                    related_patient_id,
                    related_encounter_id,
                    related_assessment_id,
                    target_destination,
                    dedup_key,
                    ts,
                ),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM msw_notifications WHERE id = ?", (notif_id,)).fetchone()
            if not row and dedup_key:
                row = conn.execute("SELECT * FROM msw_notifications WHERE dedup_key = ?", (dedup_key,)).fetchone()
            return {**dict(row), "is_read": bool(row["is_read"])} if row else None

    def sync_msw_notifications_from_records(self, msw_user_id: str) -> None:
        """
        Idempotently synchronizes notifications from actual database/registry records assigned to msw_user_id.
        Uses deterministic dedup_key so once a notification is created (and even after it is marked read),
        it is never duplicated on page refresh or re-login.
        """
        target_uid = self.resolve_msw_user_id(msw_user_id).lower()
        try:
            from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY
            from app.services.assessment_service import assessment_service
            from app.services.document_authenticity_service import document_authenticity_service
        except Exception:
            return

        assigned_patient_ids = set()

        for p in REGISTERED_PATIENTS_REGISTRY:
            pid = str(p.get("patient_id") or "").strip()
            if not pid:
                continue
            p_msw = self.resolve_msw_user_id(p.get("assigned_msw")).lower()
            if p_msw != target_uid:
                continue
            assigned_patient_ids.add(pid.upper())

            full_name = f"{p.get('first_name', '')} {p.get('middle_name', '')} {p.get('last_name', '')} {p.get('suffix', '')}".replace("  ", " ").strip()
            cat = str(p.get("category") or "REGULAR").upper()
            st = str(p.get("status") or "PENDING").upper()
            reg_date = str(p.get("registration_date") or "2026-11-22")
            diag = str(p.get("diagnosis") or "Ophthalmic Clinical Evaluation")

            if st == "PENDING":
                self.create_msw_notification(
                    recipient_user_id=p_msw,
                    notification_type="APPLICATION_PENDING_ASSESSMENT",
                    title=f"Pending MSW Assessment: {full_name}",
                    message=f"Charity application {pid} ({diag}) is assigned to you and awaiting MSW socio-economic assessment.",
                    target_destination=f"/patients/{pid}?tab=assessment",
                    related_patient_id=pid,
                    dedup_key=f"SEED:PATIENT_PENDING:{pid}:{p_msw}",
                    created_at=f"{reg_date}T09:15:00+00:00" if "T" not in reg_date else reg_date,
                )
            elif "DISAPPROVED" in st or "PROMISSORY" in st:
                self.create_msw_notification(
                    recipient_user_id=p_msw,
                    notification_type="CHARITY_DENIED_OR_PROMISSORY",
                    title=f"Promissory / Disapproved Case Review: {full_name}",
                    message=f"Charity case {pid} ({diag}) is marked {st}. Open the patient dossier to review promissory arrangement and assessment status.",
                    target_destination=f"/patients/{pid}?tab=assessment",
                    related_patient_id=pid,
                    dedup_key=f"SEED:PATIENT_PROMISSORY:{pid}:{p_msw}",
                    created_at=f"{reg_date}T10:30:00+00:00" if "T" not in reg_date else reg_date,
                )
            elif cat == "CHARITY" and st == "APPROVED":
                self.create_msw_notification(
                    recipient_user_id=p_msw,
                    notification_type="CHARITY_APPROVED",
                    title=f"Charity Grant Approved: {full_name}",
                    message=f"Charity case {pid} ({diag}) has an approved charity eligibility status in your assigned caseload.",
                    target_destination=f"/patients/{pid}?tab=assessment",
                    related_patient_id=pid,
                    dedup_key=f"SEED:PATIENT_APPROVED:{pid}:{p_msw}",
                    created_at=f"{reg_date}T11:00:00+00:00" if "T" not in reg_date else reg_date,
                )
            elif pid == "M26-11-00001":
                self.create_msw_notification(
                    recipient_user_id=p_msw,
                    notification_type="REFERRAL_UPDATED",
                    title=f"Medical Assistance Referral Endorsed: {full_name}",
                    message=f"Clinical referral OFPHIL-FA-2026-0001 for {full_name} ({pid}) was endorsed for MSW medical assistance review.",
                    target_destination=f"/patients/{pid}?tab=referral",
                    related_patient_id=pid,
                    related_encounter_id="OFPHIL-FA-2026-0001",
                    dedup_key=f"SEED:REFERRAL:OFPHIL-FA-2026-0001:{p_msw}",
                    created_at="2026-11-22T08:30:00+00:00",
                )

        # Sync existing assessments for assigned patients or created by this MSW
        try:
            for asmt in assessment_service.list_assessments():
                aid = str(asmt.get("id") or "")
                apid = str(asmt.get("patient_id") or "")
                enc_no = str(asmt.get("encounter_no") or "")
                w_status = str(asmt.get("workflow_status") or "DRAFT")
                c_by = self.resolve_msw_user_id(asmt.get("created_by")).lower()
                if c_by != target_uid and apid.upper() not in assigned_patient_ids:
                    continue
                updated_at = str(asmt.get("updated_at") or _utc_now_iso())
                if w_status in ("DRAFT", "ASSESSMENT_IN_PROGRESS"):
                    self.create_msw_notification(
                        recipient_user_id=target_uid,
                        notification_type="ASSESSMENT_DRAFT_SAVED",
                        title=f"Assessment Draft in Progress ({apid})",
                        message=f"Assessment {aid} (Stage {asmt.get('active_stage', 1)} of 4) is saved as {w_status.replace('_', ' ')}.",
                        target_destination=f"/patients/{apid}?tab=assessment",
                        related_patient_id=apid,
                        related_encounter_id=enc_no,
                        related_assessment_id=aid,
                        dedup_key=f"ASMT_STATE:{aid}:{w_status}:{target_uid}",
                        created_at=updated_at,
                    )
                else:
                    self.create_msw_notification(
                        recipient_user_id=target_uid,
                        notification_type="ASSESSMENT_SUBMITTED",
                        title=f"Assessment Status: {w_status.replace('_', ' ')} ({apid})",
                        message=f"Assessment {aid} for patient {apid} is currently {w_status.replace('_', ' ')}.",
                        target_destination=f"/patients/{apid}?tab=assessment",
                        related_patient_id=apid,
                        related_encounter_id=enc_no,
                        related_assessment_id=aid,
                        dedup_key=f"ASMT_STATE:{aid}:{w_status}:{target_uid}",
                        created_at=updated_at,
                    )
        except Exception:
            pass

        # Sync existing uploaded documents for assigned patients
        try:
            for doc in document_authenticity_service.list_documents():
                did = str(doc.get("id") or "")
                dpid = str(doc.get("patient_id") or "")
                dtype = str(doc.get("document_type") or "Supporting Document")
                up_by = self.resolve_msw_user_id(doc.get("uploaded_by")).lower()
                if up_by != target_uid and dpid.upper() not in assigned_patient_ids:
                    continue
                self.create_msw_notification(
                    recipient_user_id=target_uid,
                    notification_type="DOCUMENT_UPLOADED",
                    title=f"Supporting Document Uploaded ({dpid})",
                    message=f"{dtype} ({doc.get('filename', did)}) is linked to patient {dpid}.",
                    target_destination=f"/patients/{dpid}?tab=documents",
                    related_patient_id=dpid,
                    related_assessment_id=doc.get("assessment_id"),
                    dedup_key=f"DOC_UPLOAD:{did}:{target_uid}",
                    created_at=str(doc.get("upload_date") or _utc_now_iso()),
                )
        except Exception:
            pass

    def list_notifications(
        self,
        actor_role: str,
        actor_id: str,
        page: int = 1,
        page_size: int = 10,
        read_filter: str = "ALL",
        type_filter: str = "ALL",
        search: str = "",
    ) -> Dict[str, Any]:
        role_norm = (actor_role or "").strip().lower()
        uid_norm = (actor_id or "").strip()
        p = max(1, int(page or 1))
        ps = max(1, min(100, int(page_size or 10)))
        offset = (p - 1) * ps

        if role_norm == "msw":
            resolved_uid = self.resolve_msw_user_id(uid_norm)
            self.sync_msw_notifications_from_records(resolved_uid)
            with self._connect() as conn:
                # Count total unread for badge
                unread_row = conn.execute(
                    """
                    SELECT COUNT(*) as unread
                    FROM msw_notifications
                    WHERE recipient_role = 'msw'
                      AND (LOWER(recipient_user_id) = LOWER(?) OR UPPER(recipient_user_id) = 'ALL_MSW')
                      AND is_read = 0
                    """,
                    (resolved_uid,),
                ).fetchone()
                total_unread = int(unread_row["unread"] or 0) if unread_row else 0

                # Build filtered query
                where_clauses = [
                    "recipient_role = 'msw'",
                    "(LOWER(recipient_user_id) = LOWER(?) OR UPPER(recipient_user_id) = 'ALL_MSW')",
                ]
                params: List[Any] = [resolved_uid]

                if read_filter.upper() == "UNREAD":
                    where_clauses.append("is_read = 0")
                elif read_filter.upper() == "READ":
                    where_clauses.append("is_read = 1")

                if type_filter and type_filter.upper() != "ALL":
                    where_clauses.append("notification_type = ?")
                    params.append(type_filter)

                if search and search.strip():
                    q = f"%{search.strip().lower()}%"
                    where_clauses.append(
                        "(LOWER(title) LIKE ? OR LOWER(message) LIKE ? OR LOWER(COALESCE(related_patient_id, '')) LIKE ? OR LOWER(COALESCE(related_encounter_id, '')) LIKE ?)"
                    )
                    params.extend([q, q, q, q])

                where_sql = " AND ".join(where_clauses)

                # Total count for matching filter
                count_query = f"SELECT COUNT(*) as total FROM msw_notifications WHERE {where_sql}"
                count_row = conn.execute(count_query, params).fetchone()
                total_count = int(count_row["total"] or 0) if count_row else 0

                # Page rows
                page_query = f"""
                    SELECT * FROM msw_notifications
                    WHERE {where_sql}
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                """
                page_params = list(params) + [ps, offset]
                rows = conn.execute(page_query, page_params).fetchall()

                items = [
                    {
                        **dict(r),
                        "event_type": r["notification_type"],
                        "is_read": bool(r["is_read"]),
                    }
                    for r in rows
                ]
                total_pages = max(1, math.ceil(total_count / ps))
                return {
                    "items": items,
                    "unread_count": total_unread,
                    "total_count": total_count,
                    "page": p,
                    "page_size": ps,
                    "total_pages": total_pages,
                }

        target_role = "patient" if role_norm == "patient" else "admin"
        with self._connect() as conn:
            if target_role == "patient":
                unread_row = conn.execute(
                    "SELECT COUNT(*) as unread FROM inquiry_notifications WHERE recipient_role = 'patient' AND UPPER(recipient_id) = UPPER(?) AND is_read = 0",
                    (uid_norm,),
                ).fetchone()
                total_unread = int(unread_row["unread"] or 0) if unread_row else 0

                count_row = conn.execute(
                    "SELECT COUNT(*) as total FROM inquiry_notifications WHERE recipient_role = 'patient' AND UPPER(recipient_id) = UPPER(?)",
                    (uid_norm,),
                ).fetchone()
                total_count = int(count_row["total"] or 0) if count_row else 0

                rows = conn.execute(
                    """
                    SELECT * FROM inquiry_notifications
                    WHERE recipient_role = 'patient' AND UPPER(recipient_id) = UPPER(?)
                    ORDER BY created_at DESC LIMIT ? OFFSET ?
                    """,
                    (uid_norm, ps, offset),
                ).fetchall()
            else:
                unread_row = conn.execute(
                    "SELECT COUNT(*) as unread FROM inquiry_notifications WHERE recipient_role = 'admin' AND is_read = 0"
                ).fetchone()
                total_unread = int(unread_row["unread"] or 0) if unread_row else 0

                count_row = conn.execute(
                    "SELECT COUNT(*) as total FROM inquiry_notifications WHERE recipient_role = 'admin'"
                ).fetchone()
                total_count = int(count_row["total"] or 0) if count_row else 0

                rows = conn.execute(
                    """
                    SELECT * FROM inquiry_notifications
                    WHERE recipient_role = 'admin'
                    ORDER BY created_at DESC LIMIT ? OFFSET ?
                    """,
                    (ps, offset),
                ).fetchall()

            items = [{**dict(r), "is_read": bool(r["is_read"])} for r in rows]
            total_pages = max(1, math.ceil(total_count / ps))
            return {
                "items": items,
                "unread_count": total_unread,
                "total_count": total_count,
                "page": p,
                "page_size": ps,
                "total_pages": total_pages,
            }

    def mark_notification_read(self, notif_id: str, actor_role: str, actor_id: str) -> Dict[str, Any]:
        now = _utc_now_iso()
        role_norm = (actor_role or "").strip().lower()
        uid_norm = (actor_id or "").strip()

        with self._connect() as conn:
            if role_norm == "msw" or notif_id.startswith("MSWN-"):
                if role_norm != "msw":
                    raise HTTPException(status_code=403, detail="Unauthorized: MSW role required.")
                msw_row = conn.execute("SELECT * FROM msw_notifications WHERE id = ?", (notif_id,)).fetchone()
                if not msw_row:
                    raise HTTPException(status_code=404, detail="MSW Notification not found.")
                resolved_uid = self.resolve_msw_user_id(uid_norm).lower()
                rec_uid = str(msw_row["recipient_user_id"] or "").strip().lower()
                if rec_uid != resolved_uid and rec_uid.upper() != "ALL_MSW":
                    raise HTTPException(
                        status_code=403,
                        detail="Unauthorized: cannot access or mark notifications assigned to another MSW.",
                    )
                conn.execute(
                    "UPDATE msw_notifications SET is_read = 1, read_at = COALESCE(read_at, ?) WHERE id = ?",
                    (now, notif_id),
                )
                conn.commit()
                return {"status": "ok", "id": notif_id, "is_read": True, "read_at": now}

            row = conn.execute("SELECT * FROM inquiry_notifications WHERE id = ?", (notif_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Notification not found.")
            if role_norm == "patient":
                if row["recipient_role"] != "patient" or str(row["recipient_id"]).upper() != uid_norm.upper():
                    raise HTTPException(status_code=403, detail="Unauthorized.")
            elif role_norm not in ("admin", "nurse") or row["recipient_role"] != "admin":
                raise HTTPException(status_code=403, detail="Unauthorized.")

            conn.execute(
                "UPDATE inquiry_notifications SET is_read = 1, read_at = ? WHERE id = ?",
                (now, notif_id),
            )
            conn.commit()
            return {"status": "ok", "id": notif_id}

    def delete_notification(self, notif_id: str, actor_role: str, actor_id: str) -> Dict[str, Any]:
        """Permanently deletes a single notification owned by the authenticated actor without affecting clinical records."""
        role_norm = (actor_role or "").strip().lower()
        uid_norm = (actor_id or "").strip()

        with self._connect() as conn:
            if role_norm == "msw" or notif_id.startswith("MSWN-"):
                if role_norm != "msw":
                    raise HTTPException(status_code=403, detail="Unauthorized: MSW role required.")
                msw_row = conn.execute("SELECT * FROM msw_notifications WHERE id = ?", (notif_id,)).fetchone()
                if not msw_row:
                    raise HTTPException(status_code=404, detail="MSW Notification not found.")
                resolved_uid = self.resolve_msw_user_id(uid_norm).lower()
                rec_uid = str(msw_row["recipient_user_id"] or "").strip().lower()
                if rec_uid != resolved_uid and rec_uid.upper() != "ALL_MSW":
                    raise HTTPException(
                        status_code=403,
                        detail="Unauthorized: cannot delete notifications assigned to another MSW.",
                    )
                conn.execute("DELETE FROM msw_notifications WHERE id = ?", (notif_id,))
                conn.commit()
                return {"status": "ok", "deleted_id": notif_id}

            row = conn.execute("SELECT * FROM inquiry_notifications WHERE id = ?", (notif_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Notification not found.")
            if role_norm == "patient":
                if row["recipient_role"] != "patient" or str(row["recipient_id"]).upper() != uid_norm.upper():
                    raise HTTPException(status_code=403, detail="Unauthorized: cannot delete another patient's notification.")
            elif role_norm not in ("admin", "nurse") or row["recipient_role"] != "admin":
                raise HTTPException(status_code=403, detail="Unauthorized.")

            conn.execute("DELETE FROM inquiry_notifications WHERE id = ?", (notif_id,))
            conn.commit()
            return {"status": "ok", "deleted_id": notif_id}

    def delete_all_notifications(self, actor_role: str, actor_id: str) -> Dict[str, Any]:
        """Permanently deletes all notifications belonging to the authenticated actor."""
        role_norm = (actor_role or "").strip().lower()
        uid_norm = (actor_id or "").strip()

        with self._connect() as conn:
            if role_norm == "msw":
                resolved_uid = self.resolve_msw_user_id(uid_norm)
                cur = conn.execute(
                    """
                    DELETE FROM msw_notifications
                    WHERE recipient_role = 'msw'
                      AND (LOWER(recipient_user_id) = LOWER(?) OR UPPER(recipient_user_id) = 'ALL_MSW')
                    """,
                    (resolved_uid,),
                )
                conn.commit()
                return {"status": "ok", "deleted_count": cur.rowcount}
            elif role_norm == "patient":
                cur = conn.execute(
                    "DELETE FROM inquiry_notifications WHERE recipient_role = 'patient' AND UPPER(recipient_id) = UPPER(?)",
                    (uid_norm,),
                )
                conn.commit()
                return {"status": "ok", "deleted_count": cur.rowcount}
            elif role_norm in ("admin", "nurse"):
                cur = conn.execute("DELETE FROM inquiry_notifications WHERE recipient_role = 'admin'")
                conn.commit()
                return {"status": "ok", "deleted_count": cur.rowcount}
            raise HTTPException(status_code=403, detail="Unauthorized role.")

    def mark_all_notifications_read(self, actor_role: str, actor_id: str) -> Dict[str, Any]:
        now = _utc_now_iso()
        role_norm = (actor_role or "").strip().lower()
        uid_norm = (actor_id or "").strip()

        with self._connect() as conn:
            if role_norm == "msw":
                resolved_uid = self.resolve_msw_user_id(uid_norm)
                cur = conn.execute(
                    """
                    UPDATE msw_notifications
                    SET is_read = 1, read_at = COALESCE(read_at, ?)
                    WHERE recipient_role = 'msw'
                      AND (LOWER(recipient_user_id) = LOWER(?) OR UPPER(recipient_user_id) = 'ALL_MSW')
                      AND is_read = 0
                    """,
                    (now, resolved_uid),
                )
                conn.commit()
                return {"status": "ok", "marked_count": cur.rowcount}
            elif role_norm == "patient":
                cur = conn.execute(
                    """
                    UPDATE inquiry_notifications
                    SET is_read = 1, read_at = COALESCE(read_at, ?)
                    WHERE recipient_role = 'patient' AND UPPER(recipient_id) = UPPER(?) AND is_read = 0
                    """,
                    (now, uid_norm),
                )
                conn.commit()
                return {"status": "ok", "marked_count": cur.rowcount}
            elif role_norm in ("admin", "nurse"):
                cur = conn.execute(
                    """
                    UPDATE inquiry_notifications
                    SET is_read = 1, read_at = COALESCE(read_at, ?)
                    WHERE recipient_role = 'admin' AND is_read = 0
                    """,
                    (now,),
                )
                conn.commit()
                return {"status": "ok", "marked_count": cur.rowcount}
            else:
                raise HTTPException(status_code=403, detail="Unauthorized role.")


inquiry_service = InquiryService()
