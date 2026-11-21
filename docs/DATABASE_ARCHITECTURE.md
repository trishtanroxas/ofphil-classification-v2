# OFPHIL Classification V2: Database Architecture Specification

## 1. Executive Summary

This document specifies the primary database architecture for **OFPHIL Classification V2 (`ofphil-classification-v2`)**. 

The architecture transitions from the legacy SQLite storage used in the primary reference project to an enterprise, cloud-native **Supabase PostgreSQL** instance.

The database is structured around normalized clinical, socioeconomic, multimodal document, and machine learning audit entities with native PostgreSQL Row Level Security (RLS) enforcement.

---

## 2. Architectural Blueprint

```mermaid
erDiagram
    USER_PROFILES ||--o{ SOCIOECONOMIC_ASSESSMENTS : evaluates
    USER_PROFILES ||--o{ ELIGIBILITY_ASSESSMENTS : decides
    PATIENTS ||--o{ SOCIOECONOMIC_ASSESSMENTS : has
    PATIENTS ||--o{ CLINICAL_RECORDS : has
    PATIENTS ||--o{ DOCUMENTS : provides
    PATIENTS ||--o{ ELIGIBILITY_ASSESSMENTS : receives
    SOCIOECONOMIC_ASSESSMENTS ||--o{ ELIGIBILITY_ASSESSMENTS : feeds

    PATIENTS {
        UUID id PK
        VARCHAR patient_code UK
        VARCHAR first_name
        VARCHAR last_name
        INT age
        VARCHAR gender
        VARCHAR barangay
        VARCHAR city
        VARCHAR province
        BOOLEAN is_synthetic
        TIMESTAMP created_at
    }

    SOCIOECONOMIC_ASSESSMENTS {
        UUID id PK
        UUID patient_id FK
        UUID assessor_id FK
        NUMERIC monthly_household_income
        INT household_size
        INT number_of_dependents
        VARCHAR housing_type
        VARCHAR philhealth_category
        TEXT social_worker_narrative
        VARCHAR assessment_status
    }

    CLINICAL_RECORDS {
        UUID id PK
        UUID patient_id FK
        VARCHAR primary_ophthalmic_diagnosis
        VARCHAR eye_affected
        VARCHAR visual_acuity_od
        VARCHAR visual_acuity_os
        VARCHAR recommended_procedure
        NUMERIC clinical_urgency_score
        VARCHAR physician_name
    }

    DOCUMENTS {
        UUID id PK
        UUID patient_id FK
        VARCHAR document_type
        VARCHAR storage_path
        BIGINT file_size_bytes
        VARCHAR mime_type
        VARCHAR sha256_hash
        BOOLEAN ocr_processed
        TEXT extracted_text
        NUMERIC ocr_confidence
        INT stamps_detected_count
        INT signatures_detected_count
        VARCHAR tamper_risk_level
    }

    ELIGIBILITY_ASSESSMENTS {
        UUID id PK
        UUID patient_id FK
        UUID assessment_id FK
        VARCHAR model_version
        VARCHAR predicted_eligibility
        NUMERIC model_confidence
        JSONB shap_summary
        VARCHAR final_institutional_decision
        NUMERIC approved_subsidy_percentage
        UUID approved_by_user_id FK
        TIMESTAMP decision_timestamp
        TEXT decision_notes
    }

    SECURITY_AUDIT_LOGS {
        UUID id PK
        VARCHAR actor_id
        VARCHAR role
        VARCHAR action
        VARCHAR resource
        VARCHAR status
        JSONB details
        TIMESTAMP created_at
    }
```

---

## 3. Directory Layout

The database code is localized inside the backend module:

```text
backend/app/database/
├── __init__.py
├── connection.py          # Centralized Supabase HTTP client & health monitoring
├── models/
│   ├── __init__.py
│   └── entities.py        # Declarative SQLAlchemy ORM entities
├── migrations/
│   ├── __init__.py
│   └── 001_initial_v2_schema.sql # Canonical SQL migration script
└── repositories/
    ├── __init__.py
    └── repositories.py    # Type-safe data access layer for patients & documents
```

---

## 4. Security & Row Level Security (RLS)

1. **Service Role Isolation**: Backend API calls utilize the `SUPABASE_SERVICE_ROLE_KEY` exclusively on the server side to bypass RLS for authorized compute routines.
2. **Anonymous / Client Protection**: Public anon keys cannot read sensitive clinical records unless authenticated with appropriate roles.
3. **Synthetic Data Partitioning**: Policies explicitly segregate synthetic test cohorts from future institutional patient records.
