-- ==============================================================================
-- OFPHIL CLASSIFICATION V2: INITIAL SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Migration Version: 001_initial_v2_schema.sql
-- Database: Supabase PostgreSQL
-- Design: Normalized, RLS-Enforced Clinical & Multimodal Research Schema
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Domain A: User & Role Profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'msw', 'researcher')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- Domain B: Patient Profiles (PII minimized)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_code VARCHAR(64) UNIQUE NOT NULL, -- Anonymized clinical identifier
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    age INTEGER CHECK (age >= 0 AND age <= 130),
    gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other', 'Undisclosed')),
    barangay VARCHAR(150),
    city VARCHAR(150),
    province VARCHAR(150),
    is_synthetic BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- Domain C: Socioeconomic Assessments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.socioeconomic_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    assessor_id UUID REFERENCES public.user_profiles(id),
    monthly_household_income NUMERIC(12, 2) NOT NULL,
    household_size INTEGER NOT NULL CHECK (household_size >= 1),
    number_of_dependents INTEGER NOT NULL DEFAULT 0,
    housing_type VARCHAR(100), -- 'Owned', 'Rented', 'Informal Settlement', etc.
    philhealth_category VARCHAR(100), -- 'Indigent', 'Direct Contributor', etc.
    social_worker_narrative TEXT,
    assessment_status VARCHAR(50) DEFAULT 'draft' CHECK (assessment_status IN ('draft', 'submitted', 'verified', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- Domain D: Clinical Records
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    primary_ophthalmic_diagnosis VARCHAR(255) NOT NULL,
    eye_affected VARCHAR(20) CHECK (eye_affected IN ('OD (Right)', 'OS (Left)', 'OU (Both)')),
    visual_acuity_od VARCHAR(50),
    visual_acuity_os VARCHAR(50),
    recommended_procedure VARCHAR(255),
    clinical_urgency_score NUMERIC(3, 2), -- 0.00 to 1.00
    physician_name VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- Domain E: Supporting Documents & OCR Extractions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- 'Barangay Indigency', 'Clinical Abstract', 'Income Declaration'
    storage_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    sha256_hash VARCHAR(64),
    ocr_processed BOOLEAN DEFAULT FALSE,
    extracted_text TEXT,
    ocr_confidence NUMERIC(5, 4),
    stamps_detected_count INTEGER DEFAULT 0,
    signatures_detected_count INTEGER DEFAULT 0,
    tamper_risk_level VARCHAR(50) DEFAULT 'clean',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- Domain F: Eligibility Decisions & Machine Learning Predictions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eligibility_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES public.socioeconomic_assessments(id),
    
    -- Machine Learning (CatBoost) Output
    model_version VARCHAR(100) NOT NULL DEFAULT 'CatBoost-v2.1',
    predicted_eligibility VARCHAR(100) NOT NULL, -- 'Class A (Full Subsidy)', 'Class B', 'Class C', 'Self-Pay'
    model_confidence NUMERIC(5, 4) NOT NULL,
    shap_summary JSONB,
    
    -- Institutional Social Worker Decision (Human-in-the-Loop)
    final_institutional_decision VARCHAR(100), -- 'Approved', 'Rejected', 'Pending Review'
    approved_subsidy_percentage NUMERIC(5, 2),
    approved_by_user_id UUID REFERENCES public.user_profiles(id),
    decision_timestamp TIMESTAMP WITH TIME ZONE,
    decision_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- Domain G: Security & Operational Audit Log
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- Performance Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_patients_code ON public.patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_socio_patient ON public.socioeconomic_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_patient ON public.clinical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_patient ON public.documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_patient ON public.eligibility_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON public.security_audit_logs(created_at);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socioeconomic_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eligibility_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 1. Service Role full privileged access (Backend API internal operations)
CREATE POLICY "service_role_all_patients" ON public.patients FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_assessments" ON public.socioeconomic_assessments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_clinical" ON public.clinical_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_documents" ON public.documents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_eligibility" ON public.eligibility_assessments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_audit" ON public.security_audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_profiles" ON public.user_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Authenticated read access for researchers (Synthetic records only)
CREATE POLICY "researcher_view_synthetic_patients" ON public.patients
    FOR SELECT TO authenticated
    USING (is_synthetic = TRUE);

-- 3. Authenticated clinical access for medical social workers
CREATE POLICY "msw_clinical_access" ON public.patients
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('msw', 'admin'))
    WITH CHECK (auth.jwt() ->> 'role' IN ('msw', 'admin'));
