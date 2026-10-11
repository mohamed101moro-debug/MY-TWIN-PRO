"""API contract tests for authenticated, policy-versioned cloud AI consent controls."""
import importlib
import os
import sys
import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

if "supabase" not in sys.modules:
    import types
    supabase_stub = types.ModuleType("supabase")
    supabase_stub.create_client = lambda *args, **kwargs: None
    supabase_stub.Client = object
    sys.modules["supabase"] = supabase_stub

os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "local-test-only-key")
sys.path.insert(0, "backend")
routes = importlib.import_module("app.api.routes.privacy_routes")
consent = importlib.import_module("app.privacy.cloud_ai_consent")


class Query:
    def __init__(self, db):
        self.db, self.filters, self.payload, self.selected = db, [], None, False
    def select(self, *_args): self.selected = True; return self
    def eq(self, key, value): self.filters.append((key, value)); return self
    def upsert(self, payload, **kwargs): self.payload = payload; self.db.conflict = kwargs.get("on_conflict"); return self
    def execute(self):
        rows = [row for row in self.db.rows if all(row.get(k) == v for k, v in self.filters)]
        if self.payload is not None:
            self.db.writes.append(self.payload.copy())
            self.db.rows = [row for row in self.db.rows if not all(row.get(k) == self.payload[k] for k in ("user_id", "purpose", "provider"))]
            self.db.rows.append(self.payload.copy())
            return SimpleNamespace(data=[self.payload.copy()])
        return SimpleNamespace(data=rows)


class DB:
    def __init__(self, rows=()): self.rows, self.writes, self.conflict = list(rows), [], None
    def table(self, name):
        assert name == "privacy_consents"
        return Query(self)


def test_get_consent_status_is_scoped_to_authenticated_user(monkeypatch):
    db = DB([
        {"user_id": "A", "purpose": "text_generation", "provider": "groq", "granted": True, "policy_version": consent.POLICY_VERSION},
        {"user_id": "B", "purpose": "text_generation", "provider": "groq", "granted": True, "policy_version": consent.POLICY_VERSION},
    ])
    monkeypatch.setattr(consent, "get_db", lambda: db)
    monkeypatch.setenv(consent.APPROVED_POLICY_ENV, consent.POLICY_VERSION)
    result = asyncio.run(routes.get_cloud_ai_consents(user_id="A"))
    groq = next(provider for purpose in result["purposes"] if purpose["key"] == "text_generation" for provider in purpose["providers"] if provider["key"] == "groq")
    assert groq["granted"] is True


def test_grant_requires_exact_current_policy_and_server_approval(monkeypatch):
    db = DB()
    monkeypatch.setattr(consent, "get_db", lambda: db)
    monkeypatch.delenv(consent.APPROVED_POLICY_ENV, raising=False)
    request = routes.CloudAIConsentRequest(
        purpose="text_generation", provider="groq", granted=True, policy_version=consent.POLICY_VERSION
    )
    with pytest.raises(HTTPException) as error:
        asyncio.run(routes.update_cloud_ai_consent(request, user_id="user-A"))
    assert error.value.status_code == 503
    assert not db.writes


def test_policy_version_mismatch_cannot_record_grant(monkeypatch):
    db = DB()
    monkeypatch.setattr(consent, "get_db", lambda: db)
    request = routes.CloudAIConsentRequest(
        purpose="text_generation", provider="groq", granted=True, policy_version="old-policy"
    )
    with pytest.raises(HTTPException) as error:
        asyncio.run(routes.update_cloud_ai_consent(request, user_id="user-A"))
    assert error.value.status_code == 409
    assert not db.writes


def test_revoke_is_saved_for_authenticated_owner_even_while_grants_are_disabled(monkeypatch):
    db = DB()
    monkeypatch.setattr(consent, "get_db", lambda: db)
    monkeypatch.delenv(consent.APPROVED_POLICY_ENV, raising=False)
    request = routes.CloudAIConsentRequest(
        purpose="text_generation", provider="groq", granted=False, policy_version=consent.POLICY_VERSION
    )
    result = asyncio.run(routes.update_cloud_ai_consent(request, user_id="user-A"))
    assert result["saved"] is True
    assert db.writes[0]["user_id"] == "user-A"
    assert db.writes[0]["granted"] is False
    assert db.conflict == "user_id,purpose,provider"
