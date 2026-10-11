"""Legacy streaming provider calls are gated exactly like the primary AI Gateway."""
import asyncio
import os
import sys

os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "local-test-only-key")
sys.path.insert(0, "backend")


def test_streaming_returns_local_notice_without_provider_call_when_not_approved(monkeypatch):
    from app.infrastructure.ai import gemini_client
    from app.privacy import cloud_ai_consent

    calls = []
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: set())
    async def forbidden(*args, **kwargs): calls.append(args); yield "should not run"
    monkeypatch.setattr(gemini_client, "_gemini_stream", forbidden)
    result = asyncio.run(_collect(gemini_client.generate_stream("private", user_id="user-A", provider="gemini")))
    assert calls == []
    assert result and "لم تُمنح موافقة" in result[0]


def test_streaming_calls_only_selected_provider_after_matching_grant(monkeypatch):
    from app.infrastructure.ai import gemini_client
    from app.privacy import cloud_ai_consent

    calls = []
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda user, purpose: {"groq"} if user == "user-A" and purpose == "text_generation" else set())
    async def groq(prompt, system, language, user_id=None):
        calls.append((prompt, user_id))
        yield "chunk"
    async def forbidden(*args, **kwargs): raise AssertionError("wrong streaming provider")
    monkeypatch.setattr(gemini_client, "_groq_stream", groq)
    monkeypatch.setattr(gemini_client, "_gemini_stream", forbidden)
    result = asyncio.run(_collect(gemini_client.generate_stream("private", user_id="user-A", provider="groq")))
    assert result == ["chunk"]
    assert calls == [("private", "user-A")]


async def _collect(generator):
    return [item async for item in generator]
