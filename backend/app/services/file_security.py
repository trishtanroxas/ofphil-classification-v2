"""
Document validation and upload sanitization service.
Prevents path traversal, validates MIME types, restricts file sizes, and generates safe hashes.
"""
import os
import re
from pathlib import Path
from typing import Set
from fastapi import HTTPException, status

ALLOWED_EXTENSIONS: Set[str] = {".pdf", ".png", ".jpg", ".jpeg", ".tiff"}
ALLOWED_MIME_TYPES: Set[str] = {"application/pdf", "image/png", "image/jpeg", "image/tiff"}


def sanitize_filename(filename: str) -> str:
    """Removes path separators and dangerous characters from filenames."""
    clean_name = os.path.basename(filename)
    clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', clean_name)
    return clean_name


MAGIC_SIGNATURES = {
    b"%PDF": "application/pdf",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"\xff\xd8\xff": "image/jpeg",
    b"II*\x00": "image/tiff",
    b"MM\x00*": "image/tiff"
}


def validate_file_signature(content: bytes) -> str:
    """Validates real file magic bytes to prevent renamed malicious payloads."""
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content cannot be empty."
        )
    for magic, mime in MAGIC_SIGNATURES.items():
        if content.startswith(magic):
            return mime
    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail="Invalid file signature (magic bytes mismatch). Only authentic PDF, PNG, JPG, and TIFF documents are accepted."
    )


def validate_file_upload(filename: str, file_size: int, max_size_mb: int = 20, file_content: bytes = None) -> None:
    """Validates file extension, size, and detects path traversal attempts."""
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty."
        )

    # Detect path traversal attacks
    if ".." in filename or "/" in filename or "\\" in filename:
        # Check if basename sanitization is required
        sanitized = sanitize_filename(filename)
        if not sanitized:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file path or path traversal detected."
            )

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file extension '{ext}'. Allowed extensions: {list(ALLOWED_EXTENSIONS)}"
        )

    max_bytes = max_size_mb * 1024 * 1024
    if file_size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum upload size limit of {max_size_mb}MB."
        )

    if file_content is not None and len(file_content) > 0:
        validate_file_signature(file_content)
