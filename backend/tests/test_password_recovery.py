import time
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.core.security import verify_password
from app.main import app
from app.services.recovery_service import recovery_service
from app.services.settings_service import settings_service

client = TestClient(app)


def _reset_rate_limits():
    recovery_service._rate_history.clear()
    recovery_service._sessions.clear()


def test_patient_identity_and_contact_validation():
    _reset_rate_limits()

    # 1. Incorrect Patient ID with valid email of M26-11-00001
    r_bad_id = client.post(
        "/api/v1/auth/forgot-password",
        json={
            "role": "patient",
            "identifier": "M26-99-99999",
            "birthdate": "1978-05-15",
            "recovery_method": "email",
            "email": "tan1925alex@gmail.com",
        },
    )
    assert r_bad_id.status_code == 400

    # 2. Incorrect Birthday
    r_bad_bday = client.post(
        "/api/v1/auth/forgot-password",
        json={
            "role": "patient",
            "identifier": "M26-11-00001",
            "birthdate": "1990-01-01",
            "recovery_method": "email",
            "email": "tan1925alex@gmail.com",
        },
    )
    assert r_bad_bday.status_code == 400

    # 3. Unrelated Email (roxas.t.bscs@gmail.com must be REJECTED for M26-11-00001)
    r_unrelated_email = client.post(
        "/api/v1/auth/forgot-password",
        json={
            "role": "patient",
            "identifier": "M26-11-00001",
            "birthdate": "1978-05-15",
            "recovery_method": "email",
            "email": "roxas.t.bscs@gmail.com",
        },
    )
    assert r_unrelated_email.status_code == 400

    # 4. Another patient's email (maria.ramos@example.ph) for M26-11-00001 -> REJECT
    r_other_patient_email = client.post(
        "/api/v1/auth/forgot-password",
        json={
            "role": "patient",
            "identifier": "M26-11-00001",
            "birthdate": "1978-05-15",
            "recovery_method": "email",
            "email": "maria.ramos@example.ph",
        },
    )
    assert r_other_patient_email.status_code == 400

    # 5. M26-11-00001's email used with another Patient ID (MSW_FA_1126-01) -> REJECT
    r_cross_patient = client.post(
        "/api/v1/auth/forgot-password",
        json={
            "role": "patient",
            "identifier": "MSW_FA_1126-01",
            "birthdate": "1968-08-20",
            "recovery_method": "email",
            "email": "tan1925alex@gmail.com",
        },
    )
    assert r_cross_patient.status_code == 400

    # 6. Unverified email on MSW_FA_1126-01 (email_verified=False) -> REJECT
    r_unverified_email = client.post(
        "/api/v1/auth/forgot-password",
        json={
            "role": "patient",
            "identifier": "MSW_FA_1126-01",
            "birthdate": "1968-08-20",
            "recovery_method": "email",
            "email": "maria.ramos@example.ph",
        },
    )
    assert r_unverified_email.status_code == 400

    # 7. Mismatched Mobile
    r_bad_mob = client.post(
        "/api/v1/auth/forgot-password",
        json={
            "role": "patient",
            "identifier": "M26-11-00001",
            "birthdate": "1978-05-15",
            "recovery_method": "sms",
            "mobile": "0999 111 2222",
        },
    )
    assert r_bad_mob.status_code == 400


def test_patient_email_recovery_full_flow_and_otp_security():
    _reset_rate_limits()
    captured = {}

    def fake_send_email(to_email, role_title, identifier, reset_link, code):
        captured["to"] = to_email
        captured["code"] = code
        return True

    with patch("app.services.recovery_service.send_password_reset_email", side_effect=fake_send_email):
        r_req = client.post(
            "/api/v1/auth/forgot-password",
            json={
                "role": "patient",
                "identifier": "M26-11-00001",
                "birthdate": "1978-05-15",
                "recovery_method": "email",
                "email": "tan1925alex@gmail.com",
            },
        )
    assert r_req.status_code == 200
    data = r_req.json()
    # OTP must NEVER appear in API response
    assert "code" not in data
    assert "otp" not in data
    assert data["delivery_method"] == "email"
    assert data["masked_destination"] == "t****@gmail.com"
    assert captured["to"] == "tan1925alex@gmail.com"
    rec_id = data["recovery_id"]
    otp = captured["code"]
    assert len(otp) == 6 and otp.isdigit()

    # Cooldown blocks immediate duplicate request
    r_cool = client.post(
        "/api/v1/auth/forgot-password",
        json={
            "role": "patient",
            "identifier": "M26-11-00001",
            "birthdate": "1978-05-15",
            "recovery_method": "email",
            "email": "tan1925alex@gmail.com",
        },
    )
    assert r_cool.status_code == 429

    # Invalid OTP rejected
    r_wrong = client.post(
        "/api/v1/auth/verify-recovery-otp",
        json={"recovery_id": rec_id, "otp": "000000" if otp != "000000" else "111111"},
    )
    assert r_wrong.status_code == 400

    # Valid OTP succeeds and returns reset_token
    r_ok = client.post(
        "/api/v1/auth/verify-recovery-otp",
        json={"recovery_id": rec_id, "otp": otp},
    )
    assert r_ok.status_code == 200
    reset_token = r_ok.json()["reset_token"]

    # Attempt to reuse same OTP must fail
    r_reuse = client.post(
        "/api/v1/auth/verify-recovery-otp",
        json={"recovery_id": rec_id, "otp": otp},
    )
    assert r_reuse.status_code == 400

    # Complete password reset
    r_reset = client.post(
        "/api/v1/auth/reset-password",
        json={
            "recovery_id": rec_id,
            "reset_token": reset_token,
            "new_password": "NewPatient@2026",
            "confirm_password": "NewPatient@2026",
        },
    )
    assert r_reset.status_code == 200
    assert r_reset.json()["login_path"] == "/login-patient"

    # Attempt to reuse reset_token must fail
    r_reset_reuse = client.post(
        "/api/v1/auth/reset-password",
        json={
            "recovery_id": rec_id,
            "reset_token": reset_token,
            "new_password": "Another@Password1",
            "confirm_password": "Another@Password1",
        },
    )
    assert r_reset_reuse.status_code == 400

    # Cleanup patient credentials so subsequent test suites retain default password
    from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY
    for p in REGISTERED_PATIENTS_REGISTRY:
        if str(p.get("patient_id", "")).strip().upper() == "M26-11-00001":
            p.pop("password_hash", None)
            break
    recovery_service._patient_creds.pop("M26-11-00001", None)
    recovery_service._save_patient_creds()


def test_sms_unconfigured_does_not_simulate_and_configured_semaphore_works():
    _reset_rate_limits()

    # 1. Without SEMAPHORE_API_KEY configured, must fail cleanly (503) instead of pretending SMS was sent
    with patch("app.services.sms_service.settings.SEMAPHORE_API_KEY", None):
        r_unconf = client.post(
            "/api/v1/auth/forgot-password",
            json={
                "role": "patient",
                "identifier": "M26-11-00001",
                "birthdate": "1978-05-15",
                "recovery_method": "sms",
                "mobile": "0917 888 1678",
            },
        )
        assert r_unconf.status_code == 503

    # 2. With SEMAPHORE_API_KEY configured and Semaphore HTTP 200, dispatches SMS OTP
    mock_resp = MagicMock(status_code=200)
    with patch("app.services.sms_service.settings.SEMAPHORE_API_KEY", "test-semaphore-key"), \
         patch("app.services.sms_service.httpx.post", return_value=mock_resp) as mock_post:
        r_sms = client.post(
            "/api/v1/auth/forgot-password",
            json={
                "role": "patient",
                "identifier": "M26-11-00001",
                "birthdate": "1978-05-15",
                "recovery_method": "sms",
                "mobile": "0917 888 1678",
            },
        )
        assert r_sms.status_code == 200
        assert r_sms.json()["delivery_method"] == "sms"
        assert r_sms.json()["masked_destination"] == "09******678"
        assert mock_post.called


def test_expired_otp_rejected():
    _reset_rate_limits()
    captured = {}

    def fake_send(to_email, role_title, identifier, reset_link, code):
        captured["code"] = code
        return True

    with patch("app.services.recovery_service.send_password_reset_email", side_effect=fake_send):
        r = client.post(
            "/api/v1/auth/forgot-password",
            json={
                "role": "msw",
                "identifier": "msw_lead",
                "recovery_method": "email",
                "email": settings_service._cache["msw_account"]["email"],
            },
        )
    assert r.status_code == 200
    rec_id = r.json()["recovery_id"]
    # Simulate expiry
    recovery_service._sessions[rec_id]["expires_at"] = time.time() - 10
    r_exp = client.post(
        "/api/v1/auth/verify-recovery-otp",
        json={"recovery_id": rec_id, "otp": captured["code"]},
    )
    assert r_exp.status_code == 400
    assert "expired" in r_exp.json()["detail"].lower()


def test_msw_and_admin_recovery_flows():
    _reset_rate_limits()
    orig_msw_hash = settings_service._cache["msw_account"]["password_hash"]
    orig_adm_hash = settings_service._cache["account"]["password_hash"]

    try:
        # MSW wrong email rejected
        r_bad_msw = client.post(
            "/api/v1/auth/forgot-password",
            json={
                "role": "msw",
                "identifier": "msw_lead",
                "recovery_method": "email",
                "email": "wrong@ofphil.org.ph",
            },
        )
        assert r_bad_msw.status_code == 400

        # MSW valid email recovery
        captured_msw = {}
        with patch(
            "app.services.recovery_service.send_password_reset_email",
            side_effect=lambda **kw: captured_msw.update(kw) or True,
        ):
            r_msw = client.post(
                "/api/v1/auth/forgot-password",
                json={
                    "role": "msw",
                    "identifier": "msw_lead",
                    "recovery_method": "email",
                    "email": settings_service._cache["msw_account"]["email"],
                },
            )
        assert r_msw.status_code == 200
        v_msw = client.post(
            "/api/v1/auth/verify-recovery-otp",
            json={"recovery_id": r_msw.json()["recovery_id"], "otp": captured_msw["code"]},
        )
        assert v_msw.status_code == 200
        res_msw = client.post(
            "/api/v1/auth/reset-password",
            json={
                "recovery_id": r_msw.json()["recovery_id"],
                "reset_token": v_msw.json()["reset_token"],
                "new_password": "MswStrong@2026",
                "confirm_password": "MswStrong@2026",
            },
        )
        assert res_msw.status_code == 200
        assert verify_password("MswStrong@2026", settings_service._cache["msw_account"]["password_hash"])

        # Admin valid SMS recovery
        mock_resp = MagicMock(status_code=200)
        captured_adm_msg = {}

        def fake_sms(url, data, timeout):
            captured_adm_msg["msg"] = data["message"]
            return mock_resp

        with patch("app.services.sms_service.settings.SEMAPHORE_API_KEY", "test-key"), \
             patch("app.services.sms_service.httpx.post", side_effect=fake_sms):
            r_adm = client.post(
                "/api/v1/auth/forgot-password",
                json={
                    "role": "admin",
                    "identifier": "admin_sys",
                    "recovery_method": "sms",
                    "mobile": "0917 000 0001",
                },
            )
        assert r_adm.status_code == 200
        import re
        otp_adm = re.search(r"\b(\d{6})\b", captured_adm_msg["msg"]).group(1)
        v_adm = client.post(
            "/api/v1/auth/verify-recovery-otp",
            json={"recovery_id": r_adm.json()["recovery_id"], "otp": otp_adm},
        )
        assert v_adm.status_code == 200
        res_adm = client.post(
            "/api/v1/auth/reset-password",
            json={
                "recovery_id": r_adm.json()["recovery_id"],
                "reset_token": v_adm.json()["reset_token"],
                "new_password": "AdminStrong@2026",
                "confirm_password": "AdminStrong@2026",
            },
        )
        assert res_adm.status_code == 200
        assert verify_password("AdminStrong@2026", settings_service._cache["account"]["password_hash"])
    finally:
        # Restore original hashes so local dev credentials remain intact
        settings_service._cache["msw_account"]["password_hash"] = orig_msw_hash
        settings_service._cache["account"]["password_hash"] = orig_adm_hash
        settings_service._save_to_storage()


def test_cross_account_and_session_type_isolation():
    _reset_rate_limits()

    # 1. MSW and Admin reject unrelated email/mobile
    r_msw_bad = client.post(
        "/api/v1/auth/forgot-password",
        json={
            "role": "msw",
            "identifier": "msw_lead",
            "recovery_method": "email",
            "email": "roxas.t.bscs@gmail.com",
        },
    )
    assert r_msw_bad.status_code == 400

    r_adm_bad = client.post(
        "/api/v1/auth/forgot-password",
        json={
            "role": "admin",
            "identifier": "admin_sys",
            "recovery_method": "sms",
            "mobile": "0917 888 1678",
        },
    )
    assert r_adm_bad.status_code == 400

    # 2. Recovery OTP session cannot be used on 2FA verify endpoint
    captured = {}

    def fake_email(to_email, role_title, identifier, reset_link, code):
        captured["code"] = code
        return True

    with patch("app.services.recovery_service.send_password_reset_email", side_effect=fake_email):
        r_rec = client.post(
            "/api/v1/auth/forgot-password",
            json={
                "role": "patient",
                "identifier": "M26-11-00001",
                "birthdate": "1978-05-15",
                "recovery_method": "email",
                "email": "tan1925alex@gmail.com",
            },
        )
    assert r_rec.status_code == 200
    rec_id = r_rec.json()["recovery_id"]
    otp = captured["code"]

    r_cross_2fa = client.post(
        "/api/v1/auth/verify-2fa",
        json={"session_id": rec_id, "otp_code": otp, "role": "patient"},
    )
    assert r_cross_2fa.status_code == 400


def test_password_policy_no_uppercase_requirement_and_min_6_chars():
    _reset_rate_limits()

    # 1. Profile password change OTP: reject length < 6
    r_short = client.post(
        "/api/v1/auth/profile-password/request-otp",
        json={
            "role": "patient",
            "user_id": "M26-11-00001",
            "current_password": "Ofphil@2026",
            "new_password": "short",
            "confirm_password": "short",
            "method": "email",
        },
    )
    assert r_short.status_code == 422
    assert "at least 6 characters" in str(r_short.json()["detail"]).lower()

    # 2. Profile password change OTP: accept password WITHOUT uppercase (e.g. @imlexi1925)
    captured = {}

    def fake_profile_otp(*args, **kwargs):
        captured["code"] = kwargs.get("code")
        return (True, None)

    with patch("app.services.recovery_service.send_profile_password_otp_email", side_effect=fake_profile_otp):
        r_valid_no_upper = client.post(
            "/api/v1/auth/profile-password/request-otp",
            json={
                "role": "patient",
                "user_id": "M26-11-00001",
                "current_password": "Ofphil@2026",
                "new_password": "@imlexi1925",
                "confirm_password": "@imlexi1925",
                "method": "email",
            },
        )
    assert r_valid_no_upper.status_code == 200
    assert r_valid_no_upper.json()["status"] == "otp_sent"
