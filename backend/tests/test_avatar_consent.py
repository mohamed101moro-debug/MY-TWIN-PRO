"""Avatar generation must not export identity traits without image-generation consent."""
import asyncio
import importlib
import os
import sys
from fastapi import FastAPI
from fastapi.testclient import TestClient

if "supabase" not in sys.modules:
    import types
    supabase_stub = types.ModuleType("supabase")
    supabase_stub.create_client = lambda *args, **kwargs: None
    supabase_stub.Client = object
    sys.modules["supabase"] = supabase_stub
os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "local-test-only-key")
sys.path.insert(0, "backend")


def test_avatar_stops_before_accessing_identity_memory_without_consent(monkeypatch):
    from app.features.avatar_engine.avatar_engine import AvatarEngine
    from app.privacy import cloud_ai_consent

    calls = []
    class Memory:
        async def get_identity_traits(self, *_args): calls.append("traits"); return ["private"]
        async def get_emotional_state(self, *_args): calls.append("emotion"); return "neutral"
    engine = AvatarEngine()
    engine._memory_client = Memory()
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: set())
    result = asyncio.run(engine.generate_avatars("user-A", "A"))
    assert result == {"status": "consent_required", "purpose": "image_generation"}
    assert calls == []


def test_avatar_provider_call_never_uses_network_without_consent(monkeypatch):
    from app.features.avatar_engine.avatar_engine import AvatarEngine
    from app.privacy import cloud_ai_consent

    engine = AvatarEngine()
    monkeypatch.setattr(cloud_ai_consent, "get_granted_providers", lambda *_args: set())
    result = asyncio.run(engine._generate_image("private identity traits", "realistic", user_id="user-A"))
    assert result == "default_avatar"


def test_avatar_http_routes_require_owner_and_translate_missing_consent(monkeypatch):
    auth = importlib.import_module("app.api.dependencies.auth")
    routes = importlib.import_module("app.api.routes.avatar_routes")
    engine_module = importlib.import_module("app.features.avatar_engine.avatar_engine")
    app = FastAPI()
    app.dependency_overrides[auth.get_current_user_id] = lambda: "user-A"
    app.include_router(routes.router)
    async def denied(*args, **kwargs): return {"status": "consent_required", "purpose": "image_generation"}
    monkeypatch.setattr(engine_module.avatar_engine, "generate_avatars", denied)
    client = TestClient(app)
    denied_response = client.post("/api/avatar/generate", json={"user_id": "user-A", "user_name": "A"})
    foreign_response = client.post("/api/avatar/generate", json={"user_id": "user-B", "user_name": "B"})
    assert denied_response.status_code == 403
    assert foreign_response.status_code == 404
