from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
MSW_HEADERS = {"x-user-role": "msw", "x-user-id": "msw_test"}
ADMIN_HEADERS = {"x-user-role": "admin", "x-user-id": "admin_officer_01"}
PATIENT_HEADERS = {"x-user-role": "patient", "x-user-id": "patient_01"}


def test_assessment_full_workflow_and_rbac():
    # 1. Create assessment
    r_create = client.post(
        "/api/v1/assessments",
        json={
            "patient_id": "M26-11-TEST01",
            "interview_date": "2026-11-22",
            "source_of_referral": "EYE CLINIC REFERRAL",
            "stage1_data": {
                "patient_first_name": "Elena",
                "patient_last_name": "Reyes",
                "informant_income": 0,
                "patient_income": 5000,
                "household_size": 4,
            },
        },
        headers=MSW_HEADERS,
    )
    assert r_create.status_code == 201
    asmt = r_create.json()
    asmt_id = asmt["id"]
    assert asmt["workflow_status"] == "DRAFT"

    # 2. Negative income rejected
    r_neg = client.patch(
        f"/api/v1/assessments/{asmt_id}",
        json={"stage1_data": {"patient_income": -500}},
        headers=MSW_HEADERS,
    )
    assert r_neg.status_code == 422

    # 3. Save Stage 2 qualitative interview draft (no score fields required)
    r_patch = client.patch(
        f"/api/v1/assessments/{asmt_id}",
        json={
            "active_stage": 2,
            "stage2_data": {
                "health_factors": [
                    {
                        "factor": "Absence of adequate health services",
                        "patient_reported": "No local surgical facility",
                        "msw_observation": "Verified referral from provincial clinic",
                    },
                ],
                "discrimination_patient_reported": "Unable to drive public utility vehicle due to cataract",
                "discrimination_msw_observation": "Confirmed livelihood interruption",
                "interview_answers": [
                    {
                        "question_key": "living_situation",
                        "question_text": "Living Situation & Housing Tenancy",
                        "patient_answer": "Renting single room",
                        "msw_observation": "Low-income household verified",
                    }
                ],
            },
        },
        headers=MSW_HEADERS,
    )
    assert r_patch.status_code == 200
    assert r_patch.json()["workflow_status"] == "ASSESSMENT_IN_PROGRESS"

    # 4. Restore latest draft
    r_draft = client.get("/api/v1/assessments/patient/M26-11-TEST01/latest-draft", headers=MSW_HEADERS)
    assert r_draft.status_code == 200
    assert r_draft.json()["found"] is True
    assert r_draft.json()["assessment"]["id"] == asmt_id

    # 5. Submit & classify (Stage 1 per-capita classification runs; MSW Stage 2 score is None, routes to PENDING_MSW_REVIEW)
    r_sub = client.post(
        f"/api/v1/assessments/{asmt_id}/submit",
        json={"is_initial_load": False, "assessment_context": "live_recalculation"},
        headers=MSW_HEADERS,
    )
    assert r_sub.status_code == 200
    sub_data = r_sub.json()
    assert sub_data["classification_result"]["financial_classification"]["classification"] == "INDIGENT"
    assert sub_data["classification_result"]["msw_classification"] is None
    assert sub_data["workflow_status"] == "PENDING_MSW_REVIEW"

    # 6. Get classification & history
    r_cls = client.get(f"/api/v1/assessments/{asmt_id}/classification", headers=MSW_HEADERS)
    assert r_cls.status_code == 200
    assert len(r_cls.json()["classification_history"]) == 1

    # 7. Manual MSW decision & recommendation (Approve procedure quotation subsidy)
    r_rec = client.post(
        f"/api/v1/assessments/{asmt_id}/recommendation",
        json={
            "decision": "APPROVED",
            "recommended_tier": "Indigent",
            "recommended_subsidy_pct": 100.0,
            "case_notes": "Household per capita income is ₱1,250.00; qualifies for 100% procedure quotation subsidy.",
            "msw_assessor_name": "Maria Santos, RSW",
        },
        headers=MSW_HEADERS,
    )
    assert r_rec.status_code == 200
    assert r_rec.json()["workflow_status"] == "PENDING_APPROVAL"
    assert r_rec.json()["msw_recommendation"]["decision"] == "APPROVED"

    # 8. Unauthorized institutional approval by MSW or Patient must fail (403)
    r_msw_app = client.post(
        f"/api/v1/assessments/{asmt_id}/approval",
        json={"decision": "APPROVED", "approved_subsidy_percentage": 100.0, "decision_notes": "Self-approve"},
        headers=MSW_HEADERS,
    )
    assert r_msw_app.status_code == 403

    r_pat_app = client.post(
        f"/api/v1/assessments/{asmt_id}/approval",
        json={"decision": "APPROVED", "approved_subsidy_percentage": 100.0, "decision_notes": "Self-approve"},
        headers=PATIENT_HEADERS,
    )
    assert r_pat_app.status_code == 403

    # 9. Authorized institutional approval by Admin
    r_adm_app = client.post(
        f"/api/v1/assessments/{asmt_id}/approval",
        json={
            "decision": "APPROVED",
            "approved_subsidy_percentage": 100.0,
            "decision_notes": "Approved by Hospital Director.",
            "approver_name": "Dr. Director",
        },
        headers=ADMIN_HEADERS,
    )
    assert r_adm_app.status_code == 200
    assert r_adm_app.json()["workflow_status"] == "APPROVED"

    # 10. History trail contains all transitions
    r_hist = client.get(f"/api/v1/assessments/{asmt_id}/history", headers=MSW_HEADERS)
    assert r_hist.status_code == 200
    events = [h["event"] for h in r_hist.json()["history"]]
    assert "ASSESSMENT_CREATED" in events
    assert "ASSESSMENT_CLASSIFIED" in events
    assert "MSW_RECOMMENDATION_SUBMITTED" in events
    assert "INSTITUTIONAL_APPROVED" in events


def test_patient_record_association_and_no_duplicate_drafts(monkeypatch):
    from app.api.v1.endpoints import endpoints as ep
    seed_patients = [
        {
            "id": "rec-2",
            "patient_id": "MSW_FA_1126-01",
            "charity_case_no": "MSW_FA_1126-01",
            "first_name": "Maria Clara",
            "last_name": "Ramos",
            "category": "CHARITY",
            "status": "APPROVED",
            "encounters": [],
            "inquiries": [],
        },
        {
            "id": "rec-3",
            "patient_id": "MSW_FA_1126-02",
            "charity_case_no": "MSW_FA_1126-02",
            "first_name": "Pedro",
            "last_name": "Bautista",
            "category": "CHARITY",
            "status": "APPROVED",
            "encounters": [],
            "inquiries": [],
        },
        {
            "id": "rec-4",
            "patient_id": "MSW_FA_1126-03",
            "charity_case_no": "MSW_FA_1126-03",
            "first_name": "Elena",
            "last_name": "Santos",
            "category": "CHARITY",
            "status": "PENDING",
            "encounters": [],
            "inquiries": [],
        },
        {
            "id": "rec-5",
            "patient_id": "MSW_FA_1126-04",
            "charity_case_no": "MSW_FA_1126-04",
            "first_name": "Ricardo",
            "last_name": "Dalisay",
            "category": "CHARITY",
            "status": "DISAPPROVED/PROMISSORY",
            "encounters": [],
            "inquiries": [],
        },
    ]
    monkeypatch.setattr(ep, "REGISTERED_PATIENTS_REGISTRY", seed_patients)
    monkeypatch.setattr(ep, "_save_patients_registry", lambda: None)

    # 1. Verify Patient A and Patient B return their distinct records
    r_a = client.get("/api/v1/patients/MSW_FA_1126-01", headers=MSW_HEADERS)
    r_b = client.get("/api/v1/patients/MSW_FA_1126-02", headers=MSW_HEADERS)
    assert r_a.status_code == 200
    assert r_b.status_code == 200
    assert r_a.json()["patient"]["patient_id"] == "MSW_FA_1126-01"
    assert r_b.json()["patient"]["patient_id"] == "MSW_FA_1126-02"
    assert r_a.json()["patient"]["last_name"] != r_b.json()["patient"]["last_name"]

    # 2. Missing/invalid patient ID returns 404 (no fallback to random patient)
    r_missing = client.get("/api/v1/patients/INVALID-PATIENT-999", headers=MSW_HEADERS)
    assert r_missing.status_code == 404

    # 3. Creating a draft for Patient A twice reuses the same draft (no duplicates)
    r_d1 = client.post(
        "/api/v1/assessments",
        json={"patient_id": "MSW_FA_1126-01", "stage1_data": {"patient_income": 5000}},
        headers=MSW_HEADERS,
    )
    r_d2 = client.post(
        "/api/v1/assessments",
        json={"patient_id": "MSW_FA_1126-01", "stage1_data": {"patient_income": 6000}},
        headers=MSW_HEADERS,
    )
    assert r_d1.status_code == 201
    assert r_d2.status_code == 201
    assert r_d1.json()["id"] == r_d2.json()["id"]
    assert r_d1.json()["encounter_no"] == r_d2.json()["encounter_no"]

    # 4. Patient B's latest draft is completely isolated from Patient A
    r_b_draft = client.get("/api/v1/assessments/patient/MSW_FA_1126-02/latest-draft", headers=MSW_HEADERS)
    assert r_b_draft.status_code == 200
    if r_b_draft.json()["found"]:
        assert r_b_draft.json()["assessment"]["patient_id"] == "MSW_FA_1126-02"
        assert r_b_draft.json()["assessment"]["id"] != r_d1.json()["id"]

    # 5. Verify dynamic interactive sequential charity numbering
    r_seq = client.get("/api/v1/patients/next-charity-case-no")
    assert r_seq.status_code == 200
    next_case_no = r_seq.json()["next_case_no"]
    assert next_case_no.startswith("MSW_FA_")
    # Must be sequential after MSW_FA_1126-04
    assert next_case_no == "MSW_FA_1126-05"
