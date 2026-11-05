-- Path 1.3 — Account lifecycle status contract
-- Apply to STAGING first, take a backup, and verify A/B isolation before production.
-- This migration is intentionally idempotent and does not delete user data.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.profiles
   SET status = 'active'
 WHERE status IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE public.profiles
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('active', 'pending_deletion', 'banned', 'suspended'));

CREATE INDEX IF NOT EXISTS idx_profiles_status_deleted_at
  ON public.profiles (status, deleted_at)
  WHERE status <> 'active' OR deleted_at IS NOT NULL;

COMMENT ON COLUMN public.profiles.status IS
  'Account access state. API access requires active.';
COMMENT ON COLUMN public.profiles.deleted_at IS
  'Scheduled deletion timestamp. Non-null accounts are denied normal API access.';
