-- MyTwin S4 — Cognitive Continuity canonical persistence.
-- Safe for existing installations: every field is added only when absent.
-- Apply before deploying the S4 backend.

ALTER TABLE public.twin_internal_states
  ADD COLUMN IF NOT EXISTS last_thought TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_thought_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_experience_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cognitive_load DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS curiosity DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS continuity_revision BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS continuity_schema_version TEXT NOT NULL DEFAULT 's4.0';

COMMENT ON COLUMN public.twin_internal_states.last_thought IS
  'Latest bounded internal continuity marker grounded in persisted experience; not a consciousness claim.';
COMMENT ON COLUMN public.twin_internal_states.last_thought_at IS
  'Timestamp of the latest persisted continuity marker.';
COMMENT ON COLUMN public.twin_internal_states.last_experience_at IS
  'Timestamp of the latest interaction/experience committed to continuity state.';
COMMENT ON COLUMN public.twin_internal_states.pending_questions IS
  'Bounded unresolved continuity items; max 10 maintained by backend.';
COMMENT ON COLUMN public.twin_internal_states.cognitive_load IS
  'Persistent bounded cognitive-load state in [0,1].';
COMMENT ON COLUMN public.twin_internal_states.continuity_revision IS
  'Monotonic application-level continuity revision for traceability.';
COMMENT ON COLUMN public.twin_internal_states.continuity_schema_version IS
  'Canonical continuity contract version.';
