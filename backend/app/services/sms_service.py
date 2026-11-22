"""
SMS Delivery Service for OFPHIL V2 (Semaphore v4 API).
Never simulates SMS delivery when provider credentials are missing or failing.
"""
import re
from typing import Optional, Tuple
import httpx
from app.core.config import get_settings

settings = get_settings()


def normalize_ph_mobile(mobile: str) -> str:
    """Normalize Philippine mobile number to digits-only 09XXXXXXXXX for comparison."""
    digits = re.sub(r"\D", "", mobile or "")
    if digits.startswith("63") and len(digits) == 12:
        digits = "0" + digits[2:]
    return digits


def mask_mobile(mobile: str) -> str:
    digits = normalize_ph_mobile(mobile)
    if len(digits) >= 7:
        return f"{digits[:2]}******{digits[-3:]}"
    return "09*******"


def mask_email(email: str) -> str:
    if not email or "@" not in email:
        return "***@***"
    local, domain = email.split("@", 1)
    prefix = local[0] if local else "*"
    return f"{prefix}****@{domain}"


def send_sms_otp(recipient_mobile: str, message: str) -> Tuple[bool, Optional[str]]:
    """
    Sends an SMS via Semaphore v4 API.
    Returns (True, None) on confirmed provider acceptance, or (False, error_reason).
    """
    api_key = getattr(settings, "SEMAPHORE_API_KEY", None)
    if not api_key or not str(api_key).strip():
        return (
            False,
            "SMS recovery gateway (SEMAPHORE_API_KEY) is not configured on the server. "
            "Please select Email Address recovery or contact the system administrator.",
        )

    normalized = normalize_ph_mobile(recipient_mobile)
    if len(normalized) < 10:
        return (False, "Invalid mobile number format for SMS delivery.")

    try:
        resp = httpx.post(
            "https://api.semaphore.co/api/v4/messages",
            data={
                "apikey": api_key,
                "number": normalized,
                "message": message,
                "sendername": getattr(settings, "SEMAPHORE_SENDER_NAME", None) or "OFPHIL",
            },
            timeout=10.0,
        )
        if resp.status_code in (200, 201):
            return (True, None)
        return (False, f"SMS gateway rejected delivery (HTTP {resp.status_code}).")
    except Exception as exc:
        return (False, f"SMS gateway connection failed ({type(exc).__name__}).")
