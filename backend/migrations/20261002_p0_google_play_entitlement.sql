-- P0 billing hardening: persisted, server-verified Google Play entitlements.
-- Apply only after reviewing the current Supabase schema and backing up production.
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.profiles') IS NULL THEN
        RAISE EXCEPTION 'Required table public.profiles is missing';
    END IF;
END;
$$;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS tier_expires_at timestamptz;

CREATE TABLE IF NOT EXISTS public.verified_store_purchases (
    purchase_token_hash text PRIMARY KEY CHECK (purchase_token_hash ~ '^[0-9a-f]{64}$'),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store text NOT NULL DEFAULT 'google_play' CHECK (store = 'google_play'),
    product_id text NOT NULL,
    tier text NOT NULL CHECK (tier IN ('plus', 'premium', 'pro', 'yearly')),
    subscription_state text NOT NULL CHECK (
        subscription_state IN (
            'SUBSCRIPTION_STATE_ACTIVE',
            'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
            'SUBSCRIPTION_STATE_CANCELED'
        )
    ),
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT verified_store_purchases_product_tier_check CHECK (
        (product_id = 'mytwin_plus_monthly' AND tier = 'plus') OR
        (product_id = 'mytwin_premium_monthly' AND tier = 'premium') OR
        (product_id = 'mytwin_pro_semiannual' AND tier = 'pro') OR
        (product_id = 'mytwin_yearly_annual' AND tier = 'yearly')
    )
);

CREATE INDEX IF NOT EXISTS verified_store_purchases_user_expiry_idx
    ON public.verified_store_purchases (user_id, expires_at DESC);

ALTER TABLE public.verified_store_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.verified_store_purchases FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.verified_store_purchases TO service_role;

CREATE OR REPLACE FUNCTION public.commit_google_subscription(
    p_user_id uuid,
    p_product_id text,
    p_tier text,
    p_purchase_token_hash text,
    p_expires_at timestamptz,
    p_subscription_state text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    affected_rows integer;
    effective_tier text;
    effective_expiry timestamptz;
BEGIN
    IF p_user_id IS NULL
       OR p_purchase_token_hash !~ '^[0-9a-f]{64}$'
       OR p_expires_at IS NULL
       OR p_expires_at <= now()
       OR p_subscription_state NOT IN (
           'SUBSCRIPTION_STATE_ACTIVE',
           'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
           'SUBSCRIPTION_STATE_CANCELED'
       ) THEN
        RAISE EXCEPTION 'invalid_verified_entitlement' USING ERRCODE = '22023';
    END IF;

    IF NOT (
        (p_product_id = 'mytwin_plus_monthly' AND p_tier = 'plus') OR
        (p_product_id = 'mytwin_premium_monthly' AND p_tier = 'premium') OR
        (p_product_id = 'mytwin_pro_semiannual' AND p_tier = 'pro') OR
        (p_product_id = 'mytwin_yearly_annual' AND p_tier = 'yearly')
    ) THEN
        RAISE EXCEPTION 'product_tier_mismatch' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.verified_store_purchases (
        purchase_token_hash, user_id, store, product_id, tier, subscription_state, expires_at, updated_at
    ) VALUES (
        p_purchase_token_hash, p_user_id, 'google_play', p_product_id, p_tier,
        p_subscription_state, p_expires_at, now()
    )
    ON CONFLICT (purchase_token_hash) DO UPDATE SET
        product_id = EXCLUDED.product_id,
        tier = EXCLUDED.tier,
        subscription_state = EXCLUDED.subscription_state,
        expires_at = EXCLUDED.expires_at,
        updated_at = now()
    WHERE public.verified_store_purchases.user_id = EXCLUDED.user_id;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows = 0 THEN
        RAISE EXCEPTION 'purchase_token_already_claimed' USING ERRCODE = '23505';
    END IF;

    SELECT purchase.tier, purchase.expires_at
      INTO effective_tier, effective_expiry
      FROM public.verified_store_purchases AS purchase
     WHERE purchase.user_id = p_user_id
       AND purchase.expires_at > now()
       AND purchase.subscription_state IN (
           'SUBSCRIPTION_STATE_ACTIVE',
           'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
           'SUBSCRIPTION_STATE_CANCELED'
       )
     ORDER BY CASE purchase.tier
           WHEN 'pro' THEN 5
           WHEN 'yearly' THEN 4
           WHEN 'premium' THEN 3
           WHEN 'plus' THEN 2
           ELSE 1
       END DESC,
       purchase.expires_at DESC
     LIMIT 1;

    UPDATE public.profiles
       SET tier = COALESCE(effective_tier, 'free'),
           tier_expires_at = effective_expiry
     WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'tier', COALESCE(effective_tier, 'free'),
        'expires_at', effective_expiry
    );
END;
$$;

REVOKE ALL ON FUNCTION public.commit_google_subscription(uuid, text, text, text, timestamptz, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_google_subscription(uuid, text, text, text, timestamptz, text)
    TO service_role;

COMMIT;
