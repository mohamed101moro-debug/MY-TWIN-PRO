-- MyTwin S5.5 — Digital Being Core Hardening.
-- Canonical continuity contract version is s5.5. No second state store is introduced.
ALTER TABLE public.twin_internal_states
  ADD COLUMN IF NOT EXISTS continuity_schema_version TEXT NOT NULL DEFAULT 's5.5';

UPDATE public.twin_internal_states
SET continuity_schema_version = 's5.5'
WHERE continuity_schema_version IS NULL OR continuity_schema_version = 's4.0';

COMMENT ON COLUMN public.twin_internal_states.continuity_schema_version IS
  'Canonical continuity contract version. S5.5 unifies the S4 continuity contract while preserving backward-compatible state shape.';
