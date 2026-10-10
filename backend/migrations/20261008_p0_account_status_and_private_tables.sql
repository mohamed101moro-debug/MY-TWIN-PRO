-- P0: make account lifecycle state explicit and keep server-owned lifecycle tables private.
-- Apply in staging first; this migration does not expose these tables to direct client access.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

UPDATE public.profiles
SET status = 'active'
WHERE status IS NULL OR btrim(status) = '';

ALTER TABLE public.profiles
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.lifecycle_intention_receipts') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.lifecycle_intention_receipts ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public.lifecycle_intention_receipts FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT ALL ON TABLE public.lifecycle_intention_receipts TO service_role';
  END IF;
  IF to_regclass('public.twin_entity_identity') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.twin_entity_identity ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public.twin_entity_identity FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT ALL ON TABLE public.twin_entity_identity TO service_role';
  END IF;
END $$;
