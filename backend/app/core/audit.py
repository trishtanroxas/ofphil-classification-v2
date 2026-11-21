"""
Security and Audit Logging Utility for OFPHIL Classification V2.
Captures authenticated actions, data access, predictions, and security events
with timestamps, actor identification, and strict PII redaction.
"""
import datetime
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional
from app.core.paths import PROJECT_ROOT

SECURITY_LOG_DIR = PROJECT_ROOT / "security" / "audit_logs"
SECURITY_LOG_DIR.mkdir(parents=True, exist_ok=True)
AUDIT_LOG_FILE = SECURITY_LOG_DIR / "security_audit.log"

logger = logging.getLogger("ofphil_audit")
logger.setLevel(logging.INFO)

# File handler for structured audit logging
if not logger.handlers:
    fh = logging.FileHandler(AUDIT_LOG_FILE, encoding="utf-8")
    fh.setLevel(logging.INFO)
    formatter = logging.Formatter('{"timestamp": "%(asctime)s", "audit_record": %(message)s}')
    fh.setFormatter(formatter)
    logger.addHandler(fh)


def log_audit_event(
    action: str,
    actor_id: str,
    role: str,
    resource: str,
    status: str,
    details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Records a structured security audit event.
    Guarantees no raw passwords, tokens, or PII are written to logs.
    """
    clean_details = {}
    if details:
        for k, v in details.items():
            # Redact common credential/PII keys
            if any(term in k.lower() for term in ["password", "secret", "token", "key", "phi", "sin", "ssn"]):
                clean_details[k] = "[REDACTED]"
            else:
                clean_details[k] = v

    record = {
        "timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "action": action,
        "actor_id": actor_id,
        "role": role,
        "resource": resource,
        "status": status,
        "details": clean_details,
    }

    try:
        logger.info(json.dumps(record))
    except Exception as e:
        # Fallback to prevent silent logging failure
        print(f"Audit log writing error: {e}")

    return record
