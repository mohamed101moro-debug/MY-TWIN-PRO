from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]


def test_cloud_ai_consent_migration_is_private_and_owner_scoped():
    sql = (BACKEND / "migrations" / "20261011_p0_cloud_ai_consent.sql").read_text(encoding="utf-8").lower()
    assert "user_id uuid not null references auth.users(id)" in sql
    assert "enable row level security" in sql
    assert "force row level security" in sql
    assert "revoke all on table public.privacy_consents from public, anon, authenticated" in sql
    assert "grant all on table public.privacy_consents to service_role" in sql
    assert "unique (user_id, purpose, provider)" in sql
    assert "image_editing" in sql
    assert "pollinations" in sql
    assert "voice_synthesis" in sql
    assert "edge_tts" in sql
    assert "audio_transcription" in sql
    assert "memory_embedding" in sql
    assert "openai_embedding" in sql


def test_cloud_ai_consent_table_is_in_account_export_and_deletion_inventory():
    from app.core.account_data_inventory import DELETION_USER_TABLES, EXPORT_TABLES
    assert "privacy_consents" in DELETION_USER_TABLES
    assert EXPORT_TABLES.get("privacy_consents") == ("privacy_consents", "id")
