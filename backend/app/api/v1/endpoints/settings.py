"""
FastAPI Endpoints for Clinic Administration Settings.
Provides fully functional REST APIs for all 7 administrative settings domains:
1. Organization Profile
2. Security Policies & Live Infrastructure Status
3. Privacy & Data Access Governance
4. Appointments & Queue Parameters
5. Automated Notification Gateways & Brevo SMTP Relay Verification
6. Administrative Security Audit Logs (Paginated, Filterable, Exportable)
7. Personal Administrator Account, Password Verification & Workstation Preferences
"""
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from fastapi.responses import JSONResponse

from app.core.rbac import UserRole, require_roles
from app.services.settings_service import settings_service
from app.schemas.settings_schemas import (
    OrganizationProfile,
    SecuritySettings,
    PrivacySettings,
    QueueSettings,
    NotificationSettings,
    AccountProfile,
    AccountProfileUpdate,
    PasswordChangeRequest,
    AuditLogsResponse,
    InfrastructureStatusResponse,
    TestEmailRequest,
    SettingsOperationResponse
)

router = APIRouter(prefix="/admin/settings", tags=["Clinic Administration Settings"])


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


# ==============================================================================
# TAB 1: Organization Profile Endpoints
# ==============================================================================
@router.get("/organization", response_model=OrganizationProfile)
def get_organization_profile(
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW]))
):
    """Retrieve official clinic and organization parameters."""
    return settings_service.get_organization_profile()


@router.put("/organization", response_model=SettingsOperationResponse)
async def update_organization_profile(
    payload: OrganizationProfile,
    request: Request,
    x_user_role: str = Header(default="admin"),
    x_user_id: str = Header(default="admin_sys"),
    role: UserRole = Depends(require_roles([UserRole.ADMIN]))
):
    """Update official organization profile (Strictly restricted to Admin)."""
    ip = _get_client_ip(request)
    updated = await settings_service.update_organization_profile(
        profile=payload, actor_id=x_user_id, role=x_user_role, ip=ip
    )
    return SettingsOperationResponse(
        success=True,
        message="Organization & Clinic Profile updated successfully and saved to persistent database.",
        updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        data=updated.model_dump()
    )


# ==============================================================================
# TAB 2: Security Policies & Infrastructure Status Endpoints
# ==============================================================================
@router.get("/security", response_model=SecuritySettings)
def get_security_policies(
    role: UserRole = Depends(require_roles([UserRole.ADMIN]))
):
    """Retrieve security configuration (Admin only)."""
    return settings_service.get_security_settings()


@router.put("/security", response_model=SettingsOperationResponse)
async def update_security_policies(
    payload: SecuritySettings,
    request: Request,
    x_user_role: str = Header(default="admin"),
    x_user_id: str = Header(default="admin_sys"),
    role: UserRole = Depends(require_roles([UserRole.ADMIN]))
):
    """Update security policies with backend validation and audit logging."""
    ip = _get_client_ip(request)
    updated = await settings_service.update_security_settings(
        security=payload, actor_id=x_user_id, role=x_user_role, ip=ip
    )
    return SettingsOperationResponse(
        success=True,
        message="Security policies updated and enforced across active sessions.",
        updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        data=updated.model_dump()
    )


@router.get("/security/infrastructure-status", response_model=InfrastructureStatusResponse)
def get_infrastructure_status(
    role: UserRole = Depends(require_roles([UserRole.ADMIN]))
):
    """Verifies live cryptographic status, database link, and environment security."""
    return settings_service.get_infrastructure_status()


# ==============================================================================
# TAB 3: Privacy & Data Access Governance Endpoints
# ==============================================================================
@router.get("/privacy", response_model=PrivacySettings)
def get_privacy_settings(
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW]))
):
    """Retrieve Data Privacy Act compliance & masking rules."""
    return settings_service.get_privacy_settings()


@router.put("/privacy", response_model=SettingsOperationResponse)
async def update_privacy_settings(
    payload: PrivacySettings,
    request: Request,
    x_user_role: str = Header(default="admin"),
    x_user_id: str = Header(default="admin_sys"),
    role: UserRole = Depends(require_roles([UserRole.ADMIN]))
):
    """Update clinical document retention, DPO contact, and PII masking rules."""
    ip = _get_client_ip(request)
    updated = await settings_service.update_privacy_settings(
        privacy=payload, actor_id=x_user_id, role=x_user_role, ip=ip
    )
    return SettingsOperationResponse(
        success=True,
        message="Privacy & Data Access governance policies saved and applied.",
        updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        data=updated.model_dump()
    )


# ==============================================================================
# TAB 4: Appointments & Queue Parameters Endpoints
# ==============================================================================
@router.get("/queue", response_model=QueueSettings)
def get_queue_settings(
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW]))
):
    """Retrieve clinic intake capacity and triage parameters."""
    return settings_service.get_queue_settings()


@router.put("/queue", response_model=SettingsOperationResponse)
async def update_queue_settings(
    payload: QueueSettings,
    request: Request,
    x_user_role: str = Header(default="admin"),
    x_user_id: str = Header(default="admin_sys"),
    role: UserRole = Depends(require_roles([UserRole.ADMIN]))
):
    """Update intake capacity, assessment durations, and walk-in rules."""
    ip = _get_client_ip(request)
    updated = await settings_service.update_queue_settings(
        queue=payload, actor_id=x_user_id, role=x_user_role, ip=ip
    )
    return SettingsOperationResponse(
        success=True,
        message="Appointment & Queue parameters successfully saved to database.",
        updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        data=updated.model_dump()
    )


# ==============================================================================
# TAB 5: Notifications & Brevo SMTP Test Dispatch Endpoints
# ==============================================================================
@router.get("/notifications", response_model=NotificationSettings)
def get_notification_settings(
    role: UserRole = Depends(require_roles([UserRole.ADMIN]))
):
    """Retrieve notification channel toggles and provider connectivity status."""
    return settings_service.get_notification_settings()


@router.put("/notifications", response_model=SettingsOperationResponse)
async def update_notification_settings(
    payload: NotificationSettings,
    request: Request,
    x_user_role: str = Header(default="admin"),
    x_user_id: str = Header(default="admin_sys"),
    role: UserRole = Depends(require_roles([UserRole.ADMIN]))
):
    """Update notification channels and automated alerts."""
    ip = _get_client_ip(request)
    updated = await settings_service.update_notification_settings(
        notifications=payload, actor_id=x_user_id, role=x_user_role, ip=ip
    )
    return SettingsOperationResponse(
        success=True,
        message="Notification channels and automated alerts saved.",
        updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        data=updated.model_dump()
    )


@router.post("/notifications/test-email", response_model=SettingsOperationResponse)
async def send_test_email(
    payload: TestEmailRequest,
    x_user_id: str = Header(default="admin_sys"),
    role: UserRole = Depends(require_roles([UserRole.ADMIN]))
):
    """Dispatches a real test verification email through Brevo SMTP relay."""
    try:
        sent = await settings_service.send_test_notification_email(
            recipient_email=payload.recipient_email, actor_id=x_user_id
        )
        if not sent:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Brevo SMTP server rejected or failed to dispatch the test email. Please check network/credentials."
            )
        return SettingsOperationResponse(
            success=True,
            message=f"Test notification dispatched successfully via Brevo SMTP to {payload.recipient_email}.",
            updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            data={"recipient": payload.recipient_email, "provider": "Brevo SMTP"}
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==============================================================================
# TAB 6: Administrative Security Audit Logs Endpoints
# ==============================================================================
@router.get("/audit-logs", response_model=AuditLogsResponse)
async def get_audit_logs(
    page: int = 1,
    page_size: int = 10,
    search: Optional[str] = None,
    action: Optional[str] = None,
    status_filter: Optional[str] = None,
    role: UserRole = Depends(require_roles([UserRole.ADMIN]))
):
    """Query live administrative audit logs with pagination and search."""
    return await settings_service.get_audit_logs(
        page=page,
        page_size=page_size,
        search=search,
        action=action,
        status=status_filter
    )


@router.delete("/audit-logs", response_model=SettingsOperationResponse)
async def clear_audit_logs(
    role: UserRole = Depends(require_roles([UserRole.ADMIN])),
    x_user_id: str = Header(default="admin_sys")
):
    """Clear and reset administrative security audit logs."""
    await settings_service.clear_audit_logs(actor_id=x_user_id)
    return SettingsOperationResponse(
        success=True,
        message="Administrative security audit logs successfully cleared.",
        updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
    )


# ==============================================================================
# TAB 7: Personal Administrator Account & Display Endpoints
# ==============================================================================
@router.get("/account", response_model=AccountProfile)
def get_personal_account(
    x_user_id: str = Header(default="admin_sys")
):
    """Retrieve profile and display preferences for the authenticated administrator."""
    return settings_service.get_account_profile()


@router.put("/account/profile", response_model=SettingsOperationResponse)
async def update_personal_profile(
    payload: AccountProfileUpdate,
    request: Request,
    x_user_id: str = Header(default="admin_sys")
):
    """Update personal display name, email, and display theme."""
    ip = _get_client_ip(request)
    updated = await settings_service.update_account_profile(
        payload=payload, actor_id=x_user_id, ip=ip
    )
    return SettingsOperationResponse(
        success=True,
        message="Personal account details and workstation preferences saved.",
        updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        data=updated.model_dump()
    )


@router.post("/account/change-password", response_model=SettingsOperationResponse)
async def change_password(
    payload: PasswordChangeRequest,
    request: Request,
    x_user_id: str = Header(default="admin_sys")
):
    """Secure password change with verification of current password and Argon2id hashing."""
    ip = _get_client_ip(request)
    try:
        await settings_service.change_password(req=payload, actor_id=x_user_id, ip=ip)
        return SettingsOperationResponse(
            success=True,
            message="Administrator credentials updated and Argon2id rehashed successfully.",
            updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==============================================================================
# MSW Caseworker Account & Preference Endpoints
# ==============================================================================
@router.get("/msw/account", response_model=AccountProfile)
def get_msw_account_profile():
    """Retrieve profile and credentials metadata for the MSW Caseworker."""
    return settings_service.get_msw_account_profile()


@router.put("/msw/account/profile", response_model=SettingsOperationResponse)
async def update_msw_profile(
    payload: AccountProfileUpdate,
    request: Request,
    x_user_id: str = Header(default="msw_lead")
):
    """Update MSW Caseworker profile details."""
    ip = _get_client_ip(request)
    updated = await settings_service.update_msw_account_profile(
        payload=payload, actor_id=x_user_id, ip=ip
    )
    return SettingsOperationResponse(
        success=True,
        message="MSW Caseworker profile updated and saved to persistent storage.",
        updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        data=updated.model_dump()
    )


@router.post("/msw/account/change-password", response_model=SettingsOperationResponse)
async def change_msw_password(
    payload: PasswordChangeRequest,
    request: Request,
    x_user_id: str = Header(default="msw_lead")
):
    """Secure MSW password change with verification of current password and Argon2id hashing."""
    ip = _get_client_ip(request)
    try:
        await settings_service.change_msw_password(req=payload, actor_id=x_user_id, ip=ip)
        return SettingsOperationResponse(
            success=True,
            message="MSW credentials updated and Argon2id rehashed successfully.",
            updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/msw/preferences")
def get_msw_preferences():
    """Retrieve MSW workflow, notification, and display preferences."""
    return settings_service.get_msw_preferences()


@router.put("/msw/preferences", response_model=SettingsOperationResponse)
async def update_msw_preferences(
    payload: dict,
    request: Request,
    x_user_id: str = Header(default="msw_lead")
):
    """Persist MSW workflow, notification, and display preferences."""
    ip = _get_client_ip(request)
    updated = await settings_service.update_msw_preferences(
        prefs=payload, actor_id=x_user_id, ip=ip
    )
    return SettingsOperationResponse(
        success=True,
        message="MSW preferences updated successfully.",
        updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        data=updated
    )


@router.get("/msw/security-status", response_model=dict)
def get_msw_security_status(
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW]))
):
    """Retrieve live security, session information, and audit indicators for the MSW panel."""
    return settings_service.get_msw_security_status()


@router.post("/msw/sessions/terminate-others", response_model=SettingsOperationResponse)
async def terminate_other_msw_sessions(
    request: Request,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
    x_user_id: str = Header(default="msw_lead")
):
    """Terminate other active caseworker sessions across clinic workstations."""
    ip = _get_client_ip(request)
    await settings_service.terminate_other_msw_sessions(actor_id=x_user_id, ip=ip)
    return SettingsOperationResponse(
        success=True,
        message="All concurrent workstation sessions terminated successfully.",
        updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
    )


@router.get("/msw/privacy", response_model=dict)
def get_msw_privacy_settings(
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW]))
):
    """Retrieve confidential patient data masking and institutional privacy rules."""
    return settings_service.get_msw_privacy_settings()


@router.put("/msw/privacy", response_model=SettingsOperationResponse)
async def update_msw_privacy_settings(
    payload: dict,
    request: Request,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW])),
    x_user_id: str = Header(default="msw_lead")
):
    """Update patient privacy, masking, and consent governance parameters for MSW."""
    ip = _get_client_ip(request)
    updated = await settings_service.update_msw_privacy_settings(
        payload=payload, actor_id=x_user_id, ip=ip
    )
    return SettingsOperationResponse(
        success=True,
        message="Data privacy controls and masking policies updated successfully.",
        updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        data=updated
    )


@router.get("/accessibility", response_model=dict)
def get_user_accessibility_preferences(
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.NURSE, UserRole.PATIENT, UserRole.RESEARCHER])),
    x_user_id: str = Header(default="guest"),
):
    """Retrieve per-user Quick Display & Reading Aid preferences."""
    return settings_service.get_user_accessibility_preferences(actor_id=x_user_id, role=role.value)


@router.put("/accessibility", response_model=SettingsOperationResponse)
async def update_user_accessibility_preferences(
    payload: dict,
    request: Request,
    role: UserRole = Depends(require_roles([UserRole.ADMIN, UserRole.MSW, UserRole.NURSE, UserRole.PATIENT, UserRole.RESEARCHER])),
    x_user_id: str = Header(default="guest"),
):
    """Persist per-user Quick Display & Reading Aid preferences."""
    ip = _get_client_ip(request)
    updated = await settings_service.update_user_accessibility_preferences(
        actor_id=x_user_id, role=role.value, prefs=payload, ip=ip
    )
    return SettingsOperationResponse(
        success=True,
        message="Accessibility preferences saved.",
        updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        data=updated,
    )
