"""Proactive push delivery is disabled unless the authenticated user's profile explicitly opts in."""
import os
import sys
from types import SimpleNamespace

os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "local-test-only-key")
sys.path.insert(0, "backend")


class Query:
    def __init__(self, data): self.data = data
    def select(self, *_args): return self
    def eq(self, *_args): return self
    def single(self): return self
    def execute(self): return SimpleNamespace(data=self.data)


class DB:
    def __init__(self, data): self.data = data
    def table(self, *_args): return Query(self.data)


def test_push_preference_requires_explicit_true(monkeypatch):
    from app.infrastructure.database import supabase_client
    from app.infrastructure.push.preferences import proactive_notifications_enabled

    monkeypatch.setattr(supabase_client, "get_db", lambda: DB({"push_settings": {"proactive_enabled": True}}))
    assert proactive_notifications_enabled("user-A") is True
    monkeypatch.setattr(supabase_client, "get_db", lambda: DB({"push_settings": {"proactive_enabled": False}}))
    assert proactive_notifications_enabled("user-A") is False
    monkeypatch.setattr(supabase_client, "get_db", lambda: DB({"push_settings": {}}))
    assert proactive_notifications_enabled("user-A") is False


def test_push_preference_fails_closed_for_missing_identity_and_database_errors(monkeypatch):
    from app.infrastructure.database import supabase_client
    from app.infrastructure.push.preferences import proactive_notifications_enabled

    assert proactive_notifications_enabled(None) is False
    def fail(): raise RuntimeError("db unavailable")
    monkeypatch.setattr(supabase_client, "get_db", fail)
    assert proactive_notifications_enabled("user-A") is False
