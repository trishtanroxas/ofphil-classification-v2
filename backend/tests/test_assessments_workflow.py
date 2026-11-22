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

    # 3. Save Stage 2 draft
    r_patch = client.patch(
        f"/api/v1/assessments/{asmt_id}",
        json={
            "active_stage": 2,
            "stage2_data": {
                "health_factors": [
                    {"factor": "Absence of adequate health services", "severity": 4, "coping": 4},
                    {"factor": "Inaccessibility", "severity": 4, "coping": 4},
                ],
                "discrimination_severity": 3,
                "discrimination_coping": 3,
                "safety_severity": 3,
                "safety_coping": 3,
                "roles_severity": 4,
                "roles_coping": 4,
                "environment_severity": 4,
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

    # 5. Submit & classify
    r_sub = client.post(
        f"/api/v1/assessments/{asmt_id}/submit",
        json={"is_initial_load": False, "assessment_context": "live_recalculation"},
        headers=MSW_HEADERS,
    )
    assert r_sub.status_code == 200
    sub_data = r_sub.json()
    assert sub_data["classification_result"]["financial_classification"]["classification"] == "INDIGENT"
    assert sub_data["classification_result"]["msw_classification"]["classification"] in {
        "FINANCIALLY_INCAPACITATED_B1",
        "INDIGENT",
    }

    # 6. Get classification & history
    r_cls = client.get(f"/api/v1/assessments/{asmt_id}/classification", headers=MSW_HEADERS)
    assert r_cls.status_code == 200
    assert len(r_cls.json()["classification_history"]) == 1

    # 7. MSW recommendation
    r_rec = client.post(
        f"/api/v1/assessments/{asmt_id}/recommendation",
        json={
            "recommended_tier": "Indigent",
            "recommended_subsidy_pct": 100.0,
            "case_notes": "Household per capita income is ₱1,250.00; qualifies for 100% full charity subsidy.",
            "msw_assessor_name": "Maria Santos, RSW",
        },
        headers=MSW_HEADERS,
    )
    assert r_rec.status_code == 200
    assert r_rec.json()["workflow_status"] == "PENDING_APPROVAL"

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
