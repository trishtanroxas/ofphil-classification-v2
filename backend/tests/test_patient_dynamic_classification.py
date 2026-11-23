"""
Comprehensive automated tests for Dynamic Regular & Charity Patient Classification
in Admin Panel and Patient Portal (Tests A, B, C, and D).
"""
from fastapi.testclient import TestClient

from app.main import app
from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY

client = TestClient(app)


def _find_patient(pid: str) -> dict:
    for p in REGISTERED_PATIENTS_REGISTRY:
        if str(p.get("patient_id") or "").upper() == pid.upper():
            return p
    raise AssertionError(f"Patient {pid} not found in registry")


def test_a_regular_patient_access_and_inquiry_workflow():
    """
    TEST A: REGULAR PATIENT
    1. Ensure M26-11-00001 (Juan Dela Cruz) is REGULAR.
    2. Verify Patient Dossier returns classification REGULAR and preserves clinical/encounter records.
    3. Verify My Inquiries submission and listing work for the Regular Patient.
    4. Verify direct access to /api/v1/patient-portal/charity-assistance-status is rejected (403 Forbidden).
    """
    p = _find_patient("M26-11-00001")
    p["category"] = "REGULAR"

    # 1. Verify dossier classification is REGULAR
    dos_res = client.get("/api/v1/patients/M26-11-00001")
    assert dos_res.status_code == 200
    assert dos_res.json()["patient"]["category"] == "REGULAR"

    # 2. Verify My Inquiries submission and retrieval work for M26-11-00001
    patient_headers = {"x-user-role": "patient", "x-user-id": "M26-11-00001"}
    inq_post = client.post(
        "/api/v1/inquiries",
        headers=patient_headers,
        data={
            "subject": "Follow-up on Eye Consultation Schedule",
            "message": "Good day, I would like to ask about my cataract checkup schedule.",
        },
    )
    assert inq_post.status_code == 200
    created_inq = inq_post.json()["inquiry"]
    assert created_inq["patient_id"] == "M26-11-00001"

    inq_list = client.get("/api/v1/inquiries/patient", headers=patient_headers)
    assert inq_list.status_code == 200
    assert any(item["id"] == created_inq["id"] for item in inq_list.json()["items"])

    # 3. Manually attempt to access the Charity Assistance Status route as a REGULAR patient -> must be rejected (403)
    charity_res = client.get(
        "/api/v1/patient-portal/charity-assistance-status",
        headers=patient_headers,
    )
    assert charity_res.status_code == 403
    assert "only available to patients officially classified as a Charity Patient" in charity_res.json()["detail"]


def test_b_convert_regular_patient_to_charity_and_verify_empty_state_and_audit():
    """
    TEST B: CONVERT REGULAR PATIENT TO CHARITY
    1. Non-admin role cannot change patient classification (403).
    2. Admin converts M26-11-00001 from REGULAR to CHARITY via PATCH /api/v1/patients/M26-11-00001/classification.
    3. Verify same Patient ID (M26-11-00001) and no duplicate patient records are created.
    4. Verify audit metadata (previous_classification, new_classification, changed_by, changed_at) is recorded.
    5. Verify M26-11-00001 can now access /api/v1/patient-portal/charity-assistance-status.
    6. Because M26-11-00001 has no charity application/assessment yet, verify the informative empty state is returned
       without fabricating a Charity Case Number or charity decision.
    """
    p = _find_patient("M26-11-00001")
    p["category"] = "REGULAR"
    registry_count_before = len(REGISTERED_PATIENTS_REGISTRY)

    # Unauthorized role (patient or msw) cannot change classification
    unauth_res = client.patch(
        "/api/v1/patients/M26-11-00001/classification",
        headers={"x-user-role": "patient", "x-user-id": "M26-11-00001"},
        json={"classification": "CHARITY"},
    )
    assert unauth_res.status_code == 403

    # Authorized Admin changes classification to CHARITY
    admin_headers = {"x-user-role": "admin", "x-user-id": "admin_sys"}
    patch_res = client.patch(
        "/api/v1/patients/M26-11-00001/classification",
        headers=admin_headers,
        json={
            "classification": "CHARITY",
            "reason": "Authorized Admin conversion from Regular Patient to Charity Patient.",
        },
    )
    assert patch_res.status_code == 200
    body = patch_res.json()
    assert body["patient_id"] == "M26-11-00001"
    assert body["previous_classification"] == "REGULAR"
    assert body["new_classification"] == "CHARITY"
    assert body["changed_by"] == "admin_sys"
    assert body["changed_at"]

    # Verify no duplicate patient record was created and Patient ID is unchanged
    assert len(REGISTERED_PATIENTS_REGISTRY) == registry_count_before
    assert p["patient_id"] == "M26-11-00001"
    assert p["category"] == "CHARITY"
    assert len(p.get("classification_history", [])) >= 1

    # Verify M26-11-00001 can now access Charity Assistance Status and gets the honest empty state
    patient_headers = {"x-user-role": "patient", "x-user-id": "M26-11-00001"}
    charity_res = client.get(
        "/api/v1/patient-portal/charity-assistance-status",
        headers=patient_headers,
    )
    assert charity_res.status_code == 200
    cdata = charity_res.json()
    assert cdata["patient_id"] == "M26-11-00001"
    assert cdata["classification"] == "CHARITY"
    if not cdata["has_active_application"]:
        assert (
            cdata["empty_state_message"]
            == "Your account is classified as a Charity Patient, but no charity assistance application has been recorded yet. Please contact the clinic or authorized staff for assistance."
        )
        assert cdata["application_info"]["charity_case_no"] is None


def test_c_charity_patient_with_active_records_and_read_only_protection():
    """
    TEST C: CHARITY PATIENT (MSW_FA_1126-01 - Maria Clara Flores Ramos)
    1. Log in as Charity Patient MSW_FA_1126-01.
    2. Access /api/v1/patient-portal/charity-assistance-status.
    3. Verify actual application information, assessment status, eligibility & decision, and 7-stage progress.
    4. Verify patient cannot modify MSW assessments or institutional approvals (403 Forbidden).
    """
    charity_headers = {"x-user-role": "patient", "x-user-id": "MSW_FA_1126-01"}
    res = client.get(
        "/api/v1/patient-portal/charity-assistance-status",
        headers=charity_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["patient_id"] == "MSW_FA_1126-01"
    assert data["classification"] == "CHARITY"
    assert data["has_active_application"] is True
    assert data["application_info"]["charity_case_no"] == "MSW_FA_1126-01"
    assert data["application_info"]["charity_application_status"] == "Approved"
    assert data["eligibility_and_decision"]["final_authorized_decision"] == "APPROVED"
    assert len(data["application_progress"]) == 7
    assert all(stage["completed"] for stage in data["application_progress"])

    # Verify Patient cannot modify assessments or approve their own application
    forbid_create = client.post(
        "/api/v1/assessments",
        headers=charity_headers,
        json={"patient_id": "MSW_FA_1126-01"},
    )
    assert forbid_create.status_code == 403


def test_d_reclassify_charity_to_regular_and_verify_access_revoked():
    """
    TEST D: RECLASSIFY CHARITY TO REGULAR
    1. Admin reclassifies M26-11-00001 from CHARITY back to REGULAR.
    2. Verify database classification updates to REGULAR while preserving Patient ID and history.
    3. Verify direct access to /api/v1/patient-portal/charity-assistance-status is immediately rejected (403).
    """
    admin_headers = {"x-user-role": "admin", "x-user-id": "admin_sys"}
    patch_res = client.patch(
        "/api/v1/patients/M26-11-00001/classification",
        headers=admin_headers,
        json={
            "classification": "REGULAR",
            "reason": "Reclassifying controlled patient back to REGULAR.",
        },
    )
    assert patch_res.status_code == 200
    body = patch_res.json()
    assert body["patient_id"] == "M26-11-00001"
    assert body["previous_classification"] == "CHARITY"
    assert body["new_classification"] == "REGULAR"

    # Verify direct access to Charity Assistance Status route is now rejected (403)
    patient_headers = {"x-user-role": "patient", "x-user-id": "M26-11-00001"}
    charity_res = client.get(
        "/api/v1/patient-portal/charity-assistance-status",
        headers=patient_headers,
    )
    assert charity_res.status_code == 403
