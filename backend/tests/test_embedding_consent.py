"""Cloud embeddings must not leak through provider calls or shared cache."""
import asyncio
import os
import sys

os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "local-test-only-key")
sys.path.insert(0, "backend")


def test_cloud_embedding_returns_empty_without_owner_consent(monkeypatch):
    from app.infrastructure.ai import embedding_client
    from app.privacy import cloud_ai_consent

    monkeypatch.setattr(embedding_client, "EMBEDDING_PROVIDER", "gemini")
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: set())
    async def forbidden(*args, **kwargs): raise AssertionError("embedding egress must not run")
    monkeypatch.setattr(embedding_client, "_gemini_embed", forbidden)
    assert asyncio.run(embedding_client.generate_embedding("private memory", user_id="user-A")) == []
    assert asyncio.run(embedding_client.generate_embedding("private memory", user_id=None)) == []


def test_embedding_cache_is_scoped_by_owner_and_provider(monkeypatch):
    from app.infrastructure.ai import embedding_client
    from app.privacy import cloud_ai_consent

    calls = []
    monkeypatch.setattr(embedding_client, "EMBEDDING_PROVIDER", "gemini")
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda user, purpose: {"gemini_embedding"} if user == "user-A" and purpose == "memory_embedding" else set())
    async def embed(text, user_id=None): calls.append((text, user_id)); return [1.0, 2.0]
    monkeypatch.setattr(embedding_client, "_gemini_embed", embed)
    first = asyncio.run(embedding_client.generate_embedding("private memory", user_id="user-A"))
    second = asyncio.run(embedding_client.generate_embedding("private memory", user_id="user-A"))
    denied = asyncio.run(embedding_client.generate_embedding("private memory", user_id="user-B"))
    assert first == second == [1.0, 2.0]
    assert denied == []
    assert calls == [("private memory", "user-A")]


def test_local_embedding_mode_does_not_need_cloud_consent(monkeypatch):
    from app.infrastructure.ai import embedding_client
    from app.privacy import cloud_ai_consent

    calls = []
    monkeypatch.setattr(embedding_client, "EMBEDDING_PROVIDER", "local")
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: set())
    async def local(text): calls.append(text); return [0.1]
    monkeypatch.setattr(embedding_client, "_local_embed", local)
    result = asyncio.run(embedding_client.generate_embedding("private memory"))
    assert result == [0.1]
    assert calls == ["private memory"]


def test_openai_embedding_has_its_own_provider_grant(monkeypatch):
    from app.infrastructure.ai import embedding_client
    from app.privacy import cloud_ai_consent

    calls = []
    monkeypatch.setattr(embedding_client, "EMBEDDING_PROVIDER", "openai")
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda user, purpose: {"openai_embedding"} if user == "user-A" and purpose == "memory_embedding" else set())
    async def embed(text, user_id=None): calls.append(user_id); return [3.0]
    monkeypatch.setattr(embedding_client, "_openai_embed", embed)
    assert asyncio.run(embedding_client.generate_embedding("memory", user_id="user-A")) == [3.0]
    assert calls == ["user-A"]
