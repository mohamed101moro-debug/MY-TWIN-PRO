"""عقود الصحة العامة وحدود المصادقة للواجهات."""
import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from main import app

client = TestClient(app)


def test_root_liveness_contract():
    response = client.get("/")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "alive"
    assert "kernel" in payload
    assert isinstance(payload["engines"], int)


def test_health_endpoint_is_public_and_healthy():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["api"] == "healthy"


def test_root_health_routes_are_registered_once():
    paths = [route.path for route in app.routes if hasattr(route, "path")]
    assert paths.count("/") == 1
    assert paths.count("/health") == 1
    assert paths.count("/api/health") == 1
    assert paths.count("/ready") == 1


def test_ready_endpoint_checks_database_and_auth_profile_schema_without_reading_rows(monkeypatch):
    from types import SimpleNamespace
    import app.infrastructure.database.supabase_client as supabase_client

    selected = []

    class Query:
        def select(self, columns):
            selected.append(columns)
            return self
        def limit(self, count):
            assert count == 0
            return self
        def execute(self):
            return SimpleNamespace(data=[])

    class DB:
        def table(self, name):
            assert name == "profiles"
            return Query()

    monkeypatch.setattr(supabase_client, "get_db", lambda: DB())
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"
    assert response.json()["checks"]["profile_auth_schema"] == "ready"
    assert selected == ["id,status,deleted_at"]


def test_ready_fails_closed_when_database_or_profile_schema_is_unavailable(monkeypatch):
    import app.infrastructure.database.supabase_client as supabase_client

    class Query:
        def select(self, _columns): return self
        def limit(self, _count): return self
        def execute(self): raise RuntimeError("schema unavailable")

    class DB:
        def table(self, _name): return Query()

    monkeypatch.setattr(supabase_client, "get_db", lambda: DB())
    response = client.get("/ready")
    assert response.status_code == 503
    assert response.json()["status"] == "not_ready"
    assert response.json()["checks"]["database"] == "unavailable"
    # Keep the Railway process liveness probe independent from database readiness.
    assert client.get("/health").status_code == 200


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("post", "/api/chat", {}),
        ("get", "/api/avatar/get?user_id=test&gender=female", None),
        ("get", "/api/consciousness/status?user_id=test", None),
        ("get", "/api/projects?user_id=test", None),
        ("post", "/api/study/start", {"user_id": "test", "concept": "gravity", "language": "ar"}),
        ("get", "/api/pass/dashboard?user_id=test", None),
        ("get", "/api/smart-home/status?user_id=test", None),
        ("get", "/api/v1/passport", None),
        ("get", "/api/v1/fingerprint", None),
        ("get", "/api/fingerprint/get?user_id=test", None),
    ],
)
def test_user_and_economy_routes_reject_anonymous_access(method, path, payload):
    request = getattr(client, method)
    response = request(path, json=payload) if payload is not None else request(path)
    assert response.status_code == 401


def test_unverified_ads_rewards_and_trials_are_disabled():
    assert client.get("/api/ads/status").status_code == 404
    assert client.post("/api/economy/ad-reward").status_code == 410
    assert client.post("/api/economy/trial/start").status_code == 410


def test_pricing_catalog_has_complete_arabic_and_english_display_copy():
    response = client.get("/api/economy/pricing")
    assert response.status_code == 200
    plans = response.json()["catalog"]
    assert plans
    for plan in plans:
        assert plan["name_ar"] and plan["name_en"]
        assert plan["philosophy"] and plan["philosophy_en"]
        assert len(plan["features"]) == len(plan["features_en"])
    advertised_copy = " ".join(
        text
        for plan in plans
        for text in [*plan["features"], *plan["features_en"]]
    ).casefold()
    assert "vision" not in advertised_copy
    assert "stt" not in advertised_copy
    assert "voice calls" not in advertised_copy
    assert "sensory" not in advertised_copy


def test_cloud_vision_and_sensor_snapshot_routes_are_not_registered():
    registered_paths = {route.path for route in app.routes if hasattr(route, "path")}
    assert "/api/vision/describe" not in registered_paths
    assert "/api/perception/snapshot" not in registered_paths
