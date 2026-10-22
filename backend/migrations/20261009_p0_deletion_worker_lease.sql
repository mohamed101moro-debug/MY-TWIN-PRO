-- P0-03: durable lease timestamp for recoverable account-deletion work.
-- Separate migration so environments that already applied the 20261008 migration
-- still receive the required column through the normal migration runner.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_started_at timestamptz;
