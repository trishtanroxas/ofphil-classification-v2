from fastapi.testclient import TestClient
from app.main import app
from app.services.referral_service import referral_service

client = TestClient(app)
MSW_HDRS = {"x-user-role": "msw", "x-user-id": "msw_lead"}

def test_financial_referral_assistance_history_and_approval():
    # 1. Fetch Juan Dela Cruz (M26-11-00001) - new referral awaiting MSW review
    res_list = client.get("/api/v1/referrals", headers=MSW_HDRS)
    assert res_list.status_code == 200
    referrals = res_list.json()["referrals"]
    
    juan_ref = next((r for r in referrals if r["patient_id"] == "M26-11-00001"), None)
    assert juan_ref is not None
    assert juan_ref["status"] in {"Awaiting MSW Review", "Endorsed for Financial Assistance"}
    assert juan_ref["charity_case_no"] is None
    
    # Juan has only 1 current referral, so previous assistance requests should be 0 -> FIRST ASSISTANCE
    history = juan_ref.get("assistance_history")
    assert history is not None
    assert history["classification"] == "FIRST ASSISTANCE"
    assert history["badge_label"] == "FIRST ASSISTANCE"
    assert history["total_previous_requests"] == 0

    # 2. Check Dossier for Juan Dela Cruz
    dossier_res = client.get("/api/v1/msw/patients/M26-11-00001/dossier", headers=MSW_HDRS)
    assert dossier_res.status_code == 200
    dossier_data = dossier_res.json()
    assert dossier_data["patient"]["status"] == "AWAITING MSW REVIEW"
    assert dossier_data["is_charity_patient"] is False
    assert dossier_data["show_charity_status_tab"] is False
    assert "assistance_history" in dossier_data
    assert dossier_data["assistance_history"]["classification"] == "FIRST ASSISTANCE"

    # 3. Test approval validation: mismatched patient ID fails
    bad_approve = client.post(
        f"/api/v1/referrals/{juan_ref['id']}/approve",
        headers=MSW_HDRS,
        json={"patient_id": "DIFFERENT_PATIENT_ID", "notes": "Test mismatched patient"}
    )
    assert bad_approve.status_code == 400
    assert "Patient ID mismatch" in bad_approve.json()["detail"]

    # 4. Test approval validation: non-MSW role rejected
    unauth_approve = client.post(
        f"/api/v1/referrals/{juan_ref['id']}/approve",
        headers={"x-user-role": "nurse", "x-user-id": "nurse_01"},
        json={"patient_id": "M26-11-00001"}
    )
    assert unauth_approve.status_code == 403

    # 5. Check Repeat Assistance patient (Maria Clara Ramos - MSW_FA_1126-01)
    maria_history_res = client.get("/api/v1/patients/MSW_FA_1126-01/assistance-history")
    assert maria_history_res.status_code == 200
    maria_hist = maria_history_res.json()["assistance_history"]
    # Maria has multiple referrals in DB
    assert maria_hist["classification"] == "REPEAT ASSISTANCE"
    assert "REPEAT ASSISTANCE" in maria_hist["badge_label"]
