import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.v1.endpoints import endpoints as ep
from app.services.referral_service import referral_service

client = TestClient(app)
MSW_HDRS = {"x-user-role": "msw", "x-user-id": "msw_lead"}


@pytest.fixture(autouse=True)
def _seed_referral_test_fixtures(monkeypatch):
    seed_patients = [
        {
            "id": "rec-1",
            "patient_id": "M26-11-00001",
            "first_name": "Juan",
            "middle_name": "Santos",
            "last_name": "Dela Cruz",
            "category": "REGULAR",
            "status": "AWAITING MSW REVIEW",
            "assigned_msw": "Maria Santos, RSW (msw_lead)",
            "encounters": [],
            "inquiries": [],
        },
        {
            "id": "rec-2",
            "patient_id": "M26-11-00002",
            "charity_case_no": "MSW_FA_1126-01",
            "first_name": "Maria Clara",
            "last_name": "Ramos",
            "category": "CHARITY",
            "status": "APPROVED",
            "assigned_msw": "Maria Santos, RSW (msw_lead)",
            "encounters": [],
            "inquiries": [],
        },
    ]
    monkeypatch.setattr(ep, "REGISTERED_PATIENTS_REGISTRY", seed_patients)
    monkeypatch.setattr(ep, "_save_patients_registry", lambda: None)

    with referral_service._connect() as conn:
        orig_rows = [dict(r) for r in conn.execute("SELECT * FROM financial_referrals WHERE patient_id IN ('M26-11-00001', 'MSW_FA_1126-01')").fetchall()]
        conn.execute("DELETE FROM financial_referrals WHERE patient_id = 'M26-11-00001' AND id != 'OFPHIL-FA-2026-0001'")
        conn.execute(
            "UPDATE financial_referrals SET status = 'Awaiting MSW Review', charity_case_no = NULL, assessment_id = NULL WHERE id = 'OFPHIL-FA-2026-0001'"
        )
        # Ensure repeat-assistance fixture for MSW_FA_1126-01 has at least 2 referrals
        cur_cnt = conn.execute("SELECT COUNT(*) FROM financial_referrals WHERE patient_id = 'MSW_FA_1126-01'").fetchone()[0]
        added_ids = []
        if cur_cnt < 2:
            for idx in range(2 - cur_cnt):
                rid = f"OFPHIL-FA-TEST-REP-{idx + 1}"
                added_ids.append(rid)
                conn.execute(
                    """
                    INSERT OR IGNORE INTO financial_referrals (
                        id, referral_no, patient_id, patient_name, diagnosis, eye_laterality,
                        procedure, clinical_findings, particulars, total, requested_amount,
                        attending_doctor, doctor_signature_title, referring_individual,
                        referring_signature_title, status, charity_case_no, assessment_id, notes, created_at, updated_at
                    ) VALUES (?, ?, 'MSW_FA_1126-01', 'Maria Clara Ramos', 'Senile Cataract', 'OS',
                              'Phacoemulsification', '', '[]', 11600.0, 11600.0,
                              'Dr. J. E. Garcia, MD', '', 'Dr. Roberto Reyes, MD', '',
                              'MSW APPROVED', 'MSW_FA_1126-01', NULL, '', '2026-11-20T08:00:00Z', '2026-11-20T08:00:00Z')
                    """,
                    (rid, f"REF-REP-{idx + 1}"),
                )
        conn.commit()
    try:
        yield
    finally:
        with referral_service._connect() as conn:
            for rid in added_ids:
                conn.execute("DELETE FROM financial_referrals WHERE id = ?", (rid,))
            for r in orig_rows:
                conn.execute(
                    "UPDATE financial_referrals SET status = ?, charity_case_no = ?, assessment_id = ? WHERE id = ?",
                    (r.get("status"), r.get("charity_case_no"), r.get("assessment_id"), r["id"]),
                )
            conn.commit()

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
