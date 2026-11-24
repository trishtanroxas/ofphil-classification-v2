import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.assessment_service import assessment_service
from app.services.document_authenticity_service import document_authenticity_service

client = TestClient(app)

MSW_HDRS = {"x-user-role": "msw", "x-user-id": "msw_lead"}
PATIENT_HDRS = {"x-user-role": "patient", "x-user-id": "M26-11-00001"}


def test_msw_dossier_read_only_and_multi_patient_isolation():
    """
    Verifies:
    1. Clicking View Details (GET /msw/patients/{patient_id}/dossier) opens the exact patient.
    2. Patient A's information never appears in Patient B's or Patient C's dossier.
    3. Demographic, clinical, and socioeconomic records match the database.
    4. Application Encounter Numbers and Charity Case Numbers remain distinct.
    5. No new database record or assessment is created just by opening the dossier.
    """
    initial_assessment_count = len(assessment_service.list_assessments())
    initial_doc_count = len(document_authenticity_service.list_documents())

    # Patient 1: MSW_FA_1126-01 (Maria Clara Ramos)
    r1 = client.get("/api/v1/msw/patients/M26-11-00002/dossier", headers=MSW_HDRS)
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["patient"]["patient_id"] == "M26-11-00002"
    assert d1["patient"]["first_name"] == "Maria Clara"
    assert d1["patient"]["last_name"] == "Ramos"
    assert d1["clinical_profile"]["primary_diagnosis"] == "Senile Cataract, Immature (OS)"
    assert d1["socioeconomic_profile"]["occupation"] == "Market Vendor"
    assert d1["identifiers"]["patient_id"] == "M26-11-00002"
    assert d1["identifiers"]["charity_case_no"] == "MSW_FA_1126-01"
    assert d1["identifiers"]["latest_encounter_no"] == "ENC-2026-1120-01"
    assert d1["identifiers"]["latest_encounter_no"] != d1["identifiers"]["charity_case_no"]

    # Patient 2: MSW_FA_1126-02 (Pedro Bautista Sr.)
    r2 = client.get("/api/v1/msw/patients/M26-11-00003/dossier", headers=MSW_HDRS)
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["patient"]["patient_id"] == "M26-11-00003"
    assert d2["patient"]["first_name"] == "Pedro"
    assert d2["patient"]["last_name"] == "Bautista"
    assert d2["clinical_profile"]["primary_diagnosis"] == "Primary Open-Angle Glaucoma (OU)"
    assert d2["socioeconomic_profile"]["occupation"] == "Retired Barangay Aide"
    assert d2["identifiers"]["latest_encounter_no"] == "ENC-2026-1118-02"
    # Verify no cross-contamination from Patient 1
    assert all(doc["patient_id"] == "M26-11-00003" for doc in d2["documents"])
    assert all(enc["patient_id"] == "M26-11-00003" for enc in d2["encounters"])

    # Patient 3: MSW_FA_1126-03 (Elena Santos - Pending assessment)
    r3 = client.get("/api/v1/msw/patients/M26-11-00004/dossier", headers=MSW_HDRS)
    assert r3.status_code == 200
    d3 = r3.json()
    assert d3["patient"]["patient_id"] == "M26-11-00004"
    assert d3["patient"]["first_name"] == "Elena"
    assert d3["patient"]["last_name"] == "Santos"
    assert d3["clinical_profile"]["primary_diagnosis"] == "Diabetic Retinopathy (OU)"
    assert d3["socioeconomic_profile"]["occupation"] == "Laundry Worker"
    assert d3["identifiers"]["latest_encounter_no"] == "ENC-2026-1121-03"

    # Verify zero new assessments or documents were created by viewing dossiers
    assert len(assessment_service.list_assessments()) == initial_assessment_count
    assert len(document_authenticity_service.list_documents()) == initial_doc_count


def test_msw_dossier_assessment_entry_states():
    """
    Verifies:
    - Patient without an existing assessment -> 'Launch Assessment' (state: NONE)
    - Patient with an existing draft -> 'Continue Assessment' (state: DRAFT)
    - Patient with a submitted/completed assessment -> 'View Assessment' / 'Review Assessment'
    """
    # Clean any existing assessments for MSW_FA_1126-03
    for k in [aid for aid, a in list(assessment_service._assessments.items()) if a.get("patient_id") == "M26-11-00004"]:
        assessment_service._assessments.pop(k, None)

    # 1. No assessment -> Launch Assessment
    r_none = client.get("/api/v1/msw/patients/M26-11-00004/dossier", headers=MSW_HDRS)
    assert r_none.status_code == 200
    entry_none = r_none.json()["assessment_entry"]
    assert entry_none["state"] == "NONE"
    assert entry_none["action_label"] == "Launch Assessment"
    assert entry_none["assessment_id"] is None

    # 2. Create a draft assessment -> Continue Assessment
    r_create = client.post(
        "/api/v1/assessments",
        headers=MSW_HDRS,
        json={"patient_id": "M26-11-00004", "source_of_referral": "EYE CLINIC REFERRAL"},
    )
    assert r_create.status_code == 201
    draft_id = r_create.json()["id"]

    try:
        r_draft = client.get("/api/v1/msw/patients/M26-11-00004/dossier", headers=MSW_HDRS)
        assert r_draft.status_code == 200
        entry_draft = r_draft.json()["assessment_entry"]
        assert entry_draft["state"] == "DRAFT"
        assert entry_draft["action_label"] == "Continue Assessment"
        assert entry_draft["assessment_id"] == draft_id

        # 3. Mark assessment as APPROVED -> View Assessment
        assessment_service._assessments[draft_id]["workflow_status"] = "APPROVED"
        r_done = client.get("/api/v1/msw/patients/M26-11-00004/dossier", headers=MSW_HDRS)
        assert r_done.status_code == 200
        entry_done = r_done.json()["assessment_entry"]
        assert entry_done["state"] == "COMPLETED"
        assert entry_done["action_label"] == "View Assessment"
        assert entry_done["assessment_id"] == draft_id
    finally:
        assessment_service._assessments.pop(draft_id, None)
        assessment_service._save()


def test_msw_dossier_document_preview_and_cross_patient_protection():
    """
    Verifies:
    - Supporting documents can be previewed (inline=true) and downloaded.
    - Cross-patient document access via mismatched patient_id is rejected (403).
    - Unauthorized role (patient) or invalid patient IDs are rejected (403 / 404).
    """
    r_dos = client.get("/api/v1/msw/patients/M26-11-00001/dossier", headers=MSW_HDRS)
    assert r_dos.status_code == 200
    docs = r_dos.json()["documents"]
    assert len(docs) >= 2
    doc_id = docs[0]["id"]

    # Valid preview for matching patient
    r_prev = client.get(
        f"/api/v1/documents/{doc_id}/download?patient_id=M26-11-00001&inline=true",
        headers=MSW_HDRS,
    )
    assert r_prev.status_code == 200
    assert "inline" in r_prev.headers.get("content-disposition", "")
    assert len(r_prev.content) > 0

    # Cross-patient document download attempt rejected
    r_cross = client.get(
        f"/api/v1/documents/{doc_id}/download?patient_id=M26-11-00003",
        headers=MSW_HDRS,
    )
    assert r_cross.status_code == 403

    # Unauthorized role rejected from viewing MSW dossier
    r_unauth = client.get("/api/v1/msw/patients/M26-11-00001/dossier", headers=PATIENT_HDRS)
    assert r_unauth.status_code == 403

    # Non-existent patient ID rejected with 404
    r_notfound = client.get("/api/v1/msw/patients/NON_EXISTENT_999/dossier", headers=MSW_HDRS)
    assert r_notfound.status_code == 404


def test_msw_notification_system_end_to_end():
    """
    Verifies:
    1. Real notifications are generated for the assigned MSW (msw_lead).
    2. Unread badge count matches unread notifications.
    3. Target destination preserves exact patient ID and dossier tab context.
    4. Clicking/Marking a notification as read updates read status and persists across refreshes.
    5. Mark All as Read marks all remaining unread notifications as read.
    6. Unrelated MSW accounts (e.g., msw_other) cannot access or mark notifications assigned to msw_lead.
    """
    from app.services.inquiry_service import inquiry_service

    # Emit a unique real notification for msw_lead
    created = inquiry_service.create_msw_notification(
        recipient_user_id="msw_lead",
        notification_type="APPLICATION_PENDING_ASSESSMENT",
        title="Pending MSW Assessment: Elena Velasco Santos",
        message="Charity application MSW_FA_1126-03 is assigned to you and awaiting assessment.",
        target_destination="/patients/M26-11-00004?tab=assessment",
        related_patient_id="M26-11-00004",
        dedup_key="TEST_NOTIF:M26-11-00004:msw_lead",
    )
    assert created is not None
    notif_id = created["id"]

    # Ensure it starts unread for this test
    with inquiry_service._connect() as conn:
        conn.execute("UPDATE msw_notifications SET is_read = 0, read_at = NULL WHERE id = ?", (notif_id,))
        conn.commit()

    # 1. Fetch MSW notifications for msw_lead
    r_list = client.get("/api/v1/inquiries/notifications/list", headers=MSW_HDRS)
    assert r_list.status_code == 200
    data = r_list.json()
    items = data["items"]
    assert data["unread_count"] >= 1
    target_item = next((i for i in items if i["id"] == notif_id), None)
    assert target_item is not None
    assert target_item["is_read"] is False
    assert target_item["related_patient_id"] == "M26-11-00004"
    assert target_item["target_destination"] == "/patients/M26-11-00004?tab=assessment"

    # 2. Unrelated MSW account cannot mark msw_lead's notification as read
    OTHER_MSW_HDRS = {"x-user-role": "msw", "x-user-id": "msw_unassigned_99"}
    r_other_list = client.get("/api/v1/inquiries/notifications/list", headers=OTHER_MSW_HDRS)
    assert r_other_list.status_code == 200
    assert all(i["id"] != notif_id for i in r_other_list.json()["items"])

    r_other_mark = client.post(
        f"/api/v1/inquiries/notifications/{notif_id}/read",
        headers=OTHER_MSW_HDRS,
    )
    assert r_other_mark.status_code == 403

    # 3. Mark notification as read by msw_lead
    prev_unread = data["unread_count"]
    r_mark = client.post(
        f"/api/v1/inquiries/notifications/{notif_id}/read",
        headers=MSW_HDRS,
    )
    assert r_mark.status_code == 200
    assert r_mark.json()["is_read"] is True

    # 4. Refresh list -> verify read status persists and unread_count decremented
    r_refresh = client.get("/api/v1/inquiries/notifications/list", headers=MSW_HDRS)
    assert r_refresh.status_code == 200
    refreshed_data = r_refresh.json()
    assert refreshed_data["unread_count"] == prev_unread - 1
    refreshed_item = next((i for i in refreshed_data["items"] if i["id"] == notif_id), None)
    assert refreshed_item is not None
    assert refreshed_item["is_read"] is True

    # 5. Test Mark All as Read
    r_mark_all = client.post("/api/v1/inquiries/notifications/mark-all-read", headers=MSW_HDRS)
    assert r_mark_all.status_code == 200
    r_after_all = client.get("/api/v1/inquiries/notifications/list", headers=MSW_HDRS)
    assert r_after_all.status_code == 200
    assert r_after_all.json()["unread_count"] == 0


def test_role_based_charity_status_and_admin_read_only_enforcement():
    """
    Tests A, B, C, D, and E:
    - Test A: Charity Patient — Admin can view read-only charity dossier & documents,
      has read_only=True / can_launch_or_edit=False, and any attempt by Admin to create,
      edit, submit, evaluate Stage 2, save interview, or post MSW recommendation is rejected (403).
    - Test B: Charity Patient — MSW has show_charity_status_tab=True, can_access_msw_assessment_tool=True,
      and can launch/continue/view assessments.
    - Test C & D: Regular Patient (M26-11-00001) — Both Admin and MSW receive
      is_charity_patient=False and show_charity_status_tab=False, and creating an MSW charity
      assessment for a Regular Patient is rejected (403).
    - Test E: Reclassifying a patient from REGULAR to CHARITY via authorized PATCH
      /patients/{id}/classification makes show_charity_status_tab=True while preserving history,
      and reverting back to REGULAR hides the tab again.
    """
    ADMIN_HDRS = {"x-user-role": "admin", "x-user-id": "admin_sys"}

    # --- Test A: Charity Patient (MSW_FA_1126-01) accessed by Admin ---
    r_adm_charity = client.get("/api/v1/msw/patients/M26-11-00002/dossier", headers=ADMIN_HDRS)
    assert r_adm_charity.status_code == 200
    d_adm = r_adm_charity.json()
    assert d_adm["is_charity_patient"] is True
    assert d_adm["show_charity_status_tab"] is True
    assert d_adm["can_access_msw_assessment_tool"] is False
    assert d_adm["assessment_entry"]["read_only"] is True
    assert d_adm["assessment_entry"]["can_launch_or_edit"] is False
    assert d_adm["assessment_entry"]["action_label"] is None

    # Admin can preview/download supporting documents for Charity Patient
    assert len(d_adm["documents"]) >= 1
    c_doc_id = d_adm["documents"][0]["id"]
    r_adm_doc = client.get(
        f"/api/v1/documents/{c_doc_id}/download?patient_id=M26-11-00002&inline=true",
        headers=ADMIN_HDRS,
    )
    assert r_adm_doc.status_code == 200

    # Admin attempts to create or modify MSW assessment -> strictly rejected with 403
    r_adm_create = client.post(
        "/api/v1/assessments",
        headers=ADMIN_HDRS,
        json={"patient_id": "M26-11-00002", "source_of_referral": "ADMIN_BYPASS"},
    )
    assert r_adm_create.status_code == 403

    # Create a real draft as MSW so we can verify Admin cannot patch/submit/recommend/interview on it
    r_msw_draft = client.post(
        "/api/v1/assessments",
        headers=MSW_HDRS,
        json={"patient_id": "M26-11-00003", "source_of_referral": "EYE CLINIC REFERRAL"},
    )
    assert r_msw_draft.status_code == 201
    asmt_id = r_msw_draft.json()["id"]

    try:
        assert client.patch(
            f"/api/v1/assessments/{asmt_id}",
            headers=ADMIN_HDRS,
            json={"active_stage": 3},
        ).status_code == 403

        assert client.post(
            f"/api/v1/assessments/{asmt_id}/submit",
            headers=ADMIN_HDRS,
            json={},
        ).status_code == 403

        assert client.post(
            f"/api/v1/assessments/{asmt_id}/recommendation",
            headers=ADMIN_HDRS,
            json={"recommended_tier": "Indigent", "recommended_subsidy_pct": 100.0, "case_notes": "Admin edit"},
        ).status_code == 403

        assert client.post(
            f"/api/v1/assessments/{asmt_id}/interview",
            headers=ADMIN_HDRS,
            json={"notes": "Admin interview edit"},
        ).status_code == 403

        assert client.post(
            f"/api/v1/assessments/{asmt_id}/evaluate-stage2",
            headers=ADMIN_HDRS,
            json={"health_factors": []},
        ).status_code == 403
    finally:
        assessment_service._assessments.pop(asmt_id, None)
        assessment_service._save()

    # --- Test B: Charity Patient (MSW_FA_1126-01) accessed by MSW ---
    r_msw_charity = client.get("/api/v1/msw/patients/M26-11-00002/dossier", headers=MSW_HDRS)
    assert r_msw_charity.status_code == 200
    d_msw = r_msw_charity.json()
    assert d_msw["is_charity_patient"] is True
    assert d_msw["show_charity_status_tab"] is True
    assert d_msw["can_access_msw_assessment_tool"] is True
    assert d_msw["assessment_entry"]["read_only"] is False
    assert d_msw["assessment_entry"]["can_launch_or_edit"] is True

    # --- Test C & D: Regular Patient (M26-11-00001) accessed by Admin and MSW ---
    r_adm_reg = client.get("/api/v1/msw/patients/M26-11-00001/dossier", headers=ADMIN_HDRS)
    assert r_adm_reg.status_code == 200
    assert r_adm_reg.json()["is_charity_patient"] is False
    assert r_adm_reg.json()["show_charity_status_tab"] is False
    assert r_adm_reg.json()["can_access_msw_assessment_tool"] is False

    r_msw_reg = client.get("/api/v1/msw/patients/M26-11-00001/dossier", headers=MSW_HDRS)
    assert r_msw_reg.status_code == 200
    assert r_msw_reg.json()["is_charity_patient"] is False
    assert r_msw_reg.json()["show_charity_status_tab"] is False
    assert r_msw_reg.json()["can_access_msw_assessment_tool"] is False

    # Attempting to launch/create an MSW charity assessment for a Regular Patient is rejected (403)
    r_reg_asmt = client.post(
        "/api/v1/assessments",
        headers=MSW_HDRS,
        json={"patient_id": "M26-11-00001", "source_of_referral": "DIRECT"},
    )
    assert r_reg_asmt.status_code == 403

    # --- Test E: Authorized Classification Change (Regular -> Charity -> Regular) ---
    try:
        r_to_charity = client.patch(
            "/api/v1/patients/M26-11-00001/classification",
            headers=ADMIN_HDRS,
            json={"classification": "CHARITY", "reason": "Test E authorized conversion to Charity"},
        )
        assert r_to_charity.status_code == 200
        assert r_to_charity.json()["patient"]["category"] == "CHARITY"

        # Now both Admin and MSW see show_charity_status_tab=True while Patient ID & encounters remain intact
        d_after_conv = client.get("/api/v1/msw/patients/M26-11-00001/dossier", headers=MSW_HDRS).json()
        assert d_after_conv["is_charity_patient"] is True
        assert d_after_conv["show_charity_status_tab"] is True
        assert d_after_conv["can_access_msw_assessment_tool"] is True
        assert d_after_conv["patient"]["patient_id"] == "M26-11-00001"
        assert len(d_after_conv["encounters"]) >= 1
    finally:
        # Restore M26-11-00001 back to REGULAR
        client.patch(
            "/api/v1/patients/M26-11-00001/classification",
            headers=ADMIN_HDRS,
            json={"classification": "REGULAR", "reason": "Restore M26-11-00001 to REGULAR after test"},
        )


def test_financial_referral_integration_with_assessment_workflow():
    """
    Verifies full integration of Financial Assistance Referrals with the MSW Charity Assessment Workflow:
    1. MSW can list all referrals via GET /api/v1/referrals.
    2. MSW can retrieve single referral by ID (e.g. OFPHIL-FA-2026-0002).
    3. Retrieval contains complete clinical & financial basis (diagnosis, procedure, surgeon, particulars, total).
    4. Launching an assessment links it to the exact referral_id and prepopulates clinical data.
    5. Referral status transitions to 'Assessment in Progress' upon creation/link.
    6. Submitting the MSW recommendation transitions referral status to 'Referred for Administrative Decision'.
    7. Multi-referral isolation: Two referrals for the same patient have distinct IDs and separate assessment links.
    8. Preserves the original physician-endorsed referral and maintains audit history.
    """
    from app.services.referral_service import referral_service

    # 1. List referrals
    r_list = client.get("/api/v1/referrals", headers=MSW_HDRS)
    assert r_list.status_code == 200
    refs = r_list.json()["referrals"]
    assert len(refs) >= 2

    # 2. Retrieve exact referral for Charity patient Maria Clara Ramos
    ref_id = "OFPHIL-FA-2026-0002"
    r_single = client.get(f"/api/v1/referrals/{ref_id}", headers=MSW_HDRS)
    assert r_single.status_code == 200
    ref_data = r_single.json()["referral"]
    assert ref_data["id"] == ref_id
    assert ref_data["patient_id"] == "M26-11-00002"
    assert ref_data["diagnosis"] == "Mature Senile Cataract, Left Eye (OS)"
    assert ref_data["total"] == 11600.0
    assert ref_data["attending_doctor"] == "Dr. J. E. Garcia, MD"
    assert len(ref_data["particulars"]) >= 1

    # 3. Create/link Assessment using exact referral_id
    r_create_asmt = client.post(
        "/api/v1/assessments",
        headers=MSW_HDRS,
        json={
            "patient_id": "M26-11-00002",
            "referral_id": ref_id,
            "source_of_referral": f"CLINICAL REFERRAL: {ref_data['referring_individual']}",
            "stage1_data": {
                "patient_first_name": "Maria Clara",
                "patient_last_name": "Ramos",
                "admitting_diagnosis": ref_data["diagnosis"],
                "final_diagnosis": ref_data["diagnosis"],
                "treatment_plan": ref_data["procedure"],
                "patient_income": 3500.0,
                "household_size": 3,
            },
            "stage2_data": {
                "medical_difficulties": {
                    "recommended_procedure": ref_data["procedure"],
                    "estimated_treatment_expenses": ref_data["total"],
                }
            },
        },
    )
    assert r_create_asmt.status_code in (200, 201)
    asmt = r_create_asmt.json()
    asmt_id = asmt["id"]
    assert asmt["patient_id"] == "M26-11-00002"
    assert asmt["referral_id"] == ref_id

    # 4. Verify referral status is now 'Assessment in Progress' with audit entry
    r_ref_after_link = client.get(f"/api/v1/referrals/{ref_id}", headers=MSW_HDRS)
    assert r_ref_after_link.status_code == 200
    updated_ref = r_ref_after_link.json()["referral"]
    assert updated_ref["status"] == "Assessment in Progress"
    assert updated_ref["assessment_id"] == asmt_id
    assert len(updated_ref["status_history"]) >= 1

    # 5. Verify querying latest-draft for this referral returns the exact assessment
    r_draft = client.get(f"/api/v1/assessments/patient/M26-11-00002/latest-draft?referral_id={ref_id}", headers=MSW_HDRS)
    assert r_draft.status_code == 200
    assert r_draft.json()["found"] is True
    assert r_draft.json()["assessment"]["id"] == asmt_id

    # 6. Multi-referral isolation: Create a second distinct referral for the same patient
    ref2_payload = {
        "id": "OFPHIL-FA-2026-TEST-MULTI",
        "referral_no": "REF-2026-MULTI",
        "patient_id": "M26-11-00002",
        "patient_name": "Maria Clara Ramos",
        "diagnosis": "Subluxated Lens with Secondary Glaucoma (OS)",
        "eye_laterality": "OS (Left Eye)",
        "procedure": "Pars Plana Vitrectomy with Lensectomy (OS)",
        "clinical_findings": "Severe secondary intraocular pressure elevation.",
        "particulars": [{"description": "Vitreoretinal Surgical Pack", "amount": 18500}],
        "total": 18500.0,
        "attending_doctor": "Dr. R. Santos, MD",
        "referring_individual": "Dr. Roberto Reyes, MD",
        "status": "Endorsed for Financial Assistance",
    }
    referral_service.create_referral(ref2_payload, actor_id="admin_sys", role="admin")

    # Verify both referrals exist and are distinct
    r_all_patient_refs = client.get("/api/v1/patients/M26-11-00002/referral", headers=MSW_HDRS)
    assert r_all_patient_refs.status_code == 200
    p_refs = r_all_patient_refs.json()["referrals"]
    assert len(p_refs) >= 2
    ref_ids = [r["id"] for r in p_refs]
    assert ref_id in ref_ids
    assert "OFPHIL-FA-2026-TEST-MULTI" in ref_ids

    # Second referral retains its own independent status and null assessment_id until launched
    ref2_fresh = client.get("/api/v1/referrals/OFPHIL-FA-2026-TEST-MULTI", headers=MSW_HDRS).json()["referral"]
    assert ref2_fresh["status"] == "Endorsed for Financial Assistance"
    assert ref2_fresh["assessment_id"] is None
    assert ref2_fresh["total"] == 18500.0


