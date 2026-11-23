import re
import time
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY
from app.main import app
from app.services.recovery_service import recovery_service
from app.services.settings_service import settings_service

client = TestClient(app)


@pytest.fixture(autouse=True)
def preserve_accounts_and_sessions():
    """Snapshot and restore live account/patient contact state after each test."""
    recovery_service._rate_history.clear()
    recovery_service._sessions.clear()

    orig_patient = dict(REGISTERED_PATIENTS_REGISTRY[0])
    orig_msw = dict(settings_service._cache["msw_account"])
    orig_adm = dict(settings_service._cache["account"])

    yield

    REGISTERED_PATIENTS_REGISTRY[0].clear()
    REGISTERED_PATIENTS_REGISTRY[0].update(orig_patient)
    settings_service._cache["msw_account"] = orig_msw
    settings_service._cache["account"] = orig_adm
    settings_service._save_to_storage()
    recovery_service._rate_history.clear()
    recovery_service._sessions.clear()


@pytest.mark.parametrize(
    "role,user_id,old_email,new_email",
    [
        ("patient", "M26-11-00001", "tan1925alex@gmail.com", "patient.new@gmail.com"),
        ("msw", "msw_lead", "roxastal.cbpa@gmail.com", "msw.new@ofphil.org.ph"),
        ("admin", "admin_sys", "trishtanroxas@gmail.com", "admin.new@ofphil.org.ph"),
    ],
)
def test_email_change_flow_and_recovery_integration(role, user_id, old_email, new_email):
    captured = {"otps": [], "notices": []}

    def fake_otp_email(to_email, role_title, recipient_name, code, expires_minutes=5):
        captured["otps"].append({"to": to_email, "code": code})
        return (True, None)

    def fake_notice_email(to_email, role_title, recipient_name, contact_type_label, old_masked, new_masked, changed_at, is_new_address=False):
        captured["notices"].append({"to": to_email, "is_new": is_new_address})
        return (True, None)

    # 1. Unauthorized role header rejected (403)
    other_role = "msw" if role != "msw" else "admin"
    r_unauth = client.post(
        "/api/v1/auth/profile-contact/request-otp",
        headers={"x-user-role": other_role},
        json={
            "role": role,
            "user_id": user_id,
            "contact_type": "email",
            "new_value": new_email,
            "current_password": "Ofphil@2026",
        },
    )
    assert r_unauth.status_code == 403

    # 2. Failed email delivery does not update email
    with patch("app.services.recovery_service.send_contact_change_otp_email", return_value=(False, "SMTP error")):
        r_fail = client.post(
            "/api/v1/auth/profile-contact/request-otp",
            headers={"x-user-role": role},
            json={
                "role": role,
                "user_id": user_id,
                "contact_type": "email",
                "new_value": new_email,
                "current_password": "Ofphil@2026",
            },
        )
    assert r_fail.status_code == 503

    # 3. Valid request sends OTP ONLY to the NEW email
    with patch("app.services.recovery_service.send_contact_change_otp_email", side_effect=fake_otp_email):
        r_req = client.post(
            "/api/v1/auth/profile-contact/request-otp",
            headers={"x-user-role": role},
            json={
                "role": role,
                "user_id": user_id,
                "contact_type": "email",
                "new_value": new_email,
                "current_password": "Ofphil@2026",
            },
        )
    assert r_req.status_code == 200
    data = r_req.json()
    assert "otp" not in data and "security_code" not in data
    assert captured["otps"][0]["to"] == new_email
    change_id = data["change_id"]
    otp = captured["otps"][0]["code"]

    # 4. Resend cooldown enforced (429)
    r_cd = client.post(
        "/api/v1/auth/profile-contact/resend-otp",
        headers={"x-user-role": role},
        json={"change_id": change_id},
    )
    assert r_cd.status_code == 429

    # 5. Incorrect OTP rejected without updating email
    bad_otp = "000000" if otp != "000000" else "111111"
    r_bad = client.post(
        "/api/v1/auth/profile-contact/verify",
        headers={"x-user-role": role},
        json={"change_id": change_id, "otp_code": bad_otp},
    )
    assert r_bad.status_code == 400

    # 6. Correct OTP commits change and sends security notices to old and new email
    with patch("app.services.recovery_service.send_contact_change_security_notice_email", side_effect=fake_notice_email):
        r_ok = client.post(
            "/api/v1/auth/profile-contact/verify",
            headers={"x-user-role": role},
            json={"change_id": change_id, "otp_code": otp},
        )
    assert r_ok.status_code == 200
    assert r_ok.json()["updated_value"] == new_email
    notice_targets = {n["to"] for n in captured["notices"]}
    assert new_email in notice_targets

    # 7. OTP reuse rejected
    r_reuse = client.post(
        "/api/v1/auth/profile-contact/verify",
        headers={"x-user-role": role},
        json={"change_id": change_id, "otp_code": otp},
    )
    assert r_reuse.status_code == 400

    # 8. Password recovery now uses the NEW email and rejects the OLD email
    ident = user_id
    r_old_rec = client.post(
        "/api/v1/auth/forgot-password",
        json={
            "role": role,
            "identifier": ident,
            "birthdate": "1978-05-15" if role == "patient" else None,
            "recovery_method": "email",
            "email": old_email,
        },
    )
    assert r_old_rec.status_code == 400

    with patch("app.services.recovery_service.send_password_reset_email", return_value=True):
        r_new_rec = client.post(
            "/api/v1/auth/forgot-password",
            json={
                "role": role,
                "identifier": ident,
                "birthdate": "1978-05-15" if role == "patient" else None,
                "recovery_method": "email",
                "email": new_email,
            },
        )
    assert r_new_rec.status_code == 200


@pytest.mark.parametrize(
    "role,user_id,new_mobile,login_payload",
    [
        (
            "patient",
            "M26-11-00001",
            "0917 999 8888",
            {"role": "patient", "patient_id": "M26-11-00001", "birthdate": "1978-05-15", "password": "Ofphil@2026"},
        ),
        (
            "msw",
            "msw_lead",
            "0918 999 7777",
            {"role": "msw", "username": "msw_lead", "password": "Ofphil@2026"},
        ),
        (
            "admin",
            "admin_sys",
            "0917 999 6666",
            {"role": "admin", "username": "admin_sys", "password": "Ofphil@2026"},
        ),
    ],
)
def test_mobile_change_flow_and_2fa_integration(role, user_id, new_mobile, login_payload):
    # 1. Unconfigured SEMAPHORE_API_KEY fails cleanly (503) without updating mobile
    with patch("app.services.sms_service.settings.SEMAPHORE_API_KEY", None):
        r_unconf = client.post(
            "/api/v1/auth/profile-contact/request-otp",
            headers={"x-user-role": role},
            json={
                "role": role,
                "user_id": user_id,
                "contact_type": "mobile",
                "new_value": new_mobile,
                "current_password": "Ofphil@2026",
            },
        )
    assert r_unconf.status_code == 503

    # 2. Configured Semaphore sends OTP to NEW mobile
    mock_resp = MagicMock(status_code=200)
    sent_sms = []

    def fake_sms_post(url, data=None, timeout=10.0):
        sent_sms.append(dict(data))
        return mock_resp

    with patch("app.services.sms_service.settings.SEMAPHORE_API_KEY", "test-key"), \
         patch("app.services.sms_service.httpx.post", side_effect=fake_sms_post):
        r_req = client.post(
            "/api/v1/auth/profile-contact/request-otp",
            headers={"x-user-role": role},
            json={
                "role": role,
                "user_id": user_id,
                "contact_type": "mobile",
                "new_value": new_mobile,
                "current_password": "Ofphil@2026",
            },
        )
    assert r_req.status_code == 200
    assert sent_sms[0]["number"] == new_mobile.replace(" ", "")
    otp = re.search(r"\b(\d{6})\b", sent_sms[0]["message"]).group(1)
    change_id = r_req.json()["change_id"]

    # 3. Verify OTP commits new mobile
    with patch("app.services.sms_service.settings.SEMAPHORE_API_KEY", "test-key"), \
         patch("app.services.sms_service.httpx.post", side_effect=fake_sms_post), \
         patch("app.services.recovery_service.send_contact_change_security_notice_email", return_value=(True, None)):
        r_ok = client.post(
            "/api/v1/auth/profile-contact/verify",
            headers={"x-user-role": role},
            json={"change_id": change_id, "otp_code": otp},
        )
    assert r_ok.status_code == 200
    assert r_ok.json()["updated_value"] == new_mobile

    # 4. 2FA now masks and uses the NEW mobile number
    r_login = client.post("/api/v1/auth/login", json=login_payload)
    assert r_login.status_code == 200
    methods = {m["method"]: m for m in r_login.json()["available_methods"]}
    assert methods["sms"]["masked_destination"].endswith(new_mobile[-3:])


def test_duplicate_contact_cancel_expiry_and_direct_profile_protection():
    # 1. Duplicate email belonging to another account is rejected (409)
    r_dup = client.post(
        "/api/v1/auth/profile-contact/request-otp",
        headers={"x-user-role": "msw"},
        json={
            "role": "msw",
            "user_id": "msw_lead",
            "contact_type": "email",
            "new_value": "tan1925alex@gmail.com",
            "current_password": "Ofphil@2026",
        },
    )
    assert r_dup.status_code == 409

    # 2. Cancelled change leaves original email untouched
    with patch("app.services.recovery_service.send_contact_change_otp_email", return_value=(True, None)):
        r_req = client.post(
            "/api/v1/auth/profile-contact/request-otp",
            headers={"x-user-role": "msw"},
            json={
                "role": "msw",
                "user_id": "msw_lead",
                "contact_type": "email",
                "new_value": "cancelled.msw@ofphil.org.ph",
                "current_password": "Ofphil@2026",
            },
        )
    assert r_req.status_code == 200
    cid = r_req.json()["change_id"]
    r_cancel = client.post(
        "/api/v1/auth/profile-contact/cancel",
        headers={"x-user-role": "msw"},
        json={"change_id": cid},
    )
    assert r_cancel.status_code == 200
    assert settings_service._cache["msw_account"]["email"] == "roxastal.cbpa@gmail.com"

    # 3. Expired OTP rejected
    recovery_service._rate_history.clear()
    captured = {}

    def fake_email(to_email, role_title, recipient_name, code, expires_minutes=5):
        captured["code"] = code
        return (True, None)

    with patch("app.services.recovery_service.send_contact_change_otp_email", side_effect=fake_email):
        r_req2 = client.post(
            "/api/v1/auth/profile-contact/request-otp",
            headers={"x-user-role": "msw"},
            json={
                "role": "msw",
                "user_id": "msw_lead",
                "contact_type": "email",
                "new_value": "expired.msw@ofphil.org.ph",
                "current_password": "Ofphil@2026",
            },
        )
    cid2 = r_req2.json()["change_id"]
    recovery_service._sessions[cid2]["expires_at"] = time.time() - 5
    r_exp = client.post(
        "/api/v1/auth/profile-contact/verify",
        headers={"x-user-role": "msw"},
        json={"change_id": cid2, "otp_code": captured["code"]},
    )
    assert r_exp.status_code == 400
    assert settings_service._cache["msw_account"]["email"] == "roxastal.cbpa@gmail.com"

    # 4. Direct PUT /admin/settings/msw/account/profile cannot overwrite email or contact
    client.put(
        "/api/v1/admin/settings/msw/account/profile",
        json={
            "full_name": "Maria Santos, RSW",
            "email": "hijack@evil.com",
            "contact": "0999 000 0000",
        },
    )
    assert settings_service._cache["msw_account"]["email"] == "roxastal.cbpa@gmail.com"
    assert settings_service._cache["msw_account"]["contact"] == "0918 555 1234"
