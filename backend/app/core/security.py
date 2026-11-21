"""
Security utilities and cryptographic services for OFPHIL Classification V2:
- Password hashing with Argon2id
- Application-level field encryption via AES-256-GCM (cryptography.hazmat)
- Secure token generation
- Data masking for PII/PHI
"""
import base64
import os
import secrets
from typing import Optional, Tuple
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Initialize Argon2id password hasher with secure memory & time cost parameters
_ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MiB
    parallelism=4,
    hash_len=32,
    salt_len=16
)


def hash_password(password: str) -> str:
    """Hashes a plaintext password using Argon2id."""
    return _ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against an Argon2id hash."""
    try:
        return _ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, Exception):
        return False


def needs_rehash(hashed_password: str) -> bool:
    """Checks whether the password hash requires upgrading to newer parameters."""
    return _ph.check_needs_rehash(hashed_password)


def generate_token(length: int = 32) -> str:
    """Generate a cryptographically secure URL-safe random string."""
    return secrets.token_urlsafe(length)


def mask_sensitive_string(val: Optional[str]) -> str:
    """Mask credentials, tokens, or PII for safe display without information leakage."""
    if not val:
        return "Not Set"
    if len(val) <= 6:
        return "******"
    return f"{val[:3]}...{val[-3:]}"


def mask_patient_identifier(val: Optional[str]) -> str:
    """Mask patient full names or IDs for logs and non-clinical displays."""
    if not val:
        return "[ANONYMIZED]"
    parts = val.split()
    if len(parts) == 1:
        return f"{parts[0][0]}***"
    return f"{parts[0][0]}*** {parts[-1][0]}***"


# -----------------------------------------------------------------------------
# AES-256-GCM Encryption Services for Sensitive Field & File Protection
# -----------------------------------------------------------------------------
def derive_or_validate_key(key: bytes) -> bytes:
    """Ensures encryption key is exactly 256 bits (32 bytes)."""
    if len(key) != 32:
        raise ValueError("Encryption key must be exactly 32 bytes (256 bits) for AES-256-GCM.")
    return key


def encrypt_data(plaintext: bytes, key: bytes, associated_data: Optional[bytes] = None) -> bytes:
    """
    Encrypts arbitrary data using AES-256-GCM.
    Returns: 12-byte IV + ciphertext with 16-byte authentication tag appended.
    """
    aesgcm = AESGCM(derive_or_validate_key(key))
    iv = os.urandom(12)  # Standard 96-bit nonce
    ciphertext = aesgcm.encrypt(iv, plaintext, associated_data)
    return iv + ciphertext


def decrypt_data(encrypted_payload: bytes, key: bytes, associated_data: Optional[bytes] = None) -> bytes:
    """
    Decrypts AES-256-GCM payload.
    Extracts 12-byte IV and verifies GCM authentication tag.
    """
    if len(encrypted_payload) < 28:
        raise ValueError("Invalid encrypted payload size.")
    aesgcm = AESGCM(derive_or_validate_key(key))
    iv = encrypted_payload[:12]
    ciphertext = encrypted_payload[12:]
    return aesgcm.decrypt(iv, ciphertext, associated_data)
