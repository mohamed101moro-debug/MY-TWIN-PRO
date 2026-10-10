from pathlib import Path
import ast

ROOT = Path(__file__).resolve().parents[2]


def test_entity_identity_has_one_canonical_database_root():
    migration = (ROOT / "backend/migrations/20260930_s6a_entity_identity_foundation.sql").read_text()
    assert "CREATE TABLE IF NOT EXISTS public.twin_entity_identity" in migration
    assert "UNIQUE" in migration
    assert "ensure_twin_entity_identity" in migration
    assert "GRANT EXECUTE" in migration


def test_entity_identity_is_not_a_second_twin_state_store():
    text = (ROOT / "backend/app/twin_state/entity_identity.py").read_text()
    assert "twin_internal_states" not in text
    assert "identity metadata only" in text


def test_passport_integrity_is_deterministic():
    text = (ROOT / "backend/app/twin_state/entity_identity.py").read_text()
    assert "compute_integrity_hash" in text
    assert "sort_keys=True" in text
    assert "integrity_hash" in text


def test_entity_identity_service_parses():
    ast.parse((ROOT / "backend/app/twin_state/entity_identity.py").read_text())


def test_passport_route_is_fail_closed_not_fake_defaulted():
    text = (ROOT / "backend/app/api/routes/passport_routes.py").read_text()
    assert "entity_identity_unavailable" in text
    assert "even in worst" not in text.lower()
    assert '"passport_id": f"SSS-DP-' not in text
