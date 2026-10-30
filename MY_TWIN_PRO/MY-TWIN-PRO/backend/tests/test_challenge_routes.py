import os

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-service-key")

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes import challenge_routes


@pytest.fixture
def client(monkeypatch):
    async def deterministic_daily(user_id: str, lang: str):
        return challenge_routes._catalog_challenge("daily", lang)

    monkeypatch.setattr(challenge_routes, "_daily", deterministic_daily)
    app = FastAPI()
    app.include_router(challenge_routes.router)
    return TestClient(app)


def test_challenge_catalog_and_rooms_are_reachable(client):
    assert client.get("/api/challenges/daily?user_id=test").status_code == 200
    catalog = client.get("/api/challenges?user_id=test").json()
    rooms = client.get("/api/challenges/rooms").json()
    assert catalog["status"] == "success"
    assert catalog["total"] == 4
    assert rooms["status"] == "success"
    assert rooms["total"] >= 1


def test_challenge_lifecycle_returns_result(client):
    started = client.post("/api/challenges/start", json={"user_id": "test", "challenge_id": "solo"})
    completed = client.post("/api/challenges/complete", json={"user_id": "test", "challenge_id": "solo", "score": 90})
    results = client.get("/api/challenges/results?user_id=test")
    assert started.status_code == 200
    assert started.json()["attempt"]["status"] == "started"
    assert completed.status_code == 200
    assert completed.json()["result"]["status"] == "completed"
    assert results.json()["total"] == 1
