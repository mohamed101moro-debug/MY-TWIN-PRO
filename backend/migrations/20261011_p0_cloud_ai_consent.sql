-- P0-03: server-owned, user-scoped consent state for explicitly disclosed cloud AI purposes.
-- Apply in staging only after provider/privacy notice review. Do not apply to production directly.
CREATE TABLE IF NOT EXISTS public.privacy_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('text_generation', 'image_generation', 'image_analysis', 'image_editing', 'voice_synthesis')),
  provider text NOT NULL CHECK (provider IN ('gemini', 'gemini_image', 'groq', 'openrouter', 'huggingface', 'pollinations', 'elevenlabs', 'edge_tts')),
  granted boolean NOT NULL,
  policy_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT privacy_consents_provider_purpose_check CHECK (
    (purpose = 'text_generation' AND provider IN ('gemini', 'groq', 'openrouter', 'huggingface')) OR
    (purpose = 'image_generation' AND provider IN ('gemini_image', 'pollinations')) OR
    (purpose = 'image_analysis' AND provider = 'gemini') OR
    (purpose = 'image_editing' AND provider IN ('huggingface', 'pollinations')) OR
    (purpose = 'voice_synthesis' AND provider IN ('elevenlabs', 'edge_tts'))
  ),
  CONSTRAINT privacy_consents_user_purpose_provider_key UNIQUE (user_id, purpose, provider)
);

CREATE INDEX IF NOT EXISTS privacy_consents_user_lookup_idx
  ON public.privacy_consents (user_id, purpose);

ALTER TABLE public.privacy_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_consents FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.privacy_consents FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.privacy_consents TO service_role;
