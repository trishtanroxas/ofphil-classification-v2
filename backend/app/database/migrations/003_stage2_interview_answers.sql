-- ==============================================================================
-- OFPHIL CLASSIFICATION V2: STAGE 2 QUALITATIVE INTERVIEW & MANUAL MSW DECISION
-- Migration Version: 003_stage2_interview_answers.sql
-- Additive, non-destructive migration. Preserves legacy stage2_scores,
-- average_severity, and average_coping columns untouched for historical records.
-- ==============================================================================

ALTER TABLE IF EXISTS public.socioeconomic_assessments
    ADD COLUMN IF NOT EXISTS interview_answers JSONB DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS public.eligibility_assessments
    ADD COLUMN IF NOT EXISTS manual_msw_decision VARCHAR(50),
    ADD COLUMN IF NOT EXISTS manual_msw_remarks TEXT;

