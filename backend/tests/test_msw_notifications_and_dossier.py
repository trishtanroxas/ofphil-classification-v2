"""
Automated tests for Phase 1 (MSW Notification System) and Phases 2-7 (MSW Unified Patient Dossier & Assessment/Charity Workflow).
"""
import uuid
from fastapi.testclient import TestClient

from app.main import app
from app.services.inquiry_service import inquiry_service

client = TestClient(app)


def test_msw_notifications_list_sync_and_deduplication():
    """
    Verifies that listing MSW notifications for msw_lead returns real record-synced
    notifications with required fields and does not create duplicates on repeated refreshes.
    """
    headers = {"x-user-role": "msw", "x-user-id": "msw_lead"}
    res1 = client.get("/api/v1/inquiries/notifications/list", headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert "items" in data1
    assert "unread_count" in data1
    assert len(data1["items"]) >= 4

    first_ids = [item["id"] for item in data1["items"]]
    for item in data1["items"]:
        assert item["recipient_role"] == "msw"
        assert item["title"]
        assert item["message"]
        assert item["target_destination"].startswith("/patients/")
        assert "is_read" in item

    # Second call (simulating page refresh) must not duplicate notifications
    res2 = client.get("/api/v1/inquiries/notifications/list", headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()
    second_ids = [item["id"] for item in data2["items"]]
    assert first_ids == second_ids


def test_msw_notification_recipient_isolation_and_read_persistence():
    """
    Verifies that:
    1. Creating a notification for msw_lead is visible to msw_lead.
    2. An unrelated MSW account (msw_other) cannot see or mark msw_lead's notification as read (403).
    3. Marking a notification as read persists in SQLite across subsequent fetches.
    4. Mark All as Read marks all unread notifications for the authenticated MSW.
    """
    unique_key = f"TEST_NOTIF:{uuid.uuid4().hex[:8]}"
    created = inquiry_service.create_msw_notification(
        recipient_user_id="msw_lead",
        notification_type="APPLICATION_PENDING_ASSESSMENT",
        title="Test MSW Pending Assessment Alert",
        message="Patient MSW_FA_1126-03 requires MSW socio-economic evaluation.",
        target_destination="/patients/MSW_FA_1126-03?tab=assessment",
        related_patient_id="MSW_FA_1126-03",
        dedup_key=unique_key,
    )
    assert created is not None
    notif_id = created["id"]
    assert created["is_read"] is False

    # Unrelated MSW account cannot see msw_lead's notification
    other_headers = {"x-user-role": "msw", "x-user-id": "msw_unrelated_worker"}
    res_other_list = client.get("/api/v1/inquiries/notifications/list", headers=other_headers)
    assert res_other_list.status_code == 200
    other_ids = [n["id"] for n in res_other_list.json()["items"]]
    assert notif_id not in other_ids

    # Unrelated MSW account cannot mark msw_lead's notification as read
    res_other_mark = client.post(
        f"/api/v1/inquiries/notifications/{notif_id}/read",
        headers=other_headers,
    )
    assert res_other_mark.status_code == 403

    # Authorized msw_lead marks notification as read
    lead_headers = {"x-user-role": "msw", "x-user-id": "msw_lead"}
    res_mark = client.post(
        f"/api/v1/inquiries/notifications/{notif_id}/read",
        headers=lead_headers,
    )
    assert res_mark.status_code == 200
    assert res_mark.json()["status"] == "ok"

    # Verify read status persists on re-fetch
    res_list_after = client.get("/api/v1/inquiries/notifications/list", headers=lead_headers)
    assert res_list_after.status_code == 200
    matched = [n for n in res_list_after.json()["items"] if n["id"] == notif_id]
    assert len(matched) == 1
    assert matched[0]["is_read"] is True
    assert matched[0]["read_at"] is not None

    # Mark all as read works and sets unread_count to 0
    res_mark_all = client.post(
        "/api/v1/inquiries/notifications/mark-all-read",
        headers=lead_headers,
    )
    assert res_mark_all.status_code == 200
    res_final = client.get("/api/v1/inquiries/notifications/list", headers=lead_headers)
    assert res_final.status_code == 200
    assert res_final.json()["unread_count"] == 0


def test_msw_dossier_endpoints_do_not_create_duplicate_assessments_or_encounters():
    """
    Verifies that opening a patient dossier (fetching patient dossier, assessments,
    documents, referrals, and inquiries) across all 4 MSW categories:
    - Charity Approved (MSW_FA_1126-01)
    - Financial Assistance Referral (M26-11-00001)
    - Pending (MSW_FA_1126-03)
    - Disapproved / Promissory (MSW_FA_1126-04)
    returns accurate database records and creates zero unintended assessments or encounters.
    """
    headers = {"x-user-role": "msw", "x-user-id": "msw_lead"}
    for pid in ["MSW_FA_1126-01", "M26-11-00001", "MSW_FA_1126-03", "MSW_FA_1126-04"]:
        asmt_before = client.get(f"/api/v1/assessments?patient_id={pid}", headers=headers).json()
        dos_res = client.get(f"/api/v1/patients/{pid}", headers=headers)
        assert dos_res.status_code == 200
        dos_data = dos_res.json()
        assert dos_data["patient"]["patient_id"] == pid
        enc_count_before = len(dos_data.get("encounters", []))

        # Simulate loading all dossier tabs
        docs_res = client.get(f"/api/v1/documents?patient_id={pid}", headers=headers)
        assert docs_res.status_code == 200
        ref_res = client.get(f"/api/v1/patients/{pid}/referral", headers=headers)
        assert ref_res.status_code == 200
        inq_res = client.get(f"/api/v1/inquiries/admin?search={pid}", headers=headers)
        assert inq_res.status_code == 200

        # Verify no new assessments or encounters were created by viewing the dossier
        asmt_after = client.get(f"/api/v1/assessments?patient_id={pid}", headers=headers).json()
        dos_after = client.get(f"/api/v1/patients/{pid}", headers=headers).json()
        assert len(asmt_after) == len(asmt_before)
        assert len(dos_after.get("encounters", [])) == enc_count_before
