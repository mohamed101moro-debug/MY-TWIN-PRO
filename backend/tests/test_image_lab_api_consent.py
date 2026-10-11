"""HTTP-level checks for image consent denial and request-owner enforcement."""
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


def test_image_generate_endpoint_returns_403_for_missing_consent_and_rejects_foreign_user(monkeypatch):
    auth = importlib.import_module("app.api.dependencies.auth")
    image_routes = importlib.import_module("app.api.routes.image_lab_routes")
    orchestrator_module = importlib.import_module("app.features.image_lab.image_orchestrator")
    app = FastAPI()
    app.dependency_overrides[auth.get_current_user_id] = lambda: "user-A"
    app.include_router(image_routes.router)

    async def requires_consent(*args, **kwargs):
        return {"status": "consent_required", "purpose": "image_generation"}
    monkeypatch.setattr(orchestrator_module.image_lab, "generate", requires_consent)
    client = TestClient(app)

    denied = client.post("/api/image-lab/generate", json={"user_id": "user-A", "prompt": "a tree"})
    foreign = client.post("/api/image-lab/generate", json={"user_id": "user-B", "prompt": "a tree"})
    assert denied.status_code == 403
    assert foreign.status_code == 404
