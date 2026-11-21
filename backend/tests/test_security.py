import pytest
from app.core import security, rbac
from app.services import file_security
from fastapi import HTTPException


def test_argon2id_hashing_and_verification():
    pw = "SuperSecurePassword2026!"
    hashed = security.hash_password(pw)
    assert hashed != pw
    assert hashed.startswith("$argon2id$")
    assert security.verify_password(pw, hashed) is True
    assert security.verify_password("WrongPassword", hashed) is False


def test_aes_256_gcm_encryption_and_decryption():
    key = b"01234567890123456789012345678901"  # 32 bytes
    plaintext = b"Sensitive Medical Diagnosis: Cataract OD Severe Indigency"
    aad = b"patient-id-12345"

    encrypted = security.encrypt_data(plaintext, key, associated_data=aad)
    assert encrypted != plaintext
    assert len(encrypted) > len(plaintext)  # includes 12-byte IV + 16-byte tag

    decrypted = security.decrypt_data(encrypted, key, associated_data=aad)
    assert decrypted == plaintext


def test_aes_256_gcm_tamper_detection():
    key = b"01234567890123456789012345678901"
    plaintext = b"Class A Subsidy"
    encrypted = bytearray(security.encrypt_data(plaintext, key))

    # Tamper with 1 byte of the payload
    encrypted[-1] ^= 0x01

    with pytest.raises(Exception):
        security.decrypt_data(bytes(encrypted), key)


def test_data_masking():
    masked_cred = security.mask_sensitive_string("secret_token_abcdef123456")
    assert "..." in masked_cred
    assert "abcdef" not in masked_cred

    masked_patient = security.mask_patient_identifier("Juan Dela Cruz")
    assert "J*** C***" == masked_patient


def test_file_upload_validation_and_path_traversal():
    # Valid file
    file_security.validate_file_upload("cert_indigency.pdf", file_size=1024, max_size_mb=20)

    # Disallowed extension
    with pytest.raises(HTTPException) as exc:
        file_security.validate_file_upload("malicious_script.exe", file_size=1024)
    assert exc.value.status_code == 415

    # Exceeding size
    with pytest.raises(HTTPException) as exc:
        file_security.validate_file_upload("huge_document.pdf", file_size=25 * 1024 * 1024, max_size_mb=20)
    assert exc.value.status_code == 413


def test_rbac_role_enforcement():
    checker = rbac.require_roles([rbac.UserRole.ADMIN, rbac.UserRole.MSW])
    assert checker(rbac.UserRole.ADMIN) == rbac.UserRole.ADMIN
    assert checker(rbac.UserRole.MSW) == rbac.UserRole.MSW

    with pytest.raises(HTTPException) as exc:
        checker(rbac.UserRole.RESEARCHER)
    assert exc.value.status_code == 403
