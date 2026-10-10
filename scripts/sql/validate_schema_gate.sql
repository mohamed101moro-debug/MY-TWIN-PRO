-- Gate 0 — read-only Supabase schema proof.
-- Run after all migrations through 20261001_s6a2_canonical_user_id.sql.

DO $$
DECLARE
  v_type text;
  v_count bigint;
BEGIN
  SELECT data_type INTO v_type FROM information_schema.columns
   WHERE table_schema='public' AND table_name='twin_entity_identity' AND column_name='user_id';
  IF v_type IS DISTINCT FROM 'uuid' THEN RAISE EXCEPTION 'twin_entity_identity.user_id must be uuid, got %', v_type; END IF;

  SELECT data_type INTO v_type FROM information_schema.columns
   WHERE table_schema='public' AND table_name='twin_internal_states' AND column_name='user_id';
  IF v_type IS DISTINCT FROM 'uuid' THEN RAISE EXCEPTION 'twin_internal_states.user_id must be uuid, got %', v_type; END IF;

  SELECT data_type INTO v_type FROM information_schema.columns
   WHERE table_schema='public' AND table_name='lifecycle_intention_receipts' AND column_name='user_id';
  IF v_type IS DISTINCT FROM 'uuid' THEN RAISE EXCEPTION 'lifecycle_intention_receipts.user_id must be uuid, got %', v_type; END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.lifecycle_intention_receipts r
   WHERE r.user_id IS NULL;
  IF v_count > 0 THEN RAISE EXCEPTION 'receipt ledger contains % NULL user IDs', v_count; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='ensure_twin_entity_identity'
  ) THEN RAISE EXCEPTION 'ensure_twin_entity_identity RPC missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='commit_twin_life_intention'
      AND pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid, p_canonical jsonb, p_fingerprint text, p_intention_id text, p_observed_at timestamp with time zone, p_dedupe_window_seconds integer'
  ) THEN RAISE EXCEPTION 'UUID commit_twin_life_intention signature missing'; END IF;

  RAISE NOTICE 'GATE 0 PASS: canonical UUID schema and lifecycle RPC contracts are present';
END $$;
