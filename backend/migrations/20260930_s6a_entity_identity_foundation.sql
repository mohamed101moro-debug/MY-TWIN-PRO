-- Soul Sync S6A Entity Identity Foundation.
-- Identity metadata is NOT a second mutable Twin State store. It is the durable
-- entity passport root that survives model/runtime/platform replacement.

CREATE TABLE IF NOT EXISTS public.twin_entity_identity (
  entity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  birth_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  identity_version BIGINT NOT NULL DEFAULT 1,
  passport_version TEXT NOT NULL DEFAULT '2.0.0',
  constitution_version TEXT NOT NULL DEFAULT '1.0.0',
  origin JSONB NOT NULL DEFAULT '{"organization":"Soul Sync","implementation":"My Twin"}'::jsonb,
  capability_manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_twin_entity_identity_user
  ON public.twin_entity_identity(user_id);

COMMENT ON TABLE public.twin_entity_identity IS
  'Canonical durable identity root for one persistent digital entity per user. Not mutable cognitive state.';
COMMENT ON COLUMN public.twin_entity_identity.entity_id IS
  'Stable Soul Sync entity identifier. Must remain unchanged across model, device and platform replacement.';
COMMENT ON COLUMN public.twin_entity_identity.identity_version IS
  'Monotonic identity artifact version; it changes only through governed evolution.';

CREATE OR REPLACE FUNCTION public.ensure_twin_entity_identity(p_user_id UUID)
RETURNS public.twin_entity_identity
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.twin_entity_identity;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;

  INSERT INTO public.twin_entity_identity(user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.twin_entity_identity
  WHERE user_id = p_user_id;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_twin_entity_identity(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_twin_entity_identity(UUID) TO service_role;
