from typing import Optional
from fastapi import APIRouter, Header

from app.schemas.recovery_schemas import (
    ContactChangeCancelPayload,
    ContactChangeDispatchResponse,
    ContactChangeRequestPayload,
    ContactChangeResendPayload,
    ContactChangeVerifyPayload,
    ContactChangeVerifyResponse,
    LoginRequestPayload,
    LoginResponse,
    ProfilePasswordConfirmRequest,
    ProfilePasswordConfirmResponse,
    ProfilePasswordOTPRequest,
    ProfilePasswordOTPResponse,
    RecoveryDispatchResponse,
    RecoveryRequestPayload,
    ResetPasswordPayload,
    ResetPasswordResponse,
    Send2FAOTPRequest,
    Send2FAOTPResponse,
    TwoFactorStatusResponse,
    Verify2FARequest,
    Verify2FAResponse,
    VerifyOTPRequest,
    VerifyOTPResponse,
)
from app.services.recovery_service import recovery_service

router = APIRouter(prefix="/auth", tags=["Password Recovery & OTP"])


@router.post("/profile-password/request-otp", response_model=ProfilePasswordOTPResponse)
def request_profile_password_change_otp(payload: ProfilePasswordOTPRequest):
    """
    Verifies current password and initiates an interactive OTP verification
    dispatched via Email (Brevo SMTP) or SMS for Profile Password updates.
    """
    return recovery_service.request_profile_password_otp(payload)


@router.post("/profile-password/confirm", response_model=ProfilePasswordConfirmResponse)
def confirm_profile_password_change_otp(payload: ProfilePasswordConfirmRequest):
    """
    Verifies the 6-digit OTP and hashes the new password with Argon2id.
    """
    return recovery_service.confirm_profile_password_otp(payload)


@router.post("/login", response_model=LoginResponse)
def login_and_verify_credentials(payload: LoginRequestPayload):
    """
    Validates user credentials (password, patient ID, birthdate, email, username)
    before initiating Two-Factor Authentication. Rejects invalid credentials.
    Returns available verified 2FA delivery methods without issuing or exposing an OTP.
    """
    return recovery_service.authenticate_credentials(payload)


@router.post("/patient/login")
def patient_login(payload: dict):
    """
    Authenticates a registered patient using Patient ID and password,
    returning a cryptographically signed Bearer access token.
    """
    from fastapi import HTTPException
    from app.core.security import verify_password, create_access_token

    pid = str(payload.get("patient_id") or "").strip().upper()
    password = str(payload.get("password") or "")
    if not pid or not password:
        raise HTTPException(status_code=400, detail="Patient ID and password are required.")

    cred = recovery_service._patient_creds.get(pid)
    if not cred or not verify_password(password, cred.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid Patient ID or password.")

    token = create_access_token(sub=pid, role="patient")
    return {
        "access_token": token,
        "token_type": "bearer",
        "patient_id": pid,
        "role": "patient",
    }


@router.post("/2fa/send-otp", response_model=Send2FAOTPResponse)
def send_two_factor_otp(payload: Send2FAOTPRequest):
    """
    Generates a cryptographically secure 6-digit OTP (SHA-256 hashed, 15-min TTL)
    and dispatches it via the selected verified Email or SMS delivery method.
    Enforces 60-second resend cooldown and rate limits.
    """
    return recovery_service.send_2fa_otp(payload)


@router.get("/2fa/status", response_model=TwoFactorStatusResponse)
def get_two_factor_status(session_id: str):
    """
    Authoritative backend status endpoint for 2FA OTP expiration and cooldown.
    Returns remaining validity seconds, ISO UTC timestamp, and resend cooldown.
    """
    return recovery_service.get_2fa_status(session_id)


@router.post("/verify-2fa", response_model=Verify2FAResponse)
def verify_two_factor_auth(payload: Verify2FARequest):
    """Verifies the 6-digit 2FA security code before granting authenticated access."""
    return recovery_service.verify_2fa(payload)


@router.post("/forgot-password", response_model=RecoveryDispatchResponse)
def request_password_recovery(payload: RecoveryRequestPayload):
    """
    Validates role-specific identity and registered contact details,
    generates a cryptographic 6-digit OTP (hashed, 5-min TTL), and
    dispatches via real Email (Brevo SMTP) or SMS (Semaphore v4).
    Never exposes the OTP in the response.
    """
    return recovery_service.request_recovery(payload)


@router.post("/verify-recovery-otp", response_model=VerifyOTPResponse)
def verify_recovery_otp(payload: VerifyOTPRequest):
    """Verifies the 6-digit OTP against the hashed session and issues a single-use reset token."""
    return recovery_service.verify_otp(payload)


@router.post("/reset-password", response_model=ResetPasswordResponse)
def complete_password_reset(payload: ResetPasswordPayload):
    """Resets the account password using Argon2id after valid OTP verification."""
    return recovery_service.reset_password(payload)


@router.post("/profile-contact/request-otp", response_model=ContactChangeDispatchResponse)
def request_profile_contact_change_otp(
    payload: ContactChangeRequestPayload,
    x_user_role: Optional[str] = Header(default=None),
):
    """
    Validates current password, contact format, uniqueness, and initiates an OTP
    sent to the NEW email address or NEW mobile number before updating the account.
    """
    return recovery_service.request_contact_change_otp(payload, actor_role_header=x_user_role)


@router.post("/profile-contact/resend-otp", response_model=ContactChangeDispatchResponse)
def resend_profile_contact_change_otp(
    payload: ContactChangeResendPayload,
    x_user_role: Optional[str] = Header(default=None),
):
    """Resends a fresh 6-digit OTP to the pending new contact after the 60s cooldown."""
    return recovery_service.resend_contact_change_otp(payload, actor_role_header=x_user_role)


@router.post("/profile-contact/verify", response_model=ContactChangeVerifyResponse)
def verify_profile_contact_change_otp(
    payload: ContactChangeVerifyPayload,
    x_user_role: Optional[str] = Header(default=None),
):
    """Verifies the 6-digit OTP, commits the new verified contact, and sends security notices."""
    return recovery_service.verify_contact_change_otp(payload, actor_role_header=x_user_role)


@router.post("/profile-contact/cancel")
def cancel_profile_contact_change(
    payload: ContactChangeCancelPayload,
    x_user_role: Optional[str] = Header(default=None),
):
    """Cancels a pending contact change and discards its OTP session."""
    return recovery_service.cancel_contact_change(payload, actor_role_header=x_user_role)
