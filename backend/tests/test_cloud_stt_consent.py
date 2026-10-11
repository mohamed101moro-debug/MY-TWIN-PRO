"""Cloud STT requires owner identity and a grant for each actual provider."""
import asyncio
import os
import sys

os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "local-test-only-key")
sys.path.insert(0, "backend")


def test_stt_returns_without_provider_call_when_no_consent_or_identity(monkeypatch):
    from app.infrastructure.ai import cloud_stt
    from app.privacy import cloud_ai_consent

    calls = []
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: set())
    async def forbidden(*args, **kwargs): calls.append(args); raise AssertionError("STT egress must not run")
    monkeypatch.setattr(cloud_stt, "_groq_transcribe", forbidden)
    monkeypatch.setattr(cloud_stt, "_gemini_transcribe", forbidden)
    assert asyncio.run(cloud_stt.transcribe("YXVkaW8=", user_id="user-A")) is None
    assert asyncio.run(cloud_stt.transcribe("YXVkaW8=", user_id=None)) is None
    assert calls == []


def test_stt_does_not_fallback_to_unapproved_gemini(monkeypatch):
    from app.infrastructure.ai import cloud_stt
    from app.privacy import cloud_ai_consent

    calls = []
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: {"groq"})
    async def groq(*args, **kwargs): calls.append("groq"); return None
    async def gemini(*args, **kwargs): calls.append("gemini"); return "not allowed"
    monkeypatch.setattr(cloud_stt, "_groq_transcribe", groq)
    monkeypatch.setattr(cloud_stt, "_gemini_transcribe", gemini)
    assert asyncio.run(cloud_stt.transcribe("YXVkaW8=", user_id="user-A")) is None
    assert calls == ["groq"]


def test_stt_fallback_uses_gemini_only_when_both_providers_were_approved(monkeypatch):
    from app.infrastructure.ai import cloud_stt
    from app.privacy import cloud_ai_consent

    calls = []
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: {"groq", "gemini"})
    async def groq(*args, **kwargs): calls.append("groq"); return None
    async def gemini(*args, **kwargs): calls.append("gemini"); return "transcript"
    monkeypatch.setattr(cloud_stt, "_groq_transcribe", groq)
    monkeypatch.setattr(cloud_stt, "_gemini_transcribe", gemini)
    result = asyncio.run(cloud_stt.transcribe("YXVkaW8=", user_id="user-A"))
    assert result == "transcript"
    assert calls == ["groq", "gemini"]


def test_stt_rejects_invalid_or_oversized_audio_before_provider_calls(monkeypatch):
    from app.infrastructure.ai import cloud_stt
    from app.privacy import cloud_ai_consent

    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: {"groq", "gemini"})
    async def forbidden(*args, **kwargs): raise AssertionError("invalid audio reached provider")
    monkeypatch.setattr(cloud_stt, "_groq_transcribe", forbidden)
    monkeypatch.setattr(cloud_stt, "_gemini_transcribe", forbidden)
    assert asyncio.run(cloud_stt.transcribe("not-base64", user_id="user-A")) is None
    assert asyncio.run(cloud_stt.transcribe("YQ==" * 3_000_000, user_id="user-A")) is None
