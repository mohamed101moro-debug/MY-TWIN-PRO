"""No cloud speech provider or shared cache is used without exact owner consent."""
import asyncio
import os
import sys
import types
import importlib
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "local-test-only-key")
sys.path.insert(0, "backend")


def test_voice_gateway_falls_back_without_network_when_no_provider_is_authorized(monkeypatch):
    from app.infrastructure.voice import voice_gateway
    from app.privacy import cloud_ai_consent

    calls = []
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: set())
    async def forbidden(*args, **kwargs): calls.append((args, kwargs)); raise AssertionError("cloud TTS must not run")
    monkeypatch.setattr(voice_gateway, "_elevenlabs", forbidden)
    monkeypatch.setattr(voice_gateway, "_edge", forbidden)
    result = asyncio.run(voice_gateway.synthesize("private words", tier="pro", user_id="user-A"))
    assert result["engine"] == "local_fallback"
    assert result["audio_base64"] is None
    assert calls == []


def test_voice_gateway_uses_only_the_provider_the_user_approved(monkeypatch):
    from app.infrastructure.voice import voice_gateway
    from app.privacy import cloud_ai_consent

    calls = []
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: {"edge_tts"})
    async def no_eleven(*args, **kwargs): raise AssertionError("ElevenLabs was not approved")
    async def edge(*args, **kwargs): calls.append("edge_tts"); return "base64-audio"
    monkeypatch.setattr(voice_gateway, "_elevenlabs", no_eleven)
    monkeypatch.setattr(voice_gateway, "_edge", edge)
    result = asyncio.run(voice_gateway.synthesize("private words", tier="pro", user_id="user-A"))
    assert result["engine"] == "edge"
    assert calls == ["edge_tts"]


def test_legacy_voice_service_denies_before_cache_or_provider_without_consent(monkeypatch):
    from app.infrastructure.voice import voice_service
    from app.privacy import cloud_ai_consent

    calls = []
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: set())
    async def forbidden(*args, **kwargs): calls.append((args, kwargs)); raise AssertionError("cloud TTS must not run")
    monkeypatch.setattr(voice_service, "_elevenlabs", forbidden)
    monkeypatch.setattr(voice_service, "_edge_tts", forbidden)
    assert asyncio.run(voice_service.speak("private words", user_id="user-A")) is None
    assert asyncio.run(voice_service.speak("private words", user_id=None)) is None
    assert calls == []


def test_legacy_voice_cache_key_includes_user_and_authorized_provider_scope(monkeypatch):
    from app.infrastructure.voice import voice_service
    from app.privacy import cloud_ai_consent

    keys = []
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: {"edge_tts"})
    cache = types.ModuleType("app.infrastructure.cache.cache_service")
    cache.get = lambda key: keys.append(key) or None
    cache.set = lambda *args, **kwargs: None
    monkeypatch.setitem(sys.modules, "app.infrastructure.cache.cache_service", cache)
    async def fake_edge(*args, **kwargs): return b"audio"
    monkeypatch.setattr(voice_service, "_edge_tts", fake_edge)
    result = asyncio.run(voice_service.speak("private words", user_id="user-A"))
    assert result == b"audio"
    assert keys and "user-A" in keys[0] and "edge_tts" in keys[0]


def test_tts_http_route_requires_auth_and_passes_verified_user_id(monkeypatch):
    auth = importlib.import_module("app.api.dependencies.auth")
    routes = importlib.import_module("app.api.routes.tts_routes")
    gateway = importlib.import_module("app.infrastructure.voice.voice_gateway")
    app = FastAPI()
    app.include_router(routes.router)
    client = TestClient(app)
    assert client.post("/api/tts", json={"text": "hello"}).status_code == 401

    app.dependency_overrides[auth.get_current_user_id] = lambda: "user-A"
    app.dependency_overrides[auth.get_user_tier] = lambda: "pro"
    received = {}
    async def fake_synthesize(text, language, gender, tier, user_id=None):
        received.update(text=text, tier=tier, user_id=user_id)
        return {"audio_base64": None, "engine": "local_fallback"}
    monkeypatch.setattr(gateway, "synthesize", fake_synthesize)
    response = client.post("/api/tts", json={"text": "private", "language": "en", "gender": "male"})
    assert response.status_code == 200
    assert received == {"text": "private", "tier": "pro", "user_id": "user-A"}
