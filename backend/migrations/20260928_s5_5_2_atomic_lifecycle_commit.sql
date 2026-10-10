-- MyTwin S5.5.2 — Atomic lifecycle commit / production validation gate.
--
-- Purpose:
--   Make lifecycle evidence idempotency atomic at the database boundary.
--   Python remains responsible for evidence normalization/meaning derivation;
--   PostgreSQL becomes the final commit authority for receipt + continuity.
--
-- This migration is intentionally additive and does not introduce a second
-- Twin State store. lifecycle_intention_receipts is an append/receipt ledger
-- whose only purpose is atomic delivery/idempotency traceability.

CREATE TABLE IF NOT EXISTS public.lifecycle_intention_receipts (
  user_id TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  intention_id TEXT,
  evidence_fingerprint TEXT NOT NULL,
  observed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  continuity_revision BIGINT NOT NULL,
  canonical JSONB NOT NULL,
  PRIMARY KEY (user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_receipts_user_fingerprint_time
  ON public.lifecycle_intention_receipts (user_id, evidence_fingerprint, accepted_at DESC);

COMMENT ON TABLE public.lifecycle_intention_receipts IS
  'Atomic idempotency receipt ledger for lifecycle evidence. Not a second Twin State store.';

CREATE OR REPLACE FUNCTION public.commit_twin_life_intention(
  p_user_id TEXT,
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
  IF COALESCE(trim(p_user_id), '') = '' THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;
  IF p_canonical IS NULL OR p_fingerprint IS NULL OR trim(p_fingerprint) = '' THEN
    RAISE EXCEPTION 'canonical_lifecycle_payload_required';
  END IF;

  -- Serialize all lifecycle commits for the same Twin. This closes both the
  -- semantic-dedup check/write race and the continuity_revision race between
  -- two different evidence events arriving concurrently.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id, 0));

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
   WHERE user_id::TEXT = p_user_id;

  -- One authoritative state write. If the row does not exist, create it with
  -- the same canonical defaults used by the application layer.
  INSERT INTO public.twin_internal_states (
    user_id,
    mood,
    energy_level,
    curiosity,
    bond_depth,
    last_thought,
    last_thought_at,
    last_experience_at,
    pending_questions,
    cognitive_load,
    continuity_revision,
    continuity_schema_version,
    last_life_intention,
    updated_at
  ) VALUES (
    p_user_id::uuid,
    'unknown',
    0.5,
    0.5,
    0.0,
    '',
    NULL,
    COALESCE(p_observed_at, v_now),
    '[]'::jsonb,
    0.0,
    v_revision,
    's5.5',
    p_canonical,
    v_now
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_life_intention = EXCLUDED.last_life_intention,
    last_experience_at = EXCLUDED.last_experience_at,
    continuity_revision = EXCLUDED.continuity_revision,
    continuity_schema_version = 's5.5',
    updated_at = v_now;

  INSERT INTO public.lifecycle_intention_receipts (
    user_id, dedupe_key, intention_id, evidence_fingerprint,
    observed_at, accepted_at, continuity_revision, canonical
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

REVOKE ALL ON FUNCTION public.commit_twin_life_intention(TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_twin_life_intention(TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ, INTEGER) TO service_role;
