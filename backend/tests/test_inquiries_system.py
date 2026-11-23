import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.inquiry_service import InquiryService
import app.api.v1.endpoints.inquiries as inquiries_endpoint_mod
import app.services.inquiry_service as inquiry_service_mod

client = TestClient(app)

PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 16
JPG_BYTES = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 16


@pytest.fixture(autouse=True)
def isolated_inquiry_db(tmp_path: Path, monkeypatch):
    """Use an isolated temporary SQLite DB and upload folder for each test."""
    test_svc = InquiryService(db_path=tmp_path / "inquiries.db", upload_dir=tmp_path / "uploads")
    monkeypatch.setattr(inquiry_service_mod, "inquiry_service", test_svc)
    monkeypatch.setattr(inquiries_endpoint_mod, "inquiry_service", test_svc)
    yield test_svc


def test_full_two_way_patient_admin_inquiry_and_attachment_workflow():
    # 1. Patient A submits inquiry with PDF, PNG, and JPG attachments
    files = [
        ("files", ("indigency.pdf", io.BytesIO(PDF_BYTES), "application/pdf")),
        ("files", ("eye_photo.png", io.BytesIO(PNG_BYTES), "image/png")),
        ("files", ("id_card.jpg", io.BytesIO(JPG_BYTES), "image/jpeg")),
    ]
    r_sub = client.post(
        "/api/v1/inquiries",
        headers={"x-user-role": "patient", "x-user-id": "M26-11-00001"},
        data={"subject": "Cataract Surgery Follow-up", "message": "Please review my uploaded documents."},
        files=files,
    )
    assert r_sub.status_code == 200
    inq = r_sub.json()["inquiry"]
    inq_id = inq["id"]
    assert inq["patient_id"] == "M26-11-00001"
    assert inq["status"] == "NEW"
    assert inq["admin_read"] is False
    assert inq["patient_badge"] == "WAITING FOR RESPONSE"
    assert len(inq["attachments"]) == 3

    # 2. Admin receives NEW_INQUIRY notification
    r_adm_notif = client.get(
        "/api/v1/inquiries/notifications/list",
        headers={"x-user-role": "admin", "x-user-id": "admin_sys"},
    )
    assert r_adm_notif.status_code == 200
    assert r_adm_notif.json()["unread_count"] == 1

    # 3. Patient views own inquiry -> still WAITING FOR RESPONSE and admin_read stays False!
    r_pat_view = client.get(
        f"/api/v1/inquiries/{inq_id}?mark_read=true",
        headers={"x-user-role": "patient", "x-user-id": "M26-11-00001"},
    )
    assert r_pat_view.status_code == 200
    assert r_pat_view.json()["inquiry"]["admin_read"] is False
    assert r_pat_view.json()["inquiry"]["status"] == "NEW"
    assert r_pat_view.json()["inquiry"]["patient_badge"] == "WAITING FOR RESPONSE"

    # 4. Patient views & downloads PDF, PNG, JPG attachments
    for att in inq["attachments"]:
        r_att = client.get(
            f"/api/v1/inquiries/{inq_id}/attachments/{att['id']}?download=false",
            headers={"x-user-role": "patient", "x-user-id": "M26-11-00001"},
        )
        assert r_att.status_code == 200
        assert "inline" in r_att.headers.get("content-disposition", "")

        r_dl = client.get(
            f"/api/v1/inquiries/{inq_id}/attachments/{att['id']}?download=true",
            headers={"x-user-role": "patient", "x-user-id": "M26-11-00001"},
        )
        assert r_dl.status_code == 200
        assert "attachment" in r_dl.headers.get("content-disposition", "")

    # 5. Admin lists directory -> sees 1 unread inquiry
    r_adm_list = client.get(
        "/api/v1/inquiries/admin",
        headers={"x-user-role": "admin", "x-user-id": "admin_sys"},
    )
    assert r_adm_list.status_code == 200
    assert r_adm_list.json()["unread_count"] == 1
    assert r_adm_list.json()["items"][0]["id"] == inq_id

    # 6. Admin opens inquiry -> admin_read becomes True, status becomes READ (not ANSWERED)
    r_adm_open = client.get(
        f"/api/v1/inquiries/{inq_id}?mark_read=true",
        headers={"x-user-role": "admin", "x-user-id": "admin_sys"},
    )
    assert r_adm_open.status_code == 200
    opened = r_adm_open.json()["inquiry"]
    assert opened["admin_read"] is True
    assert opened["admin_read_by"] == "admin_sys"
    assert opened["admin_read_at"] is not None
    assert opened["status"] == "READ"
    assert opened["patient_has_unread_reply"] is False

    # Admin can also access the PDF attachment
    pdf_att = next(a for a in inq["attachments"] if a["file_type"] == "pdf")
    r_adm_att = client.get(
        f"/api/v1/inquiries/{inq_id}/attachments/{pdf_att['id']}",
        headers={"x-user-role": "admin", "x-user-id": "admin_sys"},
    )
    assert r_adm_att.status_code == 200
    assert r_adm_att.content == PDF_BYTES

    # 7. Admin replies -> status becomes ANSWERED, patient gets UNREAD REPLY + notification
    r_rep = client.post(
        f"/api/v1/inquiries/{inq_id}/reply",
        headers={"x-user-role": "admin", "x-user-id": "admin_sys"},
        data={
            "message": "We received your documents. Your surgery evaluation is scheduled.",
            "channel": "portal",
            "admin_name": "Dr. Roberto Reyes, MD",
        },
    )
    assert r_rep.status_code == 200
    replied = r_rep.json()["inquiry"]
    assert replied["status"] == "ANSWERED"
    assert replied["patient_has_unread_reply"] is True
    assert replied["patient_badge"] == "UNREAD REPLY"
    assert len(replied["replies"]) == 1
    assert replied["message"] == "Please review my uploaded documents."

    # 8. Patient sees notification & UNREAD REPLY, then opens inquiry -> becomes ANSWERED (read)
    r_pat_notif = client.get(
        "/api/v1/inquiries/notifications/list",
        headers={"x-user-role": "patient", "x-user-id": "M26-11-00001"},
    )
    assert r_pat_notif.status_code == 200
    assert r_pat_notif.json()["unread_count"] == 1

    r_pat_open_reply = client.get(
        f"/api/v1/inquiries/{inq_id}?mark_read=true",
        headers={"x-user-role": "patient", "x-user-id": "M26-11-00001"},
    )
    assert r_pat_open_reply.status_code == 200
    pat_opened = r_pat_open_reply.json()["inquiry"]
    assert pat_opened["patient_has_unread_reply"] is False
    assert pat_opened["patient_badge"] == "ANSWERED"

    # 9. Admin closes inquiry -> status becomes CLOSED
    r_close = client.patch(
        f"/api/v1/inquiries/{inq_id}/status",
        headers={"x-user-role": "admin", "x-user-id": "admin_sys"},
        json={"status": "CLOSED"},
    )
    assert r_close.status_code == 200
    assert r_close.json()["inquiry"]["status"] == "CLOSED"
    assert r_close.json()["inquiry"]["patient_badge"] == "CLOSED"


def test_inquiry_security_isolation_and_upload_validation():
    # 1. Spoofed PDF magic bytes rejected cleanly without creating inquiry
    r_bad_file = client.post(
        "/api/v1/inquiries",
        headers={"x-user-role": "patient", "x-user-id": "M26-11-00001"},
        data={"subject": "Bad File Test", "message": "Testing magic bytes."},
        files=[("files", ("fake.pdf", io.BytesIO(b"not a real pdf"), "application/pdf"))],
    )
    assert r_bad_file.status_code == 415

    r_list_empty = client.get(
        "/api/v1/inquiries/patient",
        headers={"x-user-role": "patient", "x-user-id": "M26-11-00001"},
    )
    assert len(r_list_empty.json()["items"]) == 0

    # 2. > 5 files rejected
    too_many = [("files", (f"img{i}.png", io.BytesIO(PNG_BYTES), "image/png")) for i in range(6)]
    r_6 = client.post(
        "/api/v1/inquiries",
        headers={"x-user-role": "patient", "x-user-id": "M26-11-00001"},
        data={"subject": "Too Many Files", "message": "6 files"},
        files=too_many,
    )
    assert r_6.status_code == 400

    # 3. Create valid inquiry for Patient A (M26-11-00001)
    r_ok = client.post(
        "/api/v1/inquiries",
        headers={"x-user-role": "patient", "x-user-id": "M26-11-00001"},
        data={"subject": "Private Inquiry", "message": "Confidential"},
        files=[("files", ("doc.pdf", io.BytesIO(PDF_BYTES), "application/pdf"))],
    )
    assert r_ok.status_code == 200
    inq_id = r_ok.json()["inquiry"]["id"]
    att_id = r_ok.json()["inquiry"]["attachments"][0]["id"]

    # 4. Patient B (MSW_FA_1126-01) cannot view Patient A's inquiry or attachment
    r_other_inq = client.get(
        f"/api/v1/inquiries/{inq_id}",
        headers={"x-user-role": "patient", "x-user-id": "MSW_FA_1126-01"},
    )
    assert r_other_inq.status_code == 403

    r_other_att = client.get(
        f"/api/v1/inquiries/{inq_id}/attachments/{att_id}",
        headers={"x-user-role": "patient", "x-user-id": "MSW_FA_1126-01"},
    )
    assert r_other_att.status_code == 403

    r_other_list = client.get(
        "/api/v1/inquiries/patient",
        headers={"x-user-role": "patient", "x-user-id": "MSW_FA_1126-01"},
    )
    assert len(r_other_list.json()["items"]) == 0

    # 5. Patient cannot reply as Admin or change inquiry status
    r_pat_reply = client.post(
        f"/api/v1/inquiries/{inq_id}/reply",
        headers={"x-user-role": "patient", "x-user-id": "M26-11-00001"},
        data={"message": "Fake admin reply"},
    )
    assert r_pat_reply.status_code == 403

    r_pat_status = client.patch(
        f"/api/v1/inquiries/{inq_id}/status",
        headers={"x-user-role": "patient", "x-user-id": "M26-11-00001"},
        json={"status": "ANSWERED"},
    )
    assert r_pat_status.status_code == 403
