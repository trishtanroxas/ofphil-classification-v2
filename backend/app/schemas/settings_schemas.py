"""
Pydantic V2 Schemas for Clinic Administration Settings.
Covers:
- Organization Profile
- Security Policies & Infrastructure Status
- Privacy & Data Access Governance
- Appointments & Queue Parameters
- Notification Settings & SMTP verification
- Audit Log Queries & Responses
- Personal Account & Display Preferences
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, EmailStr, Field


# ==============================================================================
# 1. Organization Profile
# ==============================================================================
class OrganizationProfile(BaseModel):
    legal_name: str = Field(..., min_length=2, max_length=255, description="Foundation / Clinic Legal Name")
    operating_desk: str = Field(..., min_length=2, max_length=255, description="Operating Clinic Desk")
    clinic_address: str = Field(..., min_length=5, max_length=500, description="Clinic Center Address")
    hotline_contact: str = Field(..., min_length=3, max_length=100, description="Official Hotline Contact")
    inquiries_email: EmailStr = Field(..., description="Official Inquiries Email")
    operating_hours: str = Field(..., min_length=3, max_length=255, description="Weekly Operating Hours")


# ==============================================================================
# 2. Security Policies
# ==============================================================================
class AuthenticationPolicies(BaseModel):
    min_password_length: int = Field(6, ge=6, le=64)
    require_uppercase: bool = False
    require_lowercase: bool = True
    require_numbers: bool = True
    require_special_chars: bool = True
    max_login_attempts: int = Field(5, ge=3, le=10)
    lockout_duration_minutes: int = Field(15, ge=5, le=120)
    enforce_2fa: bool = True
    reauth_for_sensitive_actions: bool = True


class SessionPolicies(BaseModel):
    session_timeout_minutes: int = Field(30, ge=5, le=480)
    max_session_lifetime_hours: int = Field(12, ge=1, le=72)
    concurrent_sessions_allowed: bool = False
    ip_whitelist: str = "192.168.1.0/24, 10.0.0.0/8"


class AccessControlPolicies(BaseModel):
    least_privilege_enforced: bool = True
    admin_access_level: str = "Full System Administration"
    msw_access_level: str = "Patient Intake, Evaluation, and Classification"
    researcher_access_level: str = "Synthetic De-identified Records Only"
    nurse_access_level: str = "Triage Desk and Queue Management"
    restricted_phi_roles: List[str] = ["researcher", "auditor"]


class SecuritySettings(BaseModel):
    auth_policies: AuthenticationPolicies = Field(default_factory=AuthenticationPolicies)
    session_policies: SessionPolicies = Field(default_factory=SessionPolicies)
    access_policies: AccessControlPolicies = Field(default_factory=AccessControlPolicies)


class InfrastructureStatusItem(BaseModel):
    name: str
    status: str
    details: str
    verified: bool


class InfrastructureStatusResponse(BaseModel):
    tls_status: InfrastructureStatusItem
    db_encryption_at_rest: InfrastructureStatusItem
    field_level_encryption: InfrastructureStatusItem
    password_hashing: InfrastructureStatusItem
    secret_management: InfrastructureStatusItem
    supabase_connection: InfrastructureStatusItem
    email_gateway: InfrastructureStatusItem


# ==============================================================================
# 3. Privacy & Data Access
# ==============================================================================
class RetentionPolicies(BaseModel):
    clinical_records_years: int = Field(7, ge=1, le=50)
    supporting_documents_years: int = Field(5, ge=1, le=50)
    audit_logs_years: int = Field(10, ge=1, le=50)
    research_datasets_years: int = Field(5, ge=1, le=50)
    archival_procedure_notes: str = "Encrypted cold storage with immutable retention locks."


class MaskingRules(BaseModel):
    mask_names_for_non_clinical: bool = True
    mask_contact_numbers: bool = True
    mask_addresses: bool = True
    require_justification_for_unmask: bool = True


class PrivacySettings(BaseModel):
    dpo_email: EmailStr = "dpo@ofphil.org.ph"
    data_retention_years: int = Field(7, ge=1, le=30)
    audit_logging_enabled: bool = True
    retention_policies: RetentionPolicies = Field(default_factory=RetentionPolicies)
    masking_rules: MaskingRules = Field(default_factory=MaskingRules)
    authorized_roles_phi: List[str] = ["admin", "msw", "nurse"]
    deidentify_research_exports: bool = True


# ==============================================================================
# 4. Appointments & Queue
# ==============================================================================
class QueueSettings(BaseModel):
    max_daily_intake: int = Field(60, ge=5, le=500)
    slot_duration_minutes: int = Field(20, ge=5, le=120)
    allow_walk_ins: bool = True
    operating_start_time: str = "08:00"
    operating_end_time: str = "16:00"
    cancellation_cutoff_hours: int = Field(24, ge=1, le=72)
    appointment_reminder_lead_hours: int = Field(24, ge=1, le=72)


# ==============================================================================
# 5. Notifications
# ==============================================================================
class NotificationSettings(BaseModel):
    email_alerts_active: bool = True
    sms_gateway_active: bool = False
    admin_daily_digest: bool = True
    notify_on_appointment_confirmed: bool = True
    notify_on_queue_update: bool = True
    notify_on_security_alert: bool = True
    notify_on_password_change: bool = True
    brevo_configured: bool = True
    sms_provider_status: str = "Not Configured (Requires Semaphore / Twilio API Key)"


class TestEmailRequest(BaseModel):
    recipient_email: EmailStr
    subject: Optional[str] = "OFPHIL Administration - Test Email Notification"


# ==============================================================================
# 6. Audit Logs
# ==============================================================================
class AuditLogItem(BaseModel):
    id: str
    timestamp_utc: str
    actor_id: str
    role: str
    action: str
    resource: str
    status: str
    ip_address: Optional[str] = "127.0.0.1"
    details: Optional[Dict[str, Any]] = None


class AuditLogsResponse(BaseModel):
    total_count: int
    page: int
    page_size: int
    items: List[AuditLogItem]


# ==============================================================================
# 7. Personal Account & Display
# ==============================================================================
class AccountProfile(BaseModel):
    username: str
    full_name: str
    email: EmailStr
    role: str
    department: str
    theme_preference: str = "light"
    notify_email: bool = True
    license_no: Optional[str] = None
    contact: Optional[str] = None
    birthdate: Optional[str] = None
    sex: Optional[str] = None
    civil_status: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    barangay: Optional[str] = None
    street: Optional[str] = None
    education: Optional[str] = None
    occupation: Optional[str] = None


class AccountProfileUpdate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    department: Optional[str] = None
    theme_preference: Optional[str] = "light"
    notify_email: Optional[bool] = True
    license_no: Optional[str] = None
    contact: Optional[str] = None
    birthdate: Optional[str] = None
    sex: Optional[str] = None
    civil_status: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    barangay: Optional[str] = None
    street: Optional[str] = None
    education: Optional[str] = None
    occupation: Optional[str] = None


class MSWPreferences(BaseModel):
    notifications: Optional[Dict[str, Any]] = None
    work_preferences: Optional[Dict[str, Any]] = None
    casework: Optional[Dict[str, Any]] = None
    accessibility: Optional[Dict[str, Any]] = None
    data_privacy: Optional[Dict[str, Any]] = None


class MSWSessionItem(BaseModel):
    id: str
    device: str
    browser: str
    ip_address: str
    location: str
    last_active: str
    is_current: bool = False


class MSWSecurityStatusResponse(BaseModel):
    mfa_enforced: bool
    mfa_method: str
    last_password_change: str
    active_sessions: List[MSWSessionItem]
    recent_security_events: List[Dict[str, Any]]
    login_rate_limit: Dict[str, Any]
    rbac_permissions: List[str]


class MSWPrivacySettings(BaseModel):
    mask_patient_identities: bool = True
    mask_contact_numbers: bool = True
    mask_government_ids: bool = True
    mask_financial_ledgers: bool = True
    consent_verification_required: bool = True
    data_retention_years: int = 7
    allow_patient_export: bool = False
    assigned_records_only: bool = True


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)


# Generic Action Result
class SettingsOperationResponse(BaseModel):
    success: bool
    message: str
    updated_at: str
    data: Optional[Dict[str, Any]] = None
