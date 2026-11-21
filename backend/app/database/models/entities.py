"""
SQLAlchemy ORM Entities for OFPHIL Classification V2.
Maps to the PostgreSQL schema hosted on Supabase.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Numeric, Boolean, Text,
    DateTime, ForeignKey, BigInteger, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_code = Column(String(64), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    barangay = Column(String(150), nullable=True)
    city = Column(String(150), nullable=True)
    province = Column(String(150), nullable=True)
    is_synthetic = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    assessments = relationship("SocioeconomicAssessment", back_populates="patient", cascade="all, delete-orphan")
    clinical_records = relationship("ClinicalRecord", back_populates="patient", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="patient", cascade="all, delete-orphan")
    eligibility_records = relationship("EligibilityAssessment", back_populates="patient", cascade="all, delete-orphan")


class SocioeconomicAssessment(Base):
    __tablename__ = "socioeconomic_assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    assessor_id = Column(UUID(as_uuid=True), ForeignKey("user_profiles.id"), nullable=True)
    monthly_household_income = Column(Numeric(12, 2), nullable=False)
    household_size = Column(Integer, nullable=False)
    number_of_dependents = Column(Integer, default=0, nullable=False)
    housing_type = Column(String(100), nullable=True)
    philhealth_category = Column(String(100), nullable=True)
    social_worker_narrative = Column(Text, nullable=True)
    assessment_status = Column(String(50), default="draft")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    patient = relationship("Patient", back_populates="assessments")


class ClinicalRecord(Base):
    __tablename__ = "clinical_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    primary_ophthalmic_diagnosis = Column(String(255), nullable=False)
    eye_affected = Column(String(20), nullable=True)
    visual_acuity_od = Column(String(50), nullable=True)
    visual_acuity_os = Column(String(50), nullable=True)
    recommended_procedure = Column(String(255), nullable=True)
    clinical_urgency_score = Column(Numeric(3, 2), nullable=True)
    physician_name = Column(String(150), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    patient = relationship("Patient", back_populates="clinical_records")


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type = Column(String(100), nullable=False)
    storage_path = Column(String(500), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=False)
    sha256_hash = Column(String(64), nullable=True)
    ocr_processed = Column(Boolean, default=False)
    extracted_text = Column(Text, nullable=True)
    ocr_confidence = Column(Numeric(5, 4), nullable=True)
    stamps_detected_count = Column(Integer, default=0)
    signatures_detected_count = Column(Integer, default=0)
    tamper_risk_level = Column(String(50), default="clean")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    patient = relationship("Patient", back_populates="documents")


class EligibilityAssessment(Base):
    __tablename__ = "eligibility_assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("socioeconomic_assessments.id"), nullable=True)
    model_version = Column(String(100), default="CatBoost-v2.1", nullable=False)
    predicted_eligibility = Column(String(100), nullable=False)
    model_confidence = Column(Numeric(5, 4), nullable=False)
    shap_summary = Column(JSONB, nullable=True)
    final_institutional_decision = Column(String(100), nullable=True)
    approved_subsidy_percentage = Column(Numeric(5, 2), nullable=True)
    approved_by_user_id = Column(UUID(as_uuid=True), ForeignKey("user_profiles.id"), nullable=True)
    decision_timestamp = Column(DateTime(timezone=True), nullable=True)
    decision_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    patient = relationship("Patient", back_populates="eligibility_records")


class SecurityAuditLog(Base):
    __tablename__ = "security_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    resource = Column(String(150), nullable=False)
    status = Column(String(50), nullable=False)
    details = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
