"""P0 regression tests: signup must not bypass email verification; blocked accounts fail closed."""
import asyncio
import importlib
import os
import sys
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, Response


# This source-only test environment may not include the Supabase SDK. The tests below
# inject a minimal import stub and replace all network/database behavior with fakes.
if "supabase" not in sys.modules:
    import types
    supabase_stub = types.ModuleType("supabase")
    supabase_stub.create_client = lambda *args, **kwargs: None
    supabase_stub.Client = object
    sys.modules["supabase"] = supabase_stub

os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "local-test-only-key")
sys.path.insert(0, "backend")
auth_routes = importlib.import_module("app.api.routes.auth")
auth_dependency = importlib.import_module("app.api.dependencies.auth")
database = importlib.import_module("app.infrastructure.database.supabase_client")


class Query:
    def __init__(self, rows=None):
        self.rows = rows or []
        self.filters = []
        self.inserted = None
    def select(self, *_args): return self
    def eq(self, key, value):
        self.filters.append((key, value))
        return self
    def limit(self, *_args): return self
    def insert(self, payload):
        self.inserted = payload
        return self
    def execute(self):
        rows = self.rows
        for key, value in self.filters:
            rows = [row for row in rows if row.get(key) == value]
        return SimpleNamespace(data=rows)


class FakeDB:
    def __init__(self, user=None, profile_rows=None, signup_result=None):
        self.auth = SimpleNamespace(
            get_user=lambda token: SimpleNamespace(user=user),
            sign_up=lambda payload: signup_result,
            sign_in_with_password=lambda payload: (_ for _ in ()).throw(AssertionError("signup must not fall back to login")),
        )
        self.profile_rows = profile_rows or []
        self.queries = []
    def table(self, name):
        q = Query(self.profile_rows if name == "profiles" else [])
        self.queries.append((name, q))
        return q


def test_current_user_rejects_banned_and_pending_deletion(monkeypatch):
    user = SimpleNamespace(id="user-A", email="a@example.com", role="authenticated")
    for status in ("banned", "pending_deletion"):
        fake = FakeDB(user=user, profile_rows=[{"id": "user-A", "status": status, "deleted_at": None, "tier": "free"}])
        monkeypatch.setattr(database, "get_db", lambda: fake)
        with pytest.raises(HTTPException) as error:
            asyncio.run(auth_dependency.get_current_user_id("Bearer valid-token"))
        assert error.value.status_code == 403


def test_current_user_fails_closed_when_profile_lookup_fails(monkeypatch):
    class BrokenDB(FakeDB):
        def table(self, _name):
            class BrokenQuery:
                def select(self, *_args): return self
                def eq(self, *_args): return self
                def limit(self, *_args): return self
                def execute(self): raise RuntimeError("db unavailable")
            return BrokenQuery()
    user = SimpleNamespace(id="user-A", email="a@example.com", role="authenticated")
    monkeypatch.setattr(database, "get_db", lambda: BrokenDB(user=user))
    with pytest.raises(HTTPException) as error:
        asyncio.run(auth_dependency.get_current_user_id("Bearer valid-token"))
    assert error.value.status_code == 503


def test_signup_without_confirmed_email_returns_pending_and_never_issues_session(monkeypatch):
    user = SimpleNamespace(id="user-A", email="a@example.com", email_confirmed_at=None, confirmed_at=None)
    session = SimpleNamespace(access_token="must-not-be-returned")
    fake = FakeDB(
        user=user,
        profile_rows=[],
        signup_result=SimpleNamespace(user=user, session=session),
    )
    monkeypatch.setattr(auth_routes, "get_db", lambda: fake)
    monkeypatch.setattr(auth_routes, "get_service_role_db", lambda: fake)
    response = Response()
    result = asyncio.run(auth_routes.signup(auth_routes.SignupBody(email="a@example.com", password="strong-pass-123"), response))
    assert response.status_code == 202
    assert result["requires_email_confirmation"] is True
    assert "token" not in result
    assert all(name != "auth.admin" for name, _ in fake.queries)


def test_verify_token_requires_bearer_dependency_and_does_not_trust_claimed_user():
    with pytest.raises(HTTPException) as error:
        asyncio.run(auth_routes.verify_token(user_id="user-B", authenticated_user_id="user-A"))
    assert error.value.status_code == 404


def test_cloud_stt_is_disabled_until_per_user_consent_exists():
    stt_routes = importlib.import_module("app.api.routes.stt_routes")
    with pytest.raises(HTTPException) as error:
        asyncio.run(stt_routes.transcribe_audio(stt_routes.STTRequest(audio_base64="abcdefghij"), tier="pro"))
    assert error.value.status_code == 503
    assert "موافقة" in error.value.detail


def test_restore_dependency_allows_only_pending_deletion_accounts(monkeypatch):
    user = SimpleNamespace(id="user-A", email="a@example.com", role="authenticated")
    pending = FakeDB(user=user, profile_rows=[{"id": "user-A", "status": "pending_deletion", "deleted_at": "2026-10-01T00:00:00Z"}])
    monkeypatch.setattr(database, "get_db", lambda: pending)
    assert asyncio.run(auth_dependency.get_pending_deletion_user_id("Bearer valid-token")) == "user-A"

    banned = FakeDB(user=user, profile_rows=[{"id": "user-A", "status": "banned", "deleted_at": None}])
    monkeypatch.setattr(database, "get_db", lambda: banned)
    with pytest.raises(HTTPException) as error:
        asyncio.run(auth_dependency.get_pending_deletion_user_id("Bearer valid-token"))
    assert error.value.status_code == 403
