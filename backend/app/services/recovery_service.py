"""
Secure Password Recovery & OTP Verification Service for OFPHIL V2.
Supports Patient, MSW, and Admin roles with:
- Strict server-side identity and registered contact validation
- Cryptographically secure 6-digit OTPs (SHA-256 hashed, 5-minute TTL)
- Rate limiting (5 requests / 15 min) & resend cooldown (60 seconds)
- Attempt limits (max 5 OTP tries) & single-use invalidation
- Real Email (Brevo SMTP) & SMS (Semaphore v4) dispatch without dummy fallbacks
- Argon2id password hashing and security audit logging
"""
import datetime
import hashlib
import hmac
import json
import re
import secrets
import time
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status

from app.core.audit import log_audit_event
from app.core.config import get_settings
from app.core.paths import STORAGE_DIR
from app.core.security import hash_password, verify_password
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
    TwoFactorMethodOption,
    Verify2FARequest,
    Verify2FAResponse,
    VerifyOTPRequest,
    VerifyOTPResponse,
)
from app.services.email_service import (
    send_contact_change_otp_email,
    send_contact_change_security_notice_email,
    send_login_2fa_otp_email,
    send_password_reset_email,
    send_profile_password_otp_email,
)
from app.services.settings_service import settings_service
from app.services.sms_service import mask_email, mask_mobile, normalize_ph_mobile, send_sms_otp

settings = get_settings()

OTP_TTL_SECONDS = 300  # 5 minutes
PRE_AUTH_TTL_SECONDS = 900  # 15 minutes to complete 2FA
RESET_TOKEN_TTL_SECONDS = 600  # 10 minutes
RESEND_COOLDOWN_SECONDS = 60
RATE_WINDOW_SECONDS = 900  # 15 minutes
RATE_MAX_REQUESTS = 5
MAX_OTP_ATTEMPTS = 5

PATIENT_CREDENTIALS_FILE = STORAGE_DIR / "patient_credentials.json"

GENERIC_MISMATCH_ERROR = (
    "We could not verify your identity with the provided account details and registered contact information. "
    "Please double-check your entries or contact clinic support."
)


class PasswordRecoveryService:
    def __init__(self) -> None:
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._rate_history: Dict[str, List[float]] = {}
        self._patient_creds: Dict[str, Dict[str, Any]] = {}
        self._load_patient_creds()

    def _load_patient_creds(self) -> None:
        if PATIENT_CREDENTIALS_FILE.exists():
            try:
                data = json.loads(PATIENT_CREDENTIALS_FILE.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    self._patient_creds = data
            except Exception:
                self._patient_creds = {}

    def _save_patient_creds(self) -> None:
        try:
            PATIENT_CREDENTIALS_FILE.parent.mkdir(parents=True, exist_ok=True)
            PATIENT_CREDENTIALS_FILE.write_text(json.dumps(self._patient_creds, indent=2), encoding="utf-8")
        except Exception:
            pass

    @staticmethod
    def normalize_date(val: str) -> str:
        clean = (val or "").strip().replace("/", "-")
        parts = clean.split("-")
        if len(parts) == 3:
            if len(parts[0]) == 4:  # YYYY-MM-DD
                return f"{parts[0]}-{int(parts[1]):02d}-{int(parts[2]):02d}"
            elif len(parts[2]) == 4:  # MM-DD-YYYY
                return f"{parts[2]}-{int(parts[0]):02d}-{int(parts[1]):02d}"
        return clean

    @staticmethod
    def _hash_secret(recovery_id: str, secret_val: str) -> str:
        return hashlib.sha256(f"{recovery_id}:{secret_val}".encode("utf-8")).hexdigest()

    def _check_rate_limit_and_cooldown(self, account_key: str) -> None:
        now = time.time()
        history = [ts for ts in self._rate_history.get(account_key, []) if now - ts < RATE_WINDOW_SECONDS]
        self._rate_history[account_key] = history

        if history and (now - history[-1]) < RESEND_COOLDOWN_SECONDS:
            wait_sec = int(RESEND_COOLDOWN_SECONDS - (now - history[-1])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {wait_sec} seconds before requesting another verification code.",
            )

        if len(history) >= RATE_MAX_REQUESTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many password recovery requests. Please wait 15 minutes before trying again.",
            )

    def _resolve_and_validate_account(
        self, payload: RecoveryRequestPayload
    ) -> Tuple[str, str, str, str]:
        """
        Validates role-specific identity and registered contact information.
        Returns (account_key, display_identifier, registered_email, registered_mobile).
        """
        role = payload.role
        ident = payload.identifier.strip()
        method = payload.recovery_method

        if method == "email" and (not payload.email or not payload.email.strip()):
            raise HTTPException(status_code=422, detail="Registered email address is required for Email recovery.")
        if method == "sms" and (not payload.mobile or not payload.mobile.strip()):
            raise HTTPException(status_code=422, detail="Registered mobile number is required for SMS recovery.")

        if role == "patient":
            if not payload.birthdate or not payload.birthdate.strip():
                raise HTTPException(status_code=422, detail="Date of birth is required for Patient password recovery.")

            from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY

            matched_patient = None
            for p in REGISTERED_PATIENTS_REGISTRY:
                if str(p.get("patient_id", "")).strip().upper() == ident.upper():
                    matched_patient = p
                    break

            if not matched_patient:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=GENERIC_MISMATCH_ERROR)

            reg_bday = str(matched_patient.get("birthdate", "")).strip()

            if self.normalize_date(reg_bday) != self.normalize_date(payload.birthdate):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=GENERIC_MISMATCH_ERROR)

            reg_email = str(matched_patient.get("email") or "").strip()
            email_verified = bool(matched_patient.get("email_verified", True))
            reg_mobile = str(matched_patient.get("contact") or "").strip()
            phone_verified = bool(matched_patient.get("phone_verified", True))

            if method == "email":
                user_email = (payload.email or "").strip().lower()
                if not reg_email or "@" not in reg_email or not email_verified or reg_email.lower() != user_email:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=GENERIC_MISMATCH_ERROR)
            else:
                if (
                    not reg_mobile
                    or len(normalize_ph_mobile(reg_mobile)) < 10
                    or not phone_verified
                    or normalize_ph_mobile(reg_mobile) != normalize_ph_mobile(payload.mobile or "")
                ):
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=GENERIC_MISMATCH_ERROR)

            return (
                f"patient:{matched_patient['patient_id']}",
                matched_patient["patient_id"],
                reg_email,
                reg_mobile,
            )

        if role == "msw":
            acct = settings_service._cache.get("msw_account", {})
            reg_user = str(acct.get("username", "msw_lead")).strip()
            reg_email = str(acct.get("email") or "roxastal.cbpa@gmail.com").strip()
            reg_mobile = str(acct.get("contact") or "0918 555 1234").strip()

            if ident.lower() != reg_user.lower():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=GENERIC_MISMATCH_ERROR)

            if method == "email":
                if not reg_email or "@" not in reg_email or reg_email.lower() != (payload.email or "").strip().lower():
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=GENERIC_MISMATCH_ERROR)
            else:
                if len(normalize_ph_mobile(reg_mobile)) < 10 or normalize_ph_mobile(reg_mobile) != normalize_ph_mobile(payload.mobile or ""):
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=GENERIC_MISMATCH_ERROR)

            return (f"msw:{reg_user}", reg_user, reg_email, reg_mobile)

        # role == "admin"
        acct = settings_service._cache.get("account", {})
        reg_user = str(acct.get("username", "admin_sys")).strip()
        reg_email = str(acct.get("email") or "trishtanroxas@gmail.com").strip()
        reg_mobile = str(acct.get("contact") or "0917 000 0001").strip()

        if ident.lower() != reg_user.lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=GENERIC_MISMATCH_ERROR)

        if method == "email":
            if not reg_email or "@" not in reg_email or reg_email.lower() != (payload.email or "").strip().lower():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=GENERIC_MISMATCH_ERROR)
        else:
            if len(normalize_ph_mobile(reg_mobile)) < 10 or normalize_ph_mobile(reg_mobile) != normalize_ph_mobile(payload.mobile or ""):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=GENERIC_MISMATCH_ERROR)

        return (f"admin:{reg_user}", reg_user, reg_email, reg_mobile)

    def request_recovery(self, payload: RecoveryRequestPayload) -> RecoveryDispatchResponse:
        account_key, display_id, reg_email, reg_mobile = self._resolve_and_validate_account(payload)
        self._check_rate_limit_and_cooldown(account_key)

        # Invalidate any previous active OTP sessions for this account
        for sess in self._sessions.values():
            if sess.get("account_key") == account_key:
                sess["otp_used"] = True
                sess["reset_used"] = True

        recovery_id = f"rec-{secrets.token_urlsafe(12)}"
        otp = f"{secrets.randbelow(900000) + 100000}"
        now = time.time()

        role_labels = {
            "patient": "Patient Beneficiary Portal",
            "msw": "Medical Social Services (MSW)",
            "admin": "Clinic Administration",
        }
        role_label = role_labels[payload.role]

        if payload.recovery_method == "email":
            reset_link = f"{settings.FRONTEND_URL}/forgot-password/{payload.role}"
            sent = send_password_reset_email(
                to_email=reg_email,
                role_title=role_label,
                identifier=display_id,
                reset_link=reset_link,
                code=otp,
            )
            if not sent:
                log_audit_event(
                    action="PASSWORD_RECOVERY_DISPATCH",
                    actor_id=display_id,
                    role=payload.role,
                    resource=f"recovery:{recovery_id}",
                    status="FAILED",
                    details={"method": "email", "reason": "SMTP delivery failed"},
                )
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Unable to send recovery email at this time. Please verify SMTP settings or try again later.",
                )
            masked_dest = mask_email(reg_email)
            msg = "We sent a password recovery verification code to your registered email address. Please check your inbox or spam folder."
        else:
            sms_text = (
                f"OFPHIL {role_label}: Your password recovery verification code is {otp}. "
                "Valid for 5 minutes. If you did not request this, ignore this message and contact clinic support."
            )
            sent, err_msg = send_sms_otp(reg_mobile, sms_text)
            if not sent:
                log_audit_event(
                    action="PASSWORD_RECOVERY_DISPATCH",
                    actor_id=display_id,
                    role=payload.role,
                    resource=f"recovery:{recovery_id}",
                    status="FAILED",
                    details={"method": "sms", "reason": err_msg or "SMS provider unavailable"},
                )
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=err_msg or "SMS delivery service is currently unavailable.",
                )
            masked_dest = mask_mobile(reg_mobile)
            msg = "We sent a password recovery verification code to your registered mobile number. Please check your SMS messages."

        # Persist hashed OTP session only after confirmed provider dispatch
        self._sessions[recovery_id] = {
            "session_type": "password_recovery",
            "recovery_id": recovery_id,
            "account_key": account_key,
            "role": payload.role,
            "identifier": display_id,
            "delivery_method": payload.recovery_method,
            "masked_destination": masked_dest,
            "otp_hash": self._hash_secret(recovery_id, otp),
            "created_at": now,
            "expires_at": now + OTP_TTL_SECONDS,
            "attempts": 0,
            "otp_used": False,
            "reset_token_hash": None,
            "reset_expires_at": None,
            "reset_used": False,
        }
        self._rate_history.setdefault(account_key, []).append(now)

        log_audit_event(
            action="PASSWORD_RECOVERY_DISPATCH",
            actor_id=display_id,
            role=payload.role,
            resource=f"recovery:{recovery_id}",
            status="SUCCESS",
            details={"method": payload.recovery_method, "masked_destination": masked_dest},
        )

        return RecoveryDispatchResponse(
            status="success",
            recovery_id=recovery_id,
            role=payload.role,
            delivery_method=payload.recovery_method,
            masked_destination=masked_dest,
            expires_in_seconds=OTP_TTL_SECONDS,
            resend_cooldown_seconds=RESEND_COOLDOWN_SECONDS,
            message=msg,
        )

    def verify_otp(self, payload: VerifyOTPRequest) -> VerifyOTPResponse:
        sess = self._sessions.get(payload.recovery_id)
        if not sess or sess.get("session_type") != "password_recovery":
            raise HTTPException(status_code=400, detail="Invalid or expired recovery session.")

        if sess.get("otp_used"):
            raise HTTPException(status_code=400, detail="This verification code has already been used or invalidated.")

        now = time.time()
        if now > float(sess.get("expires_at", 0)):
            sess["otp_used"] = True
            raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new code.")

        if int(sess.get("attempts", 0)) >= MAX_OTP_ATTEMPTS:
            sess["otp_used"] = True
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Maximum OTP verification attempts exceeded. Please request a new code.",
            )

        candidate_hash = self._hash_secret(payload.recovery_id, payload.otp.strip())
        if not hmac.compare_digest(candidate_hash, sess["otp_hash"]):
            sess["attempts"] = int(sess.get("attempts", 0)) + 1
            remaining = max(0, MAX_OTP_ATTEMPTS - sess["attempts"])
            if remaining == 0:
                sess["otp_used"] = True
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many incorrect attempts. This verification code has been invalidated.",
                )
            raise HTTPException(
                status_code=400,
                detail=f"Incorrect verification code. {remaining} attempt(s) remaining.",
            )

        # Valid OTP: invalidate OTP and issue single-use reset token
        sess["otp_used"] = True
        reset_token = secrets.token_urlsafe(32)
        sess["reset_token_hash"] = self._hash_secret(payload.recovery_id, reset_token)
        sess["reset_expires_at"] = now + RESET_TOKEN_TTL_SECONDS

        log_audit_event(
            action="PASSWORD_RECOVERY_OTP_VERIFIED",
            actor_id=sess["identifier"],
            role=sess["role"],
            resource=f"recovery:{payload.recovery_id}",
            status="SUCCESS",
        )

        return VerifyOTPResponse(
            verified=True,
            recovery_id=payload.recovery_id,
            reset_token=reset_token,
            role=sess["role"],
            message="Verification successful. You may now create a new password.",
        )

    def reset_password(self, payload: ResetPasswordPayload) -> ResetPasswordResponse:
        if payload.new_password != payload.confirm_password:
            raise HTTPException(status_code=422, detail="Passwords do not match.")

        if len(payload.new_password) < 6:
            raise HTTPException(
                status_code=422,
                detail="Password must be at least 6 characters long.",
            )

        sess = self._sessions.get(payload.recovery_id)
        if not sess or sess.get("session_type") != "password_recovery" or not sess.get("reset_token_hash") or sess.get("reset_used"):
            raise HTTPException(status_code=400, detail="Invalid or already-used password reset session.")

        if time.time() > float(sess.get("reset_expires_at", 0)):
            sess["reset_used"] = True
            raise HTTPException(status_code=400, detail="Password reset session expired. Please verify a new code.")

        candidate_hash = self._hash_secret(payload.recovery_id, payload.reset_token.strip())
        if not hmac.compare_digest(candidate_hash, sess["reset_token_hash"]):
            raise HTTPException(status_code=403, detail="Invalid password reset authorization token.")

        new_hash = hash_password(payload.new_password)
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        role = sess["role"]
        ident = sess["identifier"]

        if role == "admin":
            acct = settings_service._cache.get("account", {})
            acct["password_hash"] = new_hash
            acct["password_updated_at"] = now_iso
            settings_service._cache["account"] = acct
            settings_service._save_to_storage()
            login_path = "/login-admin"
        elif role == "msw":
            acct = settings_service._cache.get("msw_account", {})
            acct["password_hash"] = new_hash
            acct["password_updated_at"] = now_iso
            settings_service._cache["msw_account"] = acct
            settings_service._save_to_storage()
            login_path = "/login-msw"
        else:
            from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY

            for p in REGISTERED_PATIENTS_REGISTRY:
                if str(p.get("patient_id", "")).strip().upper() == ident.upper():
                    p["password_hash"] = new_hash
                    p["password_updated_at"] = now_iso
                    break
            self._patient_creds[ident] = {
                "patient_id": ident,
                "password_hash": new_hash,
                "password_updated_at": now_iso,
            }
            self._save_patient_creds()
            login_path = "/login-patient"

        # Invalidate recovery session completely
        sess["reset_used"] = True
        sess["reset_token_hash"] = None
        sess["otp_hash"] = None

        log_audit_event(
            action="PASSWORD_RECOVERY_COMPLETED",
            actor_id=ident,
            role=role,
            resource=f"account:{ident}",
            status="SUCCESS",
        )

        return ResetPasswordResponse(
            status="success",
            role=role,
            message="Your password has been securely updated. You may now sign in with your new password.",
            login_path=login_path,
        )

    def authenticate_credentials(self, payload: LoginRequestPayload) -> LoginResponse:
        role = (payload.role or "patient").lower().strip()

        if role == "patient":
            patient_id = (payload.patient_id or "").strip()
            if not patient_id:
                raise HTTPException(status_code=401, detail="Patient ID is required.")

            from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY
            matched_patient = None
            for p in REGISTERED_PATIENTS_REGISTRY:
                if str(p.get("patient_id", "")).strip().upper() == patient_id.upper():
                    matched_patient = p
                    break

            if not matched_patient:
                raise HTTPException(status_code=401, detail="Patient ID not found in clinic records.")

            if not payload.birthdate or not payload.birthdate.strip():
                raise HTTPException(status_code=401, detail="Date of birth is required.")

            reg_bday = str(matched_patient.get("birthdate", "")).strip()
            if self.normalize_date(reg_bday) != self.normalize_date(payload.birthdate):
                raise HTTPException(status_code=401, detail="Date of birth does not match clinic records for this Patient ID.")

            if payload.email and payload.email.strip():
                reg_email = str(matched_patient.get("email") or "").strip().lower()
                user_email = payload.email.strip().lower()
                if not reg_email or reg_email != user_email:
                    raise HTTPException(status_code=401, detail="Email address does not match registered patient records.")

            patient_id_norm = matched_patient.get("patient_id", patient_id)
            cred = self._patient_creds.get(patient_id_norm)
            is_valid_pass = False
            if cred and cred.get("password_hash"):
                is_valid_pass = verify_password(payload.password, cred["password_hash"])
            elif matched_patient.get("password_hash"):
                is_valid_pass = verify_password(payload.password, matched_patient["password_hash"])
            else:
                default_pass = str(matched_patient.get("initial_password") or "Ofphil@2026")
                is_valid_pass = hmac.compare_digest(payload.password, default_pass)

            if not is_valid_pass:
                raise HTTPException(status_code=401, detail="Incorrect password. Please verify your password or use 'Forgot password'.")

            user_id = patient_id_norm
            user_name = f"{matched_patient.get('first_name', '')} {matched_patient.get('last_name', '')}".strip() or "Juan Dela Cruz"
            raw_email = str(matched_patient.get("email") or "").strip()
            email_verified = bool(matched_patient.get("email_verified", True))
            verified_email = raw_email if (raw_email and "@" in raw_email and email_verified) else ""
            raw_mobile = str(matched_patient.get("contact") or "").strip()
            phone_verified = bool(matched_patient.get("phone_verified", True))
            verified_mobile = raw_mobile if (len(normalize_ph_mobile(raw_mobile)) >= 10 and phone_verified) else ""

        elif role == "msw":
            uname = (payload.username or "").strip().lower()
            msw_acc = settings_service._cache.get("msw_account", {})
            reg_user = str(msw_acc.get("username", "msw_lead")).strip().lower()
            if uname != reg_user:
                raise HTTPException(status_code=401, detail="Invalid MSW Caseworker username.")

            stored_hash = msw_acc.get("password_hash")
            if stored_hash:
                is_valid = verify_password(payload.password, stored_hash)
            else:
                is_valid = hmac.compare_digest(payload.password, "Ofphil@2026")
            if not is_valid:
                raise HTTPException(status_code=401, detail="Incorrect MSW password. Please verify your password or use 'Forgot password'.")

            user_id = "STF-MSW-0012"
            user_name = msw_acc.get("full_name") or "Maria Santos, RSW"
            raw_email = str(msw_acc.get("email", "roxastal.cbpa@gmail.com") or "").strip()
            verified_email = raw_email if (raw_email and "@" in raw_email) else ""
            raw_mobile = str(msw_acc.get("contact", "0918 555 1234") or "").strip()
            verified_mobile = raw_mobile if len(normalize_ph_mobile(raw_mobile)) >= 10 else ""

        elif role in ("admin", "nurse"):
            uname = (payload.username or "").strip().lower()
            adm_acc = settings_service._cache.get("account", {})
            nurse_acc = settings_service._cache.get("nurse_account", {})
            reg_adm_user = str(adm_acc.get("username", "admin_sys")).strip().lower()
            reg_nurse_user = str(nurse_acc.get("username", "nurse_desk")).strip().lower()
            if uname == reg_nurse_user:
                role = "nurse"
                user_id = "STF-NUR-0044"
                user_name = nurse_acc.get("full_name") or "Nurse Clara Garcia"
                verified_email = str(nurse_acc.get("email", "clara.garcia@ofphil.org.ph") or "").strip()
                verified_mobile = str(nurse_acc.get("contact", "0917 000 0890") or "").strip()
                stored_hash = nurse_acc.get("password_hash")
            elif uname == reg_adm_user:
                role = "admin"
                user_id = "STF-ADM-0001"
                user_name = adm_acc.get("full_name") or "Dr. Roberto Reyes, MD"
                raw_email = str(adm_acc.get("email", "trishtanroxas@gmail.com") or "").strip()
                verified_email = raw_email if (raw_email and "@" in raw_email) else ""
                raw_mobile = str(adm_acc.get("contact", "0917 000 0001") or "").strip()
                verified_mobile = raw_mobile if len(normalize_ph_mobile(raw_mobile)) >= 10 else ""
                stored_hash = adm_acc.get("password_hash")
            else:
                raise HTTPException(status_code=401, detail="Invalid administrator or clinical staff username.")

            if stored_hash:
                is_valid = verify_password(payload.password, stored_hash)
            else:
                is_valid = hmac.compare_digest(payload.password, "Ofphil@2026")
            if not is_valid:
                raise HTTPException(status_code=401, detail="Incorrect staff password. Please verify your credentials.")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported role '{role}'.")

        available_methods = [
            TwoFactorMethodOption(
                method="email",
                available=bool(verified_email),
                masked_destination=mask_email(verified_email) if verified_email else None,
                reason=None if verified_email else "No verified email address on file for this account.",
            ),
            TwoFactorMethodOption(
                method="sms",
                available=bool(verified_mobile),
                masked_destination=mask_mobile(verified_mobile) if verified_mobile else None,
                reason=None if verified_mobile else "No verified mobile number on file for this account.",
            ),
        ]
        has_verified_contact = bool(verified_email or verified_mobile)

        session_id = f"2fa_{secrets.token_hex(12)}"
        now = time.time()
        self._sessions[session_id] = {
            "session_type": "profile_password",
            "session_id": session_id,
            "session_type": "login_2fa",
            "account_key": f"{role}:{user_id}",
            "role": role,
            "user_id": user_id,
            "user_name": user_name,
            "verified_email": verified_email,
            "verified_mobile": verified_mobile,
            "delivery_method": None,
            "masked_destination": None,
            "otp_hash": None,
            "otp_active": False,
            "otp_expires_at": 0.0,
            "last_sent_at": 0.0,
            "attempts": 0,
            "pre_auth_expires_at": now + PRE_AUTH_TTL_SECONDS,
            "verified": False,
        }

        log_audit_event(
            action="LOGIN_CREDENTIALS_VERIFIED",
            actor_id=user_id,
            role=role,
            resource=f"auth:session:{session_id}",
            status="SUCCESS",
        )

        return LoginResponse(
            status="2fa_required",
            session_id=session_id,
            role=role,
            user_id=user_id,
            user_name=user_name,
            available_methods=available_methods,
            has_verified_contact=has_verified_contact,
            message=(
                "Credentials verified. Choose your preferred Two-Factor Authentication delivery method."
                if has_verified_contact
                else "No verified contact method is on file for this account. Please use account recovery or contact an administrator."
            ),
        )

    def send_2fa_otp(self, payload: Send2FAOTPRequest) -> Send2FAOTPResponse:
        sess = self._sessions.get(payload.session_id)
        if not sess or sess.get("session_type") != "login_2fa" or sess.get("verified"):
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired Two-Factor Authentication session. Please sign in again.",
            )

        now = time.time()
        if now > float(sess.get("pre_auth_expires_at", 0)):
            sess["otp_active"] = False
            sess["otp_hash"] = None
            raise HTTPException(
                status_code=400,
                detail="Two-Factor Authentication session expired. Please sign in again.",
            )

        rate_key = f"2fa:{sess['account_key']}"
        self._check_rate_limit_and_cooldown(rate_key)

        role = sess["role"]
        role_labels = {
            "patient": "Patient Beneficiary Portal",
            "msw": "Medical Social Services (MSW)",
            "admin": "Clinic Administration",
            "nurse": "Clinical Nursing Staff",
        }
        role_label = role_labels.get(role, "OFPHIL Portal")

        if payload.delivery_method == "email":
            target_email = sess.get("verified_email", "")
            if not target_email:
                raise HTTPException(
                    status_code=400,
                    detail="No verified email address is registered for this account.",
                )
        else:
            target_mobile = sess.get("verified_mobile", "")
            if not target_mobile:
                raise HTTPException(
                    status_code=400,
                    detail="No verified mobile number is registered for this account.",
                )

        otp = f"{secrets.randbelow(900000) + 100000}"

        if payload.delivery_method == "email":
            sent, err_msg = send_login_2fa_otp_email(
                to_email=target_email,
                role_title=role_label,
                recipient_name=sess["user_name"],
                code=otp,
                expires_minutes=OTP_TTL_SECONDS // 60,
            )
            if not sent:
                log_audit_event(
                    action="LOGIN_2FA_DISPATCH",
                    actor_id=sess["user_id"],
                    role=role,
                    resource=f"auth:session:{payload.session_id}",
                    status="FAILED",
                    details={"method": "email", "reason": err_msg or "SMTP delivery failed"},
                )
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=err_msg or "Unable to send verification email at this time. Please try again later.",
                )
            masked_dest = mask_email(target_email)
            msg = "Enter the 6-digit one-time PIN sent to your verified email address."
        else:
            sms_text = (
                f"OFPHIL {role_label} 2FA: Your security code is {otp}. "
                "Expires in 5 minutes. If you did not initiate this sign-in, secure your account immediately."
            )
            sent, err_msg = send_sms_otp(target_mobile, sms_text)
            if not sent:
                log_audit_event(
                    action="LOGIN_2FA_DISPATCH",
                    actor_id=sess["user_id"],
                    role=role,
                    resource=f"auth:session:{payload.session_id}",
                    status="FAILED",
                    details={"method": "sms", "reason": err_msg or "SMS provider unavailable"},
                )
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=err_msg or "SMS delivery service is currently unavailable.",
                )
            masked_dest = mask_mobile(target_mobile)
            msg = "Enter the 6-digit one-time PIN sent to your verified mobile number."

        # Invalidate any previous OTP for this session and store hashed OTP only after confirmed dispatch
        sess["delivery_method"] = payload.delivery_method
        sess["masked_destination"] = masked_dest
        sess["otp_hash"] = self._hash_secret(payload.session_id, otp)
        sess["otp_active"] = True
        sess["otp_expires_at"] = now + OTP_TTL_SECONDS
        sess["last_sent_at"] = now
        sess["attempts"] = 0
        self._rate_history.setdefault(rate_key, []).append(now)

        log_audit_event(
            action="LOGIN_2FA_DISPATCH",
            actor_id=sess["user_id"],
            role=role,
            resource=f"auth:session:{payload.session_id}",
            status="SUCCESS",
            details={"method": payload.delivery_method, "masked_destination": masked_dest},
        )

        return Send2FAOTPResponse(
            status="otp_sent",
            session_id=payload.session_id,
            role=role,
            delivery_method=payload.delivery_method,
            masked_destination=masked_dest,
            expires_in_seconds=OTP_TTL_SECONDS,
            resend_cooldown_seconds=RESEND_COOLDOWN_SECONDS,
            message=msg,
        )

    def verify_2fa(self, payload: Verify2FARequest) -> Verify2FAResponse:
        sess = self._sessions.get(payload.session_id)
        if not sess or sess.get("session_type") != "login_2fa" or sess.get("verified"):
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired Two-Factor Authentication session. Please sign in again.",
            )

        if payload.role and payload.role.lower().strip() != sess["role"]:
            raise HTTPException(
                status_code=403,
                detail="Role mismatch for this Two-Factor Authentication session.",
            )

        if not sess.get("otp_active") or not sess.get("otp_hash"):
            raise HTTPException(
                status_code=400,
                detail="No active security code found. Please request a verification code first.",
            )

        now = time.time()
        if now > float(sess.get("otp_expires_at", 0)):
            sess["otp_active"] = False
            sess["otp_hash"] = None
            raise HTTPException(
                status_code=400,
                detail="Two-Factor security code has expired. Please request a new code.",
            )

        if int(sess.get("attempts", 0)) >= MAX_OTP_ATTEMPTS:
            sess["otp_active"] = False
            sess["otp_hash"] = None
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Maximum verification attempts exceeded. Please request a new security code.",
            )

        expected_hash = sess.get("otp_hash")
        code_hash = self._hash_secret(payload.session_id, payload.otp_code.strip())
        if not hmac.compare_digest(code_hash, expected_hash):
            sess["attempts"] = int(sess.get("attempts", 0)) + 1
            remaining = max(0, MAX_OTP_ATTEMPTS - sess["attempts"])
            if remaining == 0:
                sess["otp_active"] = False
                sess["otp_hash"] = None
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many incorrect attempts. This security code has been invalidated. Please request a new code.",
                )
            raise HTTPException(
                status_code=400,
                detail=f"Invalid 6-digit security code. {remaining} attempt(s) remaining.",
            )

        # Valid OTP: mark session verified and invalidate OTP to prevent reuse
        sess["verified"] = True
        sess["otp_active"] = False
        sess["otp_hash"] = None
        role = sess["role"]

        if role in ("admin", "nurse"):
            redirect_url = "/admin/patient-records"
        elif role == "msw":
            redirect_url = "/dashboard"
        else:
            redirect_url = "/portal?tab=dashboard"

        log_audit_event(
            action="LOGIN_2FA_SUCCESS",
            actor_id=sess["user_id"],
            role=role,
            resource=f"auth:session:{payload.session_id}",
            status="SUCCESS",
            details={"method": sess.get("delivery_method")},
        )

        return Verify2FAResponse(
            status="authenticated",
            role=role,
            user_id=sess["user_id"],
            user_name=sess["user_name"],
            redirect_url=redirect_url,
            message="Two-Factor Authentication successful.",
        )

    def request_profile_password_otp(self, payload: ProfilePasswordOTPRequest) -> ProfilePasswordOTPResponse:
        role = payload.role
        user_id = (payload.user_id or "").strip()

        if payload.new_password != payload.confirm_password:
            raise HTTPException(status_code=422, detail="New password and confirmation do not match.")

        if len(payload.new_password) < 6:
            raise HTTPException(status_code=422, detail="New password must be at least 6 characters long.")

        # 1. Verify Current Password
        if role == "patient":
            patient_id = user_id or "M26-11-00001"
            from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY
            matched_patient = None
            for p in REGISTERED_PATIENTS_REGISTRY:
                if str(p.get("patient_id", "")).strip().upper() == patient_id.upper():
                    matched_patient = p
                    break

            if not matched_patient:
                raise HTTPException(status_code=404, detail=f"Patient record '{patient_id}' not found.")

            cred = self._patient_creds.get(matched_patient.get("patient_id", patient_id))
            is_valid = False
            if cred and cred.get("password_hash"):
                is_valid = verify_password(payload.current_password, cred["password_hash"])
            elif matched_patient.get("password_hash"):
                is_valid = verify_password(payload.current_password, matched_patient["password_hash"])
            else:
                default_pass = str(matched_patient.get("initial_password") or "Ofphil@2026")
                is_valid = hmac.compare_digest(payload.current_password, default_pass)

            if not is_valid:
                raise HTTPException(status_code=401, detail="Current password verification failed. Please enter your existing password.")

            role_title = "Patient Portal"
            recipient_name = f"{matched_patient.get('first_name', '')} {matched_patient.get('last_name', '')}".strip() or "Patient"
            target_email = str(matched_patient.get("email") or "").strip()
            email_verified = bool(matched_patient.get("email_verified", True))
            target_mobile = str(matched_patient.get("contact") or "").strip()
            phone_verified = bool(matched_patient.get("phone_verified", True))
            if payload.method == "email" and (not target_email or "@" not in target_email or not email_verified):
                raise HTTPException(status_code=400, detail="No verified email address is registered for this patient account.")
            if payload.method == "sms" and (len(normalize_ph_mobile(target_mobile)) < 10 or not phone_verified):
                raise HTTPException(status_code=400, detail="No verified mobile number is registered for this patient account.")

        elif role == "msw":
            msw_acc = settings_service._cache.get("msw_account", {})
            stored_hash = msw_acc.get("password_hash")
            if stored_hash:
                is_valid = verify_password(payload.current_password, stored_hash)
            else:
                is_valid = hmac.compare_digest(payload.current_password, "Ofphil@2026")

            if not is_valid:
                raise HTTPException(status_code=401, detail="Current password verification failed. Please enter your existing MSW password.")

            role_title = "Medical Social Worker"
            recipient_name = msw_acc.get("full_name") or "Maria Santos, RSW"
            target_email = msw_acc.get("email") or "roxastal.cbpa@gmail.com"
            target_mobile = msw_acc.get("contact") or "0918 555 1234"

        elif role == "admin":
            adm_acc = settings_service._cache.get("account", {})
            stored_hash = adm_acc.get("password_hash")
            if stored_hash:
                is_valid = verify_password(payload.current_password, stored_hash)
            else:
                is_valid = hmac.compare_digest(payload.current_password, "Ofphil@2026")

            if not is_valid:
                raise HTTPException(status_code=401, detail="Current password verification failed. Please enter your existing administrator password.")

            role_title = "Clinic Administrator"
            recipient_name = adm_acc.get("full_name") or "Dr. Roberto Reyes, MD"
            target_email = str(adm_acc.get("email") or "trishtanroxas@gmail.com").strip()
            target_mobile = str(adm_acc.get("contact") or "0917 000 0001").strip()

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported role '{role}'.")

        # 2. Generate 6-digit OTP
        code = f"{secrets.randbelow(900000) + 100000}"
        session_id = f"prof_pw_{secrets.token_hex(8)}"

        # 3. Dispatch via chosen method
        method = payload.method
        if method == "email":
            masked_dest = mask_email(target_email)
            sent = send_profile_password_otp_email(
                to_email=target_email,
                role_title=role_title,
                recipient_name=recipient_name,
                code=code,
                delivery_method="Email Address",
            )
            if not sent:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Unable to send verification email at this time. Please verify SMTP settings or try SMS.",
                )
        else:
            masked_dest = mask_mobile(target_mobile)
            sms_text = (
                f"OFPHIL {role_title}: Your password change authorization code is {code}. "
                "Valid for 10 minutes. If you did not request this, contact clinic administration immediately."
            )
            sent, err_msg = send_sms_otp(target_mobile, sms_text)
            if not sent:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=err_msg or "SMS delivery service is currently unavailable.",
                )

        self._sessions[session_id] = {
            "session_type": "profile_password",
            "session_id": session_id,
            "role": role,
            "user_id": user_id or recipient_name,
            "new_password": payload.new_password,
            "otp_hash": self._hash_secret(session_id, code),
            "expires_at": time.time() + 600,
            "verified": False,
        }

        log_audit_event(
            action="PROFILE_PASSWORD_OTP_REQUESTED",
            actor_id=user_id or role,
            role=role,
            resource=f"account:{role}:password_change",
            status="SUCCESS",
        )

        return ProfilePasswordOTPResponse(
            status="otp_sent",
            session_id=session_id,
            role=role,
            delivery_method=method,
            masked_destination=masked_dest,
            expires_in_seconds=600,
            message=f"Verification security code sent to your registered {method.upper()} ({masked_dest}).",
        )

    def confirm_profile_password_otp(self, payload: ProfilePasswordConfirmRequest) -> ProfilePasswordConfirmResponse:
        sess = self._sessions.get(payload.session_id)
        if not sess or sess.get("session_type") != "profile_password" or sess.get("verified"):
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired password change verification session. Please request a new code.",
            )

        if time.time() > float(sess.get("expires_at", 0)):
            raise HTTPException(
                status_code=400,
                detail="Verification security code has expired. Please request a new code.",
            )

        expected_hash = sess.get("otp_hash")
        candidate_hash = self._hash_secret(payload.session_id, payload.otp_code.strip())
        if not (expected_hash and hmac.compare_digest(candidate_hash, expected_hash)):
            raise HTTPException(
                status_code=400,
                detail="Invalid 6-digit security code. Please check your inbox or phone and try again.",
            )

        new_password = sess["new_password"]
        role = sess["role"]
        new_hash = hash_password(new_password)
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if role == "patient":
            ident = sess.get("user_id") or "M26-11-00001"
            from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY
            for p in REGISTERED_PATIENTS_REGISTRY:
                if str(p.get("patient_id", "")).strip().upper() == ident.upper():
                    p["password_hash"] = new_hash
                    p["password_updated_at"] = now_iso
                    break
            self._patient_creds[ident] = {
                "patient_id": ident,
                "password_hash": new_hash,
                "password_updated_at": now_iso,
            }
            self._save_patient_creds()
        elif role == "msw":
            acct = settings_service._cache.get("msw_account", {})
            acct["password_hash"] = new_hash
            acct["password_updated_at"] = now_iso
            settings_service._cache["msw_account"] = acct
            settings_service._save_to_storage()
        elif role == "admin":
            acct = settings_service._cache.get("account", {})
            acct["password_hash"] = new_hash
            acct["password_updated_at"] = now_iso
            settings_service._cache["account"] = acct
            settings_service._save_to_storage()

        sess["verified"] = True

        log_audit_event(
            action="PROFILE_PASSWORD_UPDATED_WITH_OTP",
            actor_id=sess["user_id"],
            role=role,
            resource=f"account:{role}:password",
            status="SUCCESS",
        )

        return ProfilePasswordConfirmResponse(
            success=True,
            role=role,
            message="Your account password has been updated and securely hashed with Argon2id.",
            updated_at=now_iso,
        )

    @staticmethod
    def _format_ph_mobile_display(digits: str) -> str:
        if len(digits) == 11 and digits.startswith("09"):
            return f"{digits[:4]} {digits[4:7]} {digits[7:]}"
        return digits

    def _is_contact_taken(self, contact_type: str, candidate_val: str, exclude_account_key: str) -> bool:
        from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY

        if contact_type == "email":
            cand_lower = candidate_val.strip().lower()
            for p in REGISTERED_PATIENTS_REGISTRY:
                acct_k = f"patient:{p.get('patient_id')}"
                if acct_k == exclude_account_key:
                    continue
                if str(p.get("email") or "").strip().lower() == cand_lower:
                    return True
            for key, role_name in (("msw_account", "msw"), ("account", "admin"), ("nurse_account", "nurse")):
                acct = settings_service._cache.get(key, {})
                acct_k = f"{role_name}:{acct.get('username', key)}"
                if acct_k == exclude_account_key:
                    continue
                if str(acct.get("email") or "").strip().lower() == cand_lower:
                    return True
            return False

        # mobile
        cand_norm = normalize_ph_mobile(candidate_val)
        for p in REGISTERED_PATIENTS_REGISTRY:
            acct_k = f"patient:{p.get('patient_id')}"
            if acct_k == exclude_account_key:
                continue
            if normalize_ph_mobile(str(p.get("contact") or "")) == cand_norm:
                return True
        for key, role_name in (("msw_account", "msw"), ("account", "admin"), ("nurse_account", "nurse")):
            acct = settings_service._cache.get(key, {})
            acct_k = f"{role_name}:{acct.get('username', key)}"
            if acct_k == exclude_account_key:
                continue
            if normalize_ph_mobile(str(acct.get("contact") or "")) == cand_norm:
                return True
        return False

    def _resolve_profile_account_for_contact_change(
        self, role: str, user_id: Optional[str], current_password: str
    ) -> Tuple[str, str, str, str, str, str]:
        """
        Verifies current password and returns:
        (account_key, actor_id, role_title, recipient_name, current_email, current_mobile)
        """
        if role == "patient":
            pid = (user_id or "").strip() or "M26-11-00001"
            from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY

            matched_patient = None
            for p in REGISTERED_PATIENTS_REGISTRY:
                if str(p.get("patient_id", "")).strip().upper() == pid.upper():
                    matched_patient = p
                    break
            if not matched_patient:
                raise HTTPException(status_code=404, detail=f"Patient record '{pid}' not found.")

            pid_norm = matched_patient.get("patient_id", pid)
            cred = self._patient_creds.get(pid_norm)
            is_valid = False
            if cred and cred.get("password_hash"):
                is_valid = verify_password(current_password, cred["password_hash"])
            elif matched_patient.get("password_hash"):
                is_valid = verify_password(current_password, matched_patient["password_hash"])
            else:
                default_pass = str(matched_patient.get("initial_password") or "Ofphil@2026")
                is_valid = hmac.compare_digest(current_password, default_pass)

            if not is_valid:
                raise HTTPException(status_code=401, detail="Current password verification failed. Please enter your existing password.")

            recipient_name = f"{matched_patient.get('first_name', '')} {matched_patient.get('last_name', '')}".strip() or "Patient"
            return (
                f"patient:{pid_norm}",
                pid_norm,
                "Patient Beneficiary Portal",
                recipient_name,
                str(matched_patient.get("email") or "").strip(),
                str(matched_patient.get("contact") or "").strip(),
            )

        if role == "msw":
            msw_acc = settings_service._cache.get("msw_account", {})
            stored_hash = msw_acc.get("password_hash")
            is_valid = verify_password(current_password, stored_hash) if stored_hash else hmac.compare_digest(current_password, "Ofphil@2026")
            if not is_valid:
                raise HTTPException(status_code=401, detail="Current password verification failed. Please enter your existing MSW password.")
            uname = str(msw_acc.get("username", "msw_lead")).strip()
            return (
                f"msw:{uname}",
                uname,
                "Medical Social Services (MSW)",
                msw_acc.get("full_name") or "Maria Santos, RSW",
                str(msw_acc.get("email") or "").strip(),
                str(msw_acc.get("contact") or "").strip(),
            )

        if role == "admin":
            adm_acc = settings_service._cache.get("account", {})
            stored_hash = adm_acc.get("password_hash")
            is_valid = verify_password(current_password, stored_hash) if stored_hash else hmac.compare_digest(current_password, "Ofphil@2026")
            if not is_valid:
                raise HTTPException(status_code=401, detail="Current password verification failed. Please enter your existing administrator password.")
            uname = str(adm_acc.get("username", "admin_sys")).strip()
            return (
                f"admin:{uname}",
                uname,
                "Clinic Administration",
                adm_acc.get("full_name") or "Dr. Roberto Reyes, MD",
                str(adm_acc.get("email") or "").strip(),
                str(adm_acc.get("contact") or "").strip(),
            )

        raise HTTPException(status_code=400, detail=f"Unsupported role '{role}'.")

    def _dispatch_contact_change_otp(
        self, contact_type: str, destination: str, role_title: str, recipient_name: str, otp: str
    ) -> str:
        if contact_type == "email":
            sent, err_msg = send_contact_change_otp_email(
                to_email=destination,
                role_title=role_title,
                recipient_name=recipient_name,
                code=otp,
                expires_minutes=OTP_TTL_SECONDS // 60,
            )
            if not sent:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=err_msg or "Unable to send verification email to the new address.",
                )
            return mask_email(destination)

        sms_text = (
            f"OFPHIL {role_title}: Your new mobile verification code is {otp}. "
            "Expires in 5 minutes. If you did not request this change, ignore this message."
        )
        sent, err_msg = send_sms_otp(destination, sms_text)
        if not sent:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=err_msg or "SMS delivery service is currently unavailable.",
            )
        return mask_mobile(destination)

    def request_contact_change_otp(
        self, payload: ContactChangeRequestPayload, actor_role_header: Optional[str] = None
    ) -> ContactChangeDispatchResponse:
        if actor_role_header and actor_role_header.strip().lower() not in (payload.role, "nurse"):
            raise HTTPException(status_code=403, detail="Unauthorized: cannot modify another role's contact information.")

        account_key, actor_id, role_title, recipient_name, curr_email, curr_mobile = (
            self._resolve_profile_account_for_contact_change(payload.role, payload.user_id, payload.current_password)
        )

        raw_new = payload.new_value.strip()
        if payload.contact_type == "email":
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", raw_new):
                raise HTTPException(status_code=422, detail="Please enter a valid email address.")
            proposed = raw_new.lower()
            current_contact = curr_email
            if curr_email and curr_email.lower() == proposed:
                raise HTTPException(status_code=400, detail="New email address must be different from your current registered email.")
        else:
            digits = normalize_ph_mobile(raw_new)
            if len(digits) < 10 or (digits.startswith("09") and len(digits) != 11):
                raise HTTPException(status_code=422, detail="Please enter a valid Philippine mobile number (e.g. 0917 123 4567).")
            proposed = self._format_ph_mobile_display(digits)
            current_contact = curr_mobile
            if curr_mobile and normalize_ph_mobile(curr_mobile) == digits:
                raise HTTPException(status_code=400, detail="New mobile number must be different from your current registered mobile number.")

        if self._is_contact_taken(payload.contact_type, proposed, exclude_account_key=account_key):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This {'email address' if payload.contact_type == 'email' else 'mobile number'} is already registered to another account.",
            )

        rate_key = f"contact_change:{account_key}:{payload.contact_type}"
        self._check_rate_limit_and_cooldown(rate_key)

        # Invalidate any previous pending contact change for this account & contact_type
        for sess in self._sessions.values():
            if (
                sess.get("session_type") == "contact_change"
                and sess.get("account_key") == account_key
                and sess.get("contact_type") == payload.contact_type
                and sess.get("status") == "pending"
            ):
                sess["status"] = "superseded"
                sess["otp_hash"] = None

        change_id = f"cc_{secrets.token_urlsafe(12)}"
        otp = f"{secrets.randbelow(900000) + 100000}"
        masked_dest = self._dispatch_contact_change_otp(
            contact_type=payload.contact_type,
            destination=proposed,
            role_title=role_title,
            recipient_name=recipient_name,
            otp=otp,
        )

        now = time.time()
        self._sessions[change_id] = {
            "session_type": "contact_change",
            "change_id": change_id,
            "account_key": account_key,
            "role": payload.role,
            "actor_id": actor_id,
            "role_title": role_title,
            "recipient_name": recipient_name,
            "contact_type": payload.contact_type,
            "current_contact": current_contact,
            "current_email": curr_email,
            "current_mobile": curr_mobile,
            "proposed_contact": proposed,
            "masked_new_destination": masked_dest,
            "otp_hash": self._hash_secret(change_id, otp),
            "expires_at": now + OTP_TTL_SECONDS,
            "last_sent_at": now,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "attempts": 0,
            "status": "pending",
        }
        self._rate_history.setdefault(rate_key, []).append(now)

        log_audit_event(
            action="CONTACT_CHANGE_OTP_SENT",
            actor_id=actor_id,
            role=payload.role,
            resource=f"account:{account_key}:{payload.contact_type}",
            status="SUCCESS",
            details={"masked_new_destination": masked_dest},
        )

        msg = (
            "We sent a six-digit verification code to your new email address. Please check your inbox or spam folder."
            if payload.contact_type == "email"
            else "We sent a six-digit verification code to your new mobile number. Please check your SMS messages."
        )
        return ContactChangeDispatchResponse(
            status="otp_sent",
            change_id=change_id,
            role=payload.role,
            contact_type=payload.contact_type,
            masked_new_destination=masked_dest,
            expires_in_seconds=OTP_TTL_SECONDS,
            resend_cooldown_seconds=RESEND_COOLDOWN_SECONDS,
            message=msg,
        )

    def resend_contact_change_otp(
        self, payload: ContactChangeResendPayload, actor_role_header: Optional[str] = None
    ) -> ContactChangeDispatchResponse:
        sess = self._sessions.get(payload.change_id)
        if not sess or sess.get("session_type") != "contact_change" or sess.get("status") != "pending":
            raise HTTPException(status_code=400, detail="Invalid or expired contact change verification session.")

        if actor_role_header and actor_role_header.strip().lower() not in (sess["role"], "nurse"):
            raise HTTPException(status_code=403, detail="Unauthorized: role mismatch.")

        rate_key = f"contact_change:{sess['account_key']}:{sess['contact_type']}"
        self._check_rate_limit_and_cooldown(rate_key)

        otp = f"{secrets.randbelow(900000) + 100000}"
        masked_dest = self._dispatch_contact_change_otp(
            contact_type=sess["contact_type"],
            destination=sess["proposed_contact"],
            role_title=sess["role_title"],
            recipient_name=sess["recipient_name"],
            otp=otp,
        )

        now = time.time()
        sess["otp_hash"] = self._hash_secret(payload.change_id, otp)
        sess["expires_at"] = now + OTP_TTL_SECONDS
        sess["last_sent_at"] = now
        sess["attempts"] = 0
        self._rate_history.setdefault(rate_key, []).append(now)

        msg = (
            "A new six-digit verification code has been sent to your new email address."
            if sess["contact_type"] == "email"
            else "A new six-digit verification code has been sent to your new mobile number."
        )
        return ContactChangeDispatchResponse(
            status="otp_sent",
            change_id=payload.change_id,
            role=sess["role"],
            contact_type=sess["contact_type"],
            masked_new_destination=masked_dest,
            expires_in_seconds=OTP_TTL_SECONDS,
            resend_cooldown_seconds=RESEND_COOLDOWN_SECONDS,
            message=msg,
        )

    def verify_contact_change_otp(
        self, payload: ContactChangeVerifyPayload, actor_role_header: Optional[str] = None
    ) -> ContactChangeVerifyResponse:
        sess = self._sessions.get(payload.change_id)
        if not sess or sess.get("session_type") != "contact_change" or sess.get("status") != "pending":
            raise HTTPException(status_code=400, detail="Invalid or expired contact change verification session.")

        if actor_role_header and actor_role_header.strip().lower() not in (sess["role"], "nurse"):
            raise HTTPException(status_code=403, detail="Unauthorized: role mismatch.")

        now = time.time()
        if now > float(sess.get("expires_at", 0)):
            sess["status"] = "expired"
            sess["otp_hash"] = None
            raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new code.")

        if int(sess.get("attempts", 0)) >= MAX_OTP_ATTEMPTS:
            sess["status"] = "locked"
            sess["otp_hash"] = None
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Maximum verification attempts exceeded. Please start a new contact change request.",
            )

        expected_hash = sess.get("otp_hash")
        candidate_hash = self._hash_secret(payload.change_id, payload.otp_code.strip())
        if not (expected_hash and hmac.compare_digest(candidate_hash, expected_hash)):
            sess["attempts"] = int(sess.get("attempts", 0)) + 1
            remaining = max(0, MAX_OTP_ATTEMPTS - sess["attempts"])
            if remaining == 0:
                sess["status"] = "locked"
                sess["otp_hash"] = None
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many incorrect attempts. This verification session has been invalidated.",
                )
            raise HTTPException(status_code=400, detail=f"Incorrect verification code. {remaining} attempt(s) remaining.")

        # Re-check uniqueness right before commit to prevent race conditions
        if self._is_contact_taken(sess["contact_type"], sess["proposed_contact"], exclude_account_key=sess["account_key"]):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This contact information was recently claimed by another account.",
            )

        role = sess["role"]
        ctype = sess["contact_type"]
        new_val = sess["proposed_contact"]
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if role == "patient":
            from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY
            matched_patient = None
            for p in REGISTERED_PATIENTS_REGISTRY:
                if str(p.get("patient_id", "")).strip().upper() == sess["actor_id"].upper():
                    matched_patient = p
                    break
            if not matched_patient:
                raise HTTPException(status_code=404, detail="Patient record not found.")
            if ctype == "email":
                matched_patient["email"] = new_val
                matched_patient["email_verified"] = True
            else:
                matched_patient["contact"] = new_val
                matched_patient["phone_verified"] = True
        elif role == "msw":
            acct = settings_service._cache.get("msw_account", {})
            if ctype == "email":
                acct["email"] = new_val
            else:
                acct["contact"] = new_val
            settings_service._cache["msw_account"] = acct
            settings_service._save_to_storage()
        elif role == "admin":
            acct = settings_service._cache.get("account", {})
            if ctype == "email":
                acct["email"] = new_val
            else:
                acct["contact"] = new_val
            settings_service._cache["account"] = acct
            settings_service._save_to_storage()

        # Invalidate OTP & mark verified
        sess["status"] = "verified"
        sess["otp_hash"] = None

        # Phase 6: Security notifications (non-blocking after commit)
        warnings: List[str] = []
        ctype_label = "Email Address" if ctype == "email" else "Mobile Number"
        old_masked = (
            mask_email(sess["current_contact"])
            if (ctype == "email" and sess["current_contact"])
            else mask_mobile(sess["current_contact"])
            if (ctype == "mobile" and sess["current_contact"])
            else "Not Previously Set"
        )
        new_masked = sess["masked_new_destination"]

        # 1. Notify previous registered email address
        prev_email = sess.get("current_email") or ""
        if prev_email and "@" in prev_email:
            ok_old, err_old = send_contact_change_security_notice_email(
                to_email=prev_email,
                role_title=sess["role_title"],
                recipient_name=sess["recipient_name"],
                contact_type_label=ctype_label,
                old_masked=old_masked,
                new_masked=new_masked,
                changed_at=now_iso,
                is_new_address=False,
            )
            if not ok_old:
                warnings.append(f"Previous email notification pending: {err_old}")
                log_audit_event(
                    action="CONTACT_CHANGE_SECURITY_NOTICE",
                    actor_id=sess["actor_id"],
                    role=role,
                    resource=f"account:{sess['account_key']}",
                    status="WARNING",
                    details={"target": "previous_email", "reason": err_old},
                )

        # 2. Notify new verified contact (and old mobile via SMS if mobile changed)
        if ctype == "email":
            ok_new, err_new = send_contact_change_security_notice_email(
                to_email=new_val,
                role_title=sess["role_title"],
                recipient_name=sess["recipient_name"],
                contact_type_label=ctype_label,
                old_masked=old_masked,
                new_masked=new_masked,
                changed_at=now_iso,
                is_new_address=True,
            )
            if not ok_new:
                warnings.append(f"New email confirmation notice pending: {err_new}")
        else:
            if sess.get("current_mobile"):
                old_sms_notice = (
                    f"OFPHIL Security Notice ({sess['role_title']}): Your registered mobile number was changed to {new_masked}. "
                    "If you did not authorize this, contact your clinic administrator immediately."
                )
                ok_old_sms, err_old_sms = send_sms_otp(sess["current_mobile"], old_sms_notice)
                if not ok_old_sms:
                    warnings.append(f"Previous mobile SMS notice not sent: {err_old_sms}")
            new_sms_notice = (
                f"OFPHIL Confirmed ({sess['role_title']}): This mobile number is now your verified contact for 2FA and recovery."
            )
            ok_new_sms, err_new_sms = send_sms_otp(new_val, new_sms_notice)
            if not ok_new_sms:
                warnings.append(f"New mobile confirmation SMS not sent: {err_new_sms}")

        log_audit_event(
            action="CONTACT_INFORMATION_UPDATED",
            actor_id=sess["actor_id"],
            role=role,
            resource=f"account:{sess['account_key']}:{ctype}",
            status="SUCCESS",
            details={"old_masked": old_masked, "new_masked": new_masked},
        )

        return ContactChangeVerifyResponse(
            success=True,
            role=role,
            contact_type=ctype,
            updated_value=new_val,
            masked_value=new_masked,
            updated_at=now_iso,
            notification_warnings=warnings,
            message=f"Your verified {ctype_label.lower()} has been securely updated.",
        )

    def cancel_contact_change(
        self, payload: ContactChangeCancelPayload, actor_role_header: Optional[str] = None
    ) -> Dict[str, Any]:
        sess = self._sessions.get(payload.change_id)
        if sess and sess.get("session_type") == "contact_change":
            if actor_role_header and actor_role_header.strip().lower() not in (sess["role"], "nurse"):
                raise HTTPException(status_code=403, detail="Unauthorized: role mismatch.")
            if sess.get("status") == "pending":
                sess["status"] = "cancelled"
                sess["otp_hash"] = None
        return {"status": "cancelled", "change_id": payload.change_id}


recovery_service = PasswordRecoveryService()
