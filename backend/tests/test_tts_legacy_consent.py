import asyncio
import os
import sys
import pytest
from fastapi import HTTPException

os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "local-test-only-key")
sys.path.insert(0, "backend")


def test_legacy_tts_rejects_before_loading_or_calling_edge_provider(monkeypatch):
    from app.api.routes import tts
    monkeypatch.setattr(tts, "get_granted_providers", lambda *_args: set())
    with pytest.raises(HTTPException) as error:
        asyncio.run(tts.generate_tts(tts.TTSRequest(text="private text"), user_id="user-A"))
    assert error.value.status_code == 403
    assert "موافقة" in error.value.detail
