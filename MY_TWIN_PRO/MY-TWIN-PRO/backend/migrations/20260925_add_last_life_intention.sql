-- MyTwin Life Loop Closure — canonical lifecycle evidence state.
-- Apply this migration to the production Supabase/Postgres database before
-- deploying the backend that writes last_life_intention.
ALTER TABLE twin_internal_states
  ADD COLUMN IF NOT EXISTS last_life_intention JSONB;

COMMENT ON COLUMN twin_internal_states.last_life_intention IS
  'Latest evidence-only lifecycle intention. Backend may interpret it into bounded internal state; it is never a direct command for speech, dreams, surprises, or user-visible actions.';
