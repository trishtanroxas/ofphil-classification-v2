"""
Automated Pytest Suite for Clinic Administration Settings.
Verifies:
- All 7 Settings Endpoints
- Role-Based Access Control (Admin allowed, Researcher forbidden)
- Validation errors on bad input
- Auditing on updates
- Password hashing and verification
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.settings_service import settings_service

client = TestClient(app)


def test_organization_profile_get():
    # Admin access
    res = client.get("/api/v1/admin/settings/organization", headers={"x-user-role": "admin"})
    assert res.status_code == 200
    data = res.json()
    assert "legal_name" in data
    assert "operating_desk" in data
    assert "inquiries_email" in data


def test_organization_profile_update_and_rbac():
    # Researcher should be forbidden
    res_forbidden = client.put(
        "/api/v1/admin/settings/organization",
        headers={"x-user-role": "researcher"},
        json={
            "legal_name": "Test Clinic",
            "operating_desk": "Desk A",
            "clinic_address": "Manila Address",
            "hotline_contact": "0912345678",
            "inquiries_email": "test@ofphil.org.ph",
            "operating_hours": "8am - 5pm"
        }
    )
    assert res_forbidden.status_code == 403

    # Admin should succeed
    res_success = client.put(
        "/api/v1/admin/settings/organization",
        headers={"x-user-role": "admin", "x-user-id": "admin_sys"},
        json={
            "legal_name": "OFPHIL Eye Center Manila Updated",
            "operating_desk": "Medical Social Service & Eye Surgery Admissions Wing",
            "clinic_address": "Metro Manila Eye Center, Manila, Philippines",
            "hotline_contact": "(02) 8888-OPHI (6744) / Local 104",
            "inquiries_email": "admin.updated@ofphil.org.ph",
            "operating_hours": "Monday to Friday: 8:00 AM – 4:00 PM"
        }
    )
    assert res_success.status_code == 200
    assert res_success.json()["success"] is True

    # Verify persistence
    check = client.get("/api/v1/admin/settings/organization", headers={"x-user-role": "admin"})
    assert check.json()["legal_name"] == "OFPHIL Eye Center Manila Updated"
    assert check.json()["inquiries_email"] == "admin.updated@ofphil.org.ph"


def test_security_policies_flow():
    # Non-admin forbidden
    res_msw = client.get("/api/v1/admin/settings/security", headers={"x-user-role": "msw"})
    assert res_msw.status_code == 403

    # Admin get
    res = client.get("/api/v1/admin/settings/security", headers={"x-user-role": "admin"})
    assert res.status_code == 200
    sec_data = res.json()
    assert sec_data["auth_policies"]["enforce_2fa"] is True

    # Admin update
    sec_data["session_policies"]["session_timeout_minutes"] = 45
    update_res = client.put(
        "/api/v1/admin/settings/security",
        headers={"x-user-role": "admin"},
        json=sec_data
    )
    assert update_res.status_code == 200

    # Verify live infrastructure status
    infra_res = client.get("/api/v1/admin/settings/security/infrastructure-status", headers={"x-user-role": "admin"})
    assert infra_res.status_code == 200
    infra_data = infra_res.json()
    assert "tls_status" in infra_data
    assert "password_hashing" in infra_data
    assert "Argon2id" in infra_data["password_hashing"]["status"]


def test_privacy_and_data_access():
    res = client.get("/api/v1/admin/settings/privacy", headers={"x-user-role": "admin"})
    assert res.status_code == 200
    data = res.json()
    assert data["data_retention_years"] >= 1

    # Update retention
    data["data_retention_years"] = 10
    update_res = client.put(
        "/api/v1/admin/settings/privacy",
        headers={"x-user-role": "admin"},
        json=data
    )
    assert update_res.status_code == 200
    assert client.get("/api/v1/admin/settings/privacy", headers={"x-user-role": "admin"}).json()["data_retention_years"] == 10


def test_queue_settings():
    res = client.get("/api/v1/admin/settings/queue", headers={"x-user-role": "admin"})
    assert res.status_code == 200
    data = res.json()
    assert data["max_daily_intake"] >= 5

    data["max_daily_intake"] = 75
    update_res = client.put(
        "/api/v1/admin/settings/queue",
        headers={"x-user-role": "admin"},
        json=data
    )
    assert update_res.status_code == 200
    assert client.get("/api/v1/admin/settings/queue", headers={"x-user-role": "admin"}).json()["max_daily_intake"] == 75


def test_notification_settings():
    res = client.get("/api/v1/admin/settings/notifications", headers={"x-user-role": "admin"})
    assert res.status_code == 200
    data = res.json()
    assert "brevo_configured" in data


def test_audit_logs_query():
    res = client.get("/api/v1/admin/settings/audit-logs?page=1&page_size=5", headers={"x-user-role": "admin"})
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert len(data["items"]) >= 1
    # Verify audit contains recently executed actions
    actions = [item["action"] for item in data["items"]]
    assert any("UPDATE_" in a for a in actions)


def test_personal_account_and_password_validation():
    # Get account profile
    res = client.get("/api/v1/admin/settings/account", headers={"x-user-id": "admin_sys"})
    assert res.status_code == 200
    assert res.json()["username"] == "admin_sys"

    # Profile update
    update_res = client.put(
        "/api/v1/admin/settings/account/profile",
        headers={"x-user-id": "admin_sys"},
        json={
            "full_name": "Dr. Roberto Reyes, MD",
            "email": "dr.reyes@ofphil.org.ph",
            "department": "Clinic Operations & Governance",
            "theme_preference": "light",
            "notify_email": True
        }
    )
    assert update_res.status_code == 200
    assert client.get("/api/v1/admin/settings/account").json()["full_name"] == "Dr. Roberto Reyes, MD"

    # Password change with matching current password should succeed
    # Reset to default hash first for test isolation
    from app.core.security import hash_password
    settings_service._cache["account"]["password_hash"] = hash_password("Ofphil@2026")

    wrong_pwd = client.post(
        "/api/v1/admin/settings/account/change-password",
        headers={"x-user-id": "admin_sys"},
        json={
            "current_password": "WrongPassword123!",
            "new_password": "NewSecurePassword@2026",
            "confirm_password": "NewSecurePassword@2026"
        }
    )
    assert wrong_pwd.status_code == 400

    right_pwd = client.post(
        "/api/v1/admin/settings/account/change-password",
        headers={"x-user-id": "admin_sys"},
        json={
            "current_password": "Ofphil@2026",
            "new_password": "NewSecurePassword@2026",
            "confirm_password": "NewSecurePassword@2026"
        }
    )
    assert right_pwd.status_code == 200


def test_msw_security_and_privacy_endpoints():
    # 1. MSW account profile retrieval
    res_prof = client.get("/api/v1/admin/settings/msw/account")
    assert res_prof.status_code == 200
    assert res_prof.json()["username"] == "msw_lead"

    # 2. MSW security status & RBAC verification
    res_sec_forbidden = client.get(
        "/api/v1/admin/settings/msw/security-status",
        headers={"x-user-role": "researcher"}
    )
    assert res_sec_forbidden.status_code == 403

    res_sec = client.get(
        "/api/v1/admin/settings/msw/security-status",
        headers={"x-user-role": "msw"}
    )
    assert res_sec.status_code == 200
    sec_data = res_sec.json()
    assert sec_data["mfa_enforced"] is True
    assert "active_sessions" in sec_data
    assert len(sec_data["active_sessions"]) >= 1

    # 3. Terminate other sessions
    res_term = client.post(
        "/api/v1/admin/settings/msw/sessions/terminate-others",
        headers={"x-user-role": "msw", "x-user-id": "msw_lead"}
    )
    assert res_term.status_code == 200
    assert res_term.json()["success"] is True

    # 4. Privacy settings retrieval and update
    res_priv = client.get(
        "/api/v1/admin/settings/msw/privacy",
        headers={"x-user-role": "msw"}
    )
    assert res_priv.status_code == 200
    assert res_priv.json()["mask_patient_identities"] is True

    res_priv_up = client.put(
        "/api/v1/admin/settings/msw/privacy",
        headers={"x-user-role": "msw", "x-user-id": "msw_lead"},
        json={"mask_patient_identities": True, "mask_contact_numbers": True, "data_retention_years": 7}
    )
    assert res_priv_up.status_code == 200
    assert res_priv_up.json()["data"]["data_retention_years"] == 7


def test_per_user_accessibility_preferences_isolation_and_reset():
    # 1. MSW sets Dark mode, 120%, Serif, Compact
    msw_hdrs = {"x-user-role": "msw", "x-user-id": "STF-MSW-0012"}
    r_msw_put = client.put(
        "/api/v1/admin/settings/accessibility",
        headers=msw_hdrs,
        json={"fontSize": "120%", "themeMode": "Dark", "fontFamily": "Serif", "tableDensity": "Compact"},
    )
    assert r_msw_put.status_code == 200
    assert r_msw_put.json()["data"]["themeMode"] == "Dark"

    # 2. Patient account should NOT inherit MSW's settings
    pat_hdrs = {"x-user-role": "patient", "x-user-id": "M26-11-00001"}
    r_pat_get = client.get("/api/v1/admin/settings/accessibility", headers=pat_hdrs)
    assert r_pat_get.status_code == 200
    assert r_pat_get.json()["themeMode"] == "Light"

    # 3. Patient sets High Contrast, 130%, Low-Vision
    r_pat_put = client.put(
        "/api/v1/admin/settings/accessibility",
        headers=pat_hdrs,
        json={"fontSize": "130%", "themeMode": "High Contrast", "fontFamily": "Low-Vision", "tableDensity": "Comfortable"},
    )
    assert r_pat_put.status_code == 200

    # 4. MSW still has Dark / 120% / Serif / Compact
    r_msw_get = client.get("/api/v1/admin/settings/accessibility", headers=msw_hdrs)
    assert r_msw_get.status_code == 200
    assert r_msw_get.json() == {
        "fontSize": "120%",
        "themeMode": "Dark",
        "fontFamily": "Serif",
        "tableDensity": "Compact",
    }

    # 5. Reset MSW back to defaults
    r_msw_reset = client.put(
        "/api/v1/admin/settings/accessibility",
        headers=msw_hdrs,
        json={"fontSize": "100%", "themeMode": "Light", "fontFamily": "Clinical", "tableDensity": "Comfortable"},
    )
    assert r_msw_reset.status_code == 200
    assert r_msw_reset.json()["data"]["fontSize"] == "100%"
