"""The shared AI gateway must never fall through to an unconsented provider."""
import asyncio
import os
import sys
import types

os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "local-test-only-key")
sys.path.insert(0, "backend")


def test_gateway_calls_only_the_approved_provider(monkeypatch):
    from app.infrastructure.ai.ai_gateway import AIGateway
    from app.privacy import cloud_ai_consent

    calls = []
    gateway = AIGateway()
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda user, purpose: {"groq"})
    monkeypatch.setattr(gateway.key_manager, "get_key", lambda provider: "test-key" if provider == "groq" else None)
    async def fake_oai(provider, model, prompt, key):
        calls.append(provider)
        return "a sufficiently long test response"
    monkeypatch.setattr(gateway, "_oai", fake_oai)
    monkeypatch.setattr(gateway, "_hf", lambda *args: (_ for _ in ()).throw(AssertionError("HF must not be called")))
    monkeypatch.setattr(gateway, "_gemini", lambda *args: (_ for _ in ()).throw(AssertionError("Gemini must not be called")))
    result = asyncio.run(gateway.route("hello", user_id="user-A"))
    assert result == ("a sufficiently long test response", "groq")
    assert calls == ["groq"]


def test_gateway_with_no_user_id_never_attempts_cloud(monkeypatch):
    from app.infrastructure.ai.ai_gateway import AIGateway
    from app.privacy import cloud_ai_consent

    gateway = AIGateway()
    calls = []
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda user, purpose: set())
    monkeypatch.setattr(gateway.key_manager, "get_key", lambda provider: calls.append(provider) or "test-key")
    monkeypatch.setattr("app.infrastructure.ai.local_fallback.local_respond", lambda task: "local-only response")
    result = asyncio.run(gateway.route("private text", user_id=None))
    assert result == ("local-only response", "local")
    assert calls == []


def test_gateway_scope_changes_with_current_provider_consent(monkeypatch):
    from app.infrastructure.ai.ai_gateway import AIGateway
    from app.privacy import cloud_ai_consent

    gateway = AIGateway()
    scopes = []
    cache = types.ModuleType("app.infrastructure.cache.cache_service")
    cache.get_ai_response = lambda prompt, scope=None: scopes.append(scope) or None
    cache.cache_ai_response = lambda *args, **kwargs: None
    monkeypatch.setitem(sys.modules, "app.infrastructure.cache.cache_service", cache)
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda user, purpose: {"groq"})
    monkeypatch.setattr(gateway.key_manager, "get_key", lambda provider: "key" if provider == "groq" else None)
    async def fake_oai(provider, model, prompt, key): return "long enough response"
    monkeypatch.setattr(gateway, "_oai", fake_oai)
    asyncio.run(gateway.route("text", user_id="A", task="general"))
    assert scopes and "groq" in scopes[0]
