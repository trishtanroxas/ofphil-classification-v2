-- Migration: 002_patient_id_sequence.sql
-- Adds concurrency-safe MYY-MM-XXXXXX Patient ID sequence generation for Supabase/PostgreSQL.

ALTER TABLE public.patients
    ADD COLUMN IF NOT EXISTS patient_code VARCHAR(20);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_patients_patient_code'
    ) THEN
        ALTER TABLE public.patients
            ADD CONSTRAINT uq_patients_patient_code UNIQUE (patient_code);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.patient_id_sequences (
    year_month VARCHAR(5) PRIMARY KEY,
    last_seq INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.preview_next_patient_id(p_tz TEXT DEFAULT 'Asia/Manila')
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW() AT TIME ZONE p_tz;
    v_ym TEXT := TO_CHAR(v_now, 'YY-MM');
    v_last_seq INTEGER := 0;
BEGIN
    SELECT COALESCE(last_seq, 0) INTO v_last_seq
    FROM public.patient_id_sequences
    WHERE year_month = v_ym;

    RETURN 'M' || v_ym || '-' || LPAD((COALESCE(v_last_seq, 0) + 1)::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_next_patient_id(p_tz TEXT DEFAULT 'Asia/Manila')
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW() AT TIME ZONE p_tz;
    v_ym TEXT := TO_CHAR(v_now, 'YY-MM');
    v_next_seq INTEGER;
BEGIN
    INSERT INTO public.patient_id_sequences (year_month, last_seq)
    VALUES (v_ym, 1)
    ON CONFLICT (year_month)
    DO UPDATE SET last_seq = public.patient_id_sequences.last_seq + 1
    RETURNING last_seq INTO v_next_seq;

    RETURN 'M' || v_ym || '-' || LPAD(v_next_seq::TEXT, 6, '0');
END;
$$;
