"""
Role-Based Access Control (RBAC) definitions and dependencies for FastAPI.
Roles:
  - Admin: System configuration, role management, audit inspections.
  - MSW (Medical Social Worker): Patient intake, evaluation, OCR inspection, eligibility classification.
  - Researcher: Synthetic data inspection, model benchmarking, ablation experiments (no direct PHI modification).
"""
from enum import Enum
from typing import List
from fastapi import Header, HTTPException, status


class UserRole(str, Enum):
    ADMIN = "admin"
    MSW = "msw"
    RESEARCHER = "researcher"


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
