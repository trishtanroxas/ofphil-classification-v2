"""
Role-Based Access Control (RBAC) definitions and dependencies for FastAPI.
Roles:
  - Admin: System configuration, role management, audit inspections.
  - MSW (Medical Social Worker): Patient intake, evaluation, OCR inspection, eligibility classification.
  - Researcher: Synthetic data inspection, model benchmarking, ablation experiments (no direct PHI modification).
"""
from enum import Enum
from typing import List, Optional
from fastapi import Header, HTTPException, status
from itsdangerous import BadSignature, SignatureExpired
from app.core.security import verify_access_token


class UserRole(str, Enum):
    ADMIN = "admin"
    MSW = "msw"
    RESEARCHER = "researcher"
    PATIENT = "patient"
    NURSE = "nurse"


def get_current_user_role(
    x_user_role: str = Header(default="researcher", description="Simulated/Decoded user role for RBAC enforcement")
) -> UserRole:
    """Extracts and validates user role from session/token header."""
    role_normalized = x_user_role.strip().lower()
    try:
        return UserRole(role_normalized)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Invalid or unauthorized user role: '{x_user_role}'"
        )


def require_roles(allowed_roles: List[UserRole]):
    """FastAPI dependency factory enforcing server-side RBAC."""
    def role_checker(role: UserRole = Header(default="researcher", alias="x-user-role")):
        if isinstance(role, str):
            try:
                role = UserRole(role.lower())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access forbidden: unrecognized security role"
                )
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {[r.value for r in allowed_roles]}, user has role '{role.value}'"
            )
        return role

    return role_checker


def get_current_authenticated_patient(
    authorization: Optional[str] = Header(default=None),
) -> str:
    """
    Extracts and verifies the Bearer access token for an authenticated patient.
    Returns the canonical patient_id from verified token claims (`sub`).
    Ignores client-supplied `x-user-id` or `x-user-role` headers.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: missing or invalid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: empty Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        claims = verify_access_token(token)
    except SignatureExpired:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except BadSignature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or tampered authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    role = str(claims.get("role") or "").strip().lower()
    sub = str(claims.get("sub") or "").strip()
    if role != "patient" or not sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: valid patient role token required.",
        )
    return sub
