-- S6A.2 — Canonical User ID Contract
--
-- Canonical identity/lifecycle tables use the Supabase Auth UUID. This migration
-- removes the last TEXT user-id boundary from the atomic lifecycle receipt
-- ledger. It deliberately fails before changing data if legacy values are not
-- UUID-compatible; silent coercion would be unsafe for a persistent entity.

DO $$
DECLARE
  v_bad BIGINT;
  v_type TEXT;
BEGIN
  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'twin_internal_states'
    AND column_name = 'user_id';

  IF v_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'canonical_user_id_contract_failed: twin_internal_states.user_id must be uuid, got %', v_type;
  END IF;

  SELECT COUNT(*) INTO v_bad
  FROM public.lifecycle_intention_receipts
  WHERE user_id IS NULL
     OR user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  IF v_bad > 0 THEN
    RAISE EXCEPTION 'canonical_user_id_contract_failed: % lifecycle receipt rows are not UUID-compatible', v_bad;
  END IF;
END $$;

ALTER TABLE public.lifecycle_intention_receipts
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

DROP INDEX IF EXISTS public.idx_lifecycle_receipts_user_fingerprint_time;
CREATE INDEX IF NOT EXISTS idx_lifecycle_receipts_user_fingerprint_time
  ON public.lifecycle_intention_receipts (user_id, evidence_fingerprint, accepted_at DESC);

DROP FUNCTION IF EXISTS public.commit_twin_life_intention(TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ, INTEGER);

CREATE OR REPLACE FUNCTION public.commit_twin_life_intention(
  p_user_id UUID,
  p_canonical JSONB,
  p_fingerprint TEXT,
  p_intention_id TEXT DEFAULT NULL,
  p_observed_at TIMESTAMPTZ DEFAULT NULL,
  p_dedupe_window_seconds INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
  v_existing JSONB;
  v_revision BIGINT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;
  IF p_canonical IS NULL OR p_fingerprint IS NULL OR trim(p_fingerprint) = '' THEN
    RAISE EXCEPTION 'canonical_lifecycle_payload_required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT, 0));

  IF NULLIF(trim(p_intention_id), '') IS NOT NULL THEN
    v_key := 'id:' || trim(p_intention_id);
  ELSIF p_observed_at IS NOT NULL THEN
    v_key := 'obs:' || p_observed_at::TEXT || ':' || p_fingerprint;
  ELSE
    SELECT to_jsonb(r) - 'canonical' || jsonb_build_object('canonical', r.canonical)
      INTO v_existing
      FROM public.lifecycle_intention_receipts r
     WHERE r.user_id = p_user_id
       AND r.evidence_fingerprint = p_fingerprint
       AND r.accepted_at >= v_now - make_interval(secs => GREATEST(1, p_dedupe_window_seconds))
     ORDER BY r.accepted_at DESC
     LIMIT 1;

    IF v_existing IS NOT NULL THEN
      RETURN jsonb_build_object(
        'canonical', v_existing->'canonical',
        'continuity_revision', (v_existing->>'continuity_revision')::BIGINT,
        'deduplicated', TRUE,
        'committed_at', v_existing->>'accepted_at'
      );
    END IF;

    v_key := 'fp:' || p_fingerprint || ':' || floor(extract(epoch FROM v_now) / GREATEST(1, p_dedupe_window_seconds))::BIGINT;
  END IF;

  SELECT r.canonical, r.continuity_revision, r.accepted_at
    INTO v_existing, v_revision, v_now
    FROM public.lifecycle_intention_receipts r
   WHERE r.user_id = p_user_id AND r.dedupe_key = v_key
   LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'canonical', v_existing,
      'continuity_revision', v_revision,
      'deduplicated', TRUE,
      'committed_at', v_now
    );
  END IF;

  SELECT COALESCE(MAX(continuity_revision), 0) + 1
    INTO v_revision
    FROM public.twin_internal_states
   WHERE user_id = p_user_id;

  INSERT INTO public.twin_internal_states (
    user_id, mood, energy_level, curiosity, bond_depth, last_thought,
    last_thought_at, last_experience_at, pending_questions, cognitive_load,
    continuity_revision, continuity_schema_version, last_life_intention, updated_at
  ) VALUES (
    p_user_id, 'unknown', 0.5, 0.5, 0.0, '', NULL,
    COALESCE(p_observed_at, v_now), '[]'::jsonb, 0.0, v_revision,
    's5.5', p_canonical, v_now
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_life_intention = EXCLUDED.last_life_intention,
    last_experience_at = EXCLUDED.last_experience_at,
    continuity_revision = EXCLUDED.continuity_revision,
    continuity_schema_version = 's5.5',
    updated_at = v_now;

  INSERT INTO public.lifecycle_intention_receipts (
    user_id, dedupe_key, intention_id, evidence_fingerprint, observed_at,
    accepted_at, continuity_revision, canonical
  ) VALUES (
    p_user_id, v_key, NULLIF(trim(p_intention_id), ''), p_fingerprint,
    p_observed_at, v_now, v_revision, p_canonical
  );

  RETURN jsonb_build_object(
    'canonical', p_canonical,
    'continuity_revision', v_revision,
    'deduplicated', FALSE,
    'committed_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.commit_twin_life_intention(UUID, JSONB, TEXT, TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_twin_life_intention(UUID, JSONB, TEXT, TEXT, TIMESTAMPTZ, INTEGER) TO service_role;

COMMENT ON COLUMN public.lifecycle_intention_receipts.user_id IS
  'Canonical Supabase Auth UUID. Same identity contract as twin_internal_states and twin_entity_identity.';
