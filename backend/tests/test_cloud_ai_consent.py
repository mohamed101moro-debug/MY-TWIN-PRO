"""Fail-closed tests for provider- and purpose-scoped cloud AI consent."""
import asyncio
import importlib
import os
import sys
from types import SimpleNamespace

import pytest

if "supabase" not in sys.modules:
    import types
    supabase_stub = types.ModuleType("supabase")
    supabase_stub.create_client = lambda *args, **kwargs: None
    supabase_stub.Client = object
    sys.modules["supabase"] = supabase_stub

os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "local-test-only-key")
sys.path.insert(0, "backend")
consent = importlib.import_module("app.privacy.cloud_ai_consent")


class Query:
    def __init__(self, rows, error=None):
        self.rows, self.error, self.filters, self.payload = rows, error, [], None
    def select(self, *_args): return self
    def eq(self, key, value): self.filters.append((key, value)); return self
    def upsert(self, payload, **_kwargs): self.payload = payload; return self
    def execute(self):
        if self.error: raise self.error
        rows = self.rows
        for key, value in self.filters:
            rows = [row for row in rows if row.get(key) == value]
        return SimpleNamespace(data=rows if self.payload is None else [self.payload])


class DB:
    def __init__(self, rows=(), error=None):
        self.rows = list(rows)
        self.error = error
        self.queries = []
    def table(self, name):
        assert name == "privacy_consents"
        query = Query(self.rows, self.error)
        self.queries.append(query)
        return query


def test_gateway_requires_policy_approval_user_and_matching_current_grant(monkeypatch):
    db = DB([{"user_id": "A", "purpose": "text_generation", "provider": "groq", "granted": True, "policy_version": consent.POLICY_VERSION}])
    monkeypatch.setattr(consent, "get_db", lambda: db)
    monkeypatch.setenv(consent.APPROVED_POLICY_ENV, "not-the-current-policy")
    assert consent.get_granted_providers("A", "text_generation") == set()
    monkeypatch.setenv(consent.APPROVED_POLICY_ENV, consent.POLICY_VERSION)
    assert consent.get_granted_providers(None, "text_generation") == set()
    assert consent.get_granted_providers("A", "text_generation") == {"groq"}
    assert consent.get_granted_providers("B", "text_generation") == set()
    assert db.queries[-1].filters[0] == ("user_id", "B")


def test_gateway_denies_when_database_read_fails(monkeypatch):
    monkeypatch.setattr(consent, "get_db", lambda: DB(error=RuntimeError("db down")))
    monkeypatch.setenv(consent.APPROVED_POLICY_ENV, consent.POLICY_VERSION)
    assert consent.get_granted_providers("A", "text_generation") == set()


def test_grant_is_rejected_until_policy_version_is_approved(monkeypatch):
    monkeypatch.delenv(consent.APPROVED_POLICY_ENV, raising=False)
    with pytest.raises(consent.ConsentPolicyNotApproved):
        consent.set_consent("A", "text_generation", "groq", True)


def test_provider_purpose_matrix_rejects_unknown_pairs():
    with pytest.raises(ValueError, match="Unsupported"):
        consent.set_consent("A", "text_generation", "gemini_image", False)
    with pytest.raises(ValueError, match="Unsupported"):
        consent.set_consent("A", "image_editing", "gemini_image", False)


def test_snapshot_reports_no_effective_grants_before_approval(monkeypatch):
    db = DB([{"user_id": "A", "purpose": "text_generation", "provider": "groq", "granted": True, "policy_version": consent.POLICY_VERSION}])
    monkeypatch.setattr(consent, "get_db", lambda: db)
    monkeypatch.delenv(consent.APPROVED_POLICY_ENV, raising=False)
    result = consent.consent_snapshot("A")
    assert result["grants_available"] is False
    groq = next(provider for purpose in result["purposes"] if purpose["key"] == "text_generation" for provider in purpose["providers"] if provider["key"] == "groq")
    assert groq["granted"] is True
    assert groq["effective"] is False
