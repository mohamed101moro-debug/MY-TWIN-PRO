from pathlib import Path


MIGRATION = (Path(__file__).resolve().parents[1] / "migrations/20261105_account_lifecycle_status.sql").read_text()


def test_account_lifecycle_migration_is_idempotent_and_fail_closed():
    assert "ADD COLUMN IF NOT EXISTS status" in MIGRATION
    assert "ADD COLUMN IF NOT EXISTS deleted_at" in MIGRATION
    assert "status IN ('active', 'pending_deletion', 'banned', 'suspended')" in MIGRATION
    assert "status IS NULL" in MIGRATION
    assert "CREATE INDEX IF NOT EXISTS" in MIGRATION
    assert "DROP TABLE" not in MIGRATION
    assert "DELETE FROM" not in MIGRATION
