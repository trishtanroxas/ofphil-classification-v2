from typing import Literal, Optional
from pydantic import BaseModel, Field


class RecoveryRequestPayload(BaseModel):
    role: Literal["patient", "msw", "admin"]
    identifier: str = Field(..., min_length=1, description="Patient ID for patient; username or email for MSW/Admin")
    birthdate: Optional[str] = Field(default=None, description="Required YYYY-MM-DD for patient recovery")
    recovery_method: Literal["email", "sms"] = "email"
    email: Optional[str] = None
    mobile: Optional[str] = None


class RecoveryDispatchResponse(BaseModel):
    status: str = "success"
    recovery_id: str
    role: str
    delivery_method: Literal["email", "sms"]
    masked_destination: str
    expires_in_seconds: int = 300
    resend_cooldown_seconds: int = 60
    message: str


class VerifyOTPRequest(BaseModel):
    recovery_id: str = Field(..., min_length=1)
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class VerifyOTPResponse(BaseModel):
    verified: bool = True
    recovery_id: str
    reset_token: str
    role: str
    message: str


class ResetPasswordPayload(BaseModel):
    recovery_id: str = Field(..., min_length=1)
    reset_token: str = Field(..., min_length=16)
    new_password: str = Field(..., min_length=6, max_length=128)
    confirm_password: str = Field(..., min_length=6, max_length=128)


class ResetPasswordResponse(BaseModel):
    status: str = "success"
    role: str
    message: str
    login_path: str


class LoginRequestPayload(BaseModel):
    role: str
    username: Optional[str] = None
    patient_id: Optional[str] = None
    birthdate: Optional[str] = None
    email: Optional[str] = None
    password: str


class LoginResponse(BaseModel):
    status: str = "2fa_required"
    session_id: str
    role: str
    user_id: str
    user_name: str
    contact_display: str
    security_code: str = "123456"
    message: str


class Verify2FARequest(BaseModel):
    session_id: str
    otp_code: str
    role: str


class Verify2FAResponse(BaseModel):
    status: str = "authenticated"
    role: str
    user_id: str
    user_name: str
    redirect_url: str
    message: str


class ProfilePasswordOTPRequest(BaseModel):
    role: Literal["patient", "msw", "admin"]
    user_id: Optional[str] = None
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=128)
    confirm_password: str = Field(..., min_length=6, max_length=128)
    method: Literal["email", "sms"] = "email"


class ProfilePasswordOTPResponse(BaseModel):
    status: str = "otp_sent"
    session_id: str
    role: str
    delivery_method: str
    masked_destination: str
    security_code: str
    expires_in_seconds: int = 600
    message: str


class ProfilePasswordConfirmRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    otp_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class ProfilePasswordConfirmResponse(BaseModel):
    success: bool = True
    role: str
    message: str
    updated_at: str
