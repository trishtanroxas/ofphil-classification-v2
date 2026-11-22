-- ==============================================================================
-- OFPHIL CLASSIFICATION V2: MSW ASSESSMENT WORKFLOW EXTENSIONS
-- Migration Version: 002_msw_assessment_workflow_extensions.sql
-- Additive, non-destructive extensions to existing V2 tables.
-- ==============================================================================

ALTER TABLE IF EXISTS public.socioeconomic_assessments
    ADD COLUMN IF NOT EXISTS encounter_no VARCHAR(100),
    ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS informant_data JSONB,
    ADD COLUMN IF NOT EXISTS household_members JSONB,
    ADD COLUMN IF NOT EXISTS sectoral_data JSONB,
    ADD COLUMN IF NOT EXISTS stage2_scores JSONB,
    ADD COLUMN IF NOT EXISTS clinical_referral_data JSONB,
    ADD COLUMN IF NOT EXISTS assessment_history JSONB DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS public.documents
    ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES public.socioeconomic_assessments(id),
    ADD COLUMN IF NOT EXISTS signature_status VARCHAR(50) DEFAULT 'NOT_CHECKED',
    ADD COLUMN IF NOT EXISTS authenticity_status VARCHAR(50) DEFAULT 'UNVERIFIABLE',
    ADD COLUMN IF NOT EXISTS forensic_indicators JSONB,
    ADD COLUMN IF NOT EXISTS manual_review_decision VARCHAR(50),
    ADD COLUMN IF NOT EXISTS manual_review_notes TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(150),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS public.eligibility_assessments
    ADD COLUMN IF NOT EXISTS rubric_version VARCHAR(32) DEFAULT '1.0',
    ADD COLUMN IF NOT EXISTS financial_classification VARCHAR(100),
    ADD COLUMN IF NOT EXISTS msw_classification VARCHAR(100),
    ADD COLUMN IF NOT EXISTS monthly_per_capita_income NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS average_severity NUMERIC(4, 2),
    ADD COLUMN IF NOT EXISTS average_coping NUMERIC(4, 2),
    ADD COLUMN IF NOT EXISTS total_risk NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS triggered_conditions JSONB,
    ADD COLUMN IF NOT EXISTS discrepancy_detected BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS msw_recommendation JSONB;

CREATE INDEX IF NOT EXISTS idx_socio_encounter ON public.socioeconomic_assessments(encounter_no);
CREATE INDEX IF NOT EXISTS idx_documents_assessment ON public.documents(assessment_id);
