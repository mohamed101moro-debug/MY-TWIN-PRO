from uuid import UUID
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def test_frontend_passport_is_canonical_read_only_client():
    text = (ROOT / 'engine/passport/DigitalPassport.ts').read_text()
    assert "apiGet('/api/v1/passport')" in text
    assert 'Date.now().toString(36)' not in text
    assert 'new Date().toISOString()' not in text
    assert 'SSS-DP-${Date.now' not in text

def test_canonical_user_id_dependency_validates_uuid():
    text = (ROOT / 'backend/app/api/dependencies/canonical_user_id.py').read_text()
    assert 'UUID(' in text
    assert 'get_current_user_id' in text

def test_identity_sensitive_routes_use_canonical_user_id():
    for rel in ('backend/app/api/routes/passport_routes.py', 'backend/app/api/routes/twin_state_routes.py'):
        text = (ROOT / rel).read_text()
        assert 'canonical_user_id' in text

def test_s6a2_migration_unifies_lifecycle_receipt_user_id():
    text = (ROOT / 'backend/migrations/20261001_s6a2_canonical_user_id.sql').read_text()
    assert 'ALTER COLUMN user_id TYPE UUID' in text
    assert 'commit_twin_life_intention(' in text
    assert 'p_user_id UUID' in text
    assert 'twin_internal_states.user_id must be uuid' in text

def test_uuid_contract_roundtrip():
    value = '123e4567-e89b-12d3-a456-426614174000'
    assert str(UUID(value)) == value
