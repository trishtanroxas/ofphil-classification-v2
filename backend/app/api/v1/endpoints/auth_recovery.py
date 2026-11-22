from fastapi import APIRouter

from app.schemas.recovery_schemas import (
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
    """
    return recovery_service.authenticate_credentials(payload)


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
