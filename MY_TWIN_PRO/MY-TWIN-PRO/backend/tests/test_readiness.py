import os

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-service-key")

from fastapi.testclient import TestClient
from main import app


def test_ready_reports_configured_service():
    response = TestClient(app).get("/ready")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ready"] is True
    assert payload["checks"]["supabase_configured"] is True
    assert payload["checks"]["api_url_configured"] is True
