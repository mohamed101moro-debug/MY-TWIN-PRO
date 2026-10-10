"""S4.1 contract tests: one canonical lifecycle writer, no legacy mutation path."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_legacy_lifecycle_writer_modules_are_removed():
    assert not (ROOT / "backend/app/api/routes/life_intentions.py").exists()
    assert not (ROOT / "backend/app/twin_state/life_intention_service.py").exists()


def test_api_registry_does_not_register_legacy_lifecycle_route():
    registry = (ROOT / "backend/app/api/routes/__init__.py").read_text()
    assert "life_intentions" not in registry
    assert "twin_state_routes" in registry


def test_frontend_lifecycle_bridge_targets_canonical_endpoint_only():
    bridge = (ROOT / "src/core/LifeIntentionBridge.ts").read_text()
    assert "/api/twin/life-intention" in bridge
    assert "/api/life/intentions" not in bridge


def test_canonical_endpoint_owns_persistence():
    routes = (ROOT / "backend/app/api/routes/twin_state_routes.py").read_text()
    assert '@router.post("/life-intention")' in routes
    assert "save_life_intention(user_id, payload)" in routes
    assert "life_intention_persistence_failed" in routes
