import secrets
from typing import Optional


def generate_token(length: int = 32) -> str:
    """Generate a secure URL-safe random string."""
    return secrets.token_urlsafe(length)


def mask_sensitive_string(val: Optional[str]) -> str:
    """Mask credentials or keys for safe display."""
    if not val:
        return "Not Set"
    if len(val) <= 6:
        return "******"
    return f"{val[:3]}...{val[-3:]}"
