"""Regression tests for complete, owner-scoped account export behavior."""
import asyncio
import importlib
import os
import sys
from datetime import datetime, timezone, timedelta
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
account_routes = importlib.import_module("app.api.routes.account")


class FakeQuery:
    def __init__(self, rows, fail=False):
        self.rows = rows
        self.fail = fail
        self.filters = []
        self.start = 0
        self.end = None
    def select(self, *_args): return self
    def eq(self, key, value):
        self.filters.append((key, value))
        return self
    def limit(self, _limit): return self
    def order(self, *_args, **_kwargs): return self
    def range(self, start, end):
        self.start, self.end = start, end
        return self
    def execute(self):
        if self.fail:
            raise RuntimeError("database query failed")
        rows = list(self.rows)
        for key, value in self.filters:
            rows = [row for row in rows if row.get(key) == value]
        if self.end is not None:
            rows = rows[self.start:self.end + 1]
        return SimpleNamespace(data=rows)


class FakeDB:
    def __init__(self, fail_table=None):
        self.fail_table = fail_table
        self.tables = {}
        self.queries = []
    def table(self, name):
        if name == "profiles":
            rows = [{"id": "user-A", "email": "a@example.com", "access_token": "must-not-export"}]
        else:
            # Deliberately include a second user's row to assert owner scoping.
            rows = self.tables.get(name, [])
        query = FakeQuery(rows, fail=name == self.fail_table)
        self.queries.append((name, query))
        return query


def test_export_pagination_is_owner_scoped_and_never_truncates():
    db = FakeDB()
    db.tables["raw_conversation_archive"] = [
        {"user_id": "user-A", "created_at": f"2026-01-{(i % 28) + 1:02d}", "message": str(i)}
        for i in range(501)
    ] + [{"user_id": "user-B", "created_at": "2026-01-01", "message": "private"}]

    rows = account_routes._fetch_all_owned_rows(
        db, "raw_conversation_archive", "user-A", "created_at", remaining=1000
    )

    assert len(rows) == 501
    assert all(row["user_id"] == "user-A" for row in rows)
    ranges = [q.start for name, q in db.queries if name == "raw_conversation_archive"]
    assert ranges == [0, 500]


def test_export_is_blocked_until_every_account_table_schema_is_verified(monkeypatch):
    db = FakeDB()
    monkeypatch.setattr(account_routes, "get_db", lambda: db)

    with pytest.raises(HTTPException) as error:
        asyncio.run(account_routes.export_all_data(user_id="user-A"))

    assert error.value.status_code == 503
    assert "لم يتم إنشاء ملف جزئي" in error.value.detail
    assert not db.queries  # no data is read while the coverage contract is incomplete

def test_export_fails_closed_instead_of_returning_partial_data(monkeypatch):
    db = FakeDB(fail_table="twin_events")
    monkeypatch.setattr(account_routes, "get_db", lambda: db)

    with pytest.raises(RuntimeError, match="database query failed"):
        account_routes._fetch_all_owned_rows(
            db, "twin_events", "user-A", "ts", remaining=1000
        )


def test_export_rejects_missing_profile_when_inventory_is_verified(monkeypatch):
    class MissingProfileDB(FakeDB):
        def table(self, name):
            query = FakeQuery([])
            self.queries.append((name, query))
            return query
    monkeypatch.setattr(account_routes, "EXPORT_NOT_COVERED_TABLES", ())
    monkeypatch.setattr(account_routes, "EXPORT_SCHEMA_VERIFICATION_PASSED", True)
    monkeypatch.setattr(account_routes, "get_db", MissingProfileDB)

    with pytest.raises(HTTPException) as error:
        asyncio.run(account_routes.export_all_data(user_id="user-A"))
    assert error.value.status_code == 404


def test_export_inventory_includes_canonical_entity_and_lifecycle_state():
    inventory = {table for table, _order in account_routes.EXPORT_TABLES.values()}
    assert {"twin_entity_identity", "twin_internal_states", "lifecycle_intention_receipts"} <= inventory


class CleanupQuery:
    def __init__(self, table_name, rows, events, fail_table=None):
        self.table_name = table_name
        self.rows = rows
        self.events = events
        self.fail_table = fail_table
        self.filters = []
        self.update_values = None
        self.is_delete = False
        self.selected = False
        self.max_rows = None
    def select(self, *_args):
        self.selected = True
        return self
    def eq(self, key, value):
        self.filters.append(("eq", key, value))
        return self
    def in_(self, key, values):
        self.filters.append(("in", key, values))
        return self
    def lt(self, key, value):
        self.filters.append(("lt", key, value))
        return self
    def lte(self, key, value):
        self.filters.append(("lte", key, value))
        return self
    def order(self, *_args, **_kwargs): return self
    def limit(self, value):
        self.max_rows = value
        return self
    def update(self, values):
        self.update_values = values
        self.events.append(("update", self.table_name, values))
        return self
    def delete(self):
        self.is_delete = True
        self.events.append(("delete", self.table_name))
        return self
    def _matches(self, row):
        for op, key, value in self.filters:
            actual = row.get(key)
            if op == "eq" and actual != value:
                return False
            if op == "in" and actual not in value:
                return False
            if op == "lt" and (actual is None or not actual < value):
                return False
            if op == "lte" and (actual is None or not actual <= value):
                return False
        return True
    def execute(self):
        if self.table_name == self.fail_table and self.is_delete:
            raise RuntimeError("simulated database failure")
        matched = [row for row in self.rows if self._matches(row)]
        if self.max_rows is not None:
            matched = matched[:self.max_rows]
        if self.update_values is not None:
            for row in matched:
                row.update(self.update_values)
            return SimpleNamespace(data=[dict(row) for row in matched] if self.selected else [])
        if self.is_delete:
            for row in matched:
                self.rows.remove(row)
            return SimpleNamespace(data=[])
        return SimpleNamespace(data=[dict(row) for row in matched])


class CleanupDB:
    def __init__(self, fail_table=None, status="pending_deletion", deleted_at=None, deletion_started_at=None):
        self.fail_table = fail_table
        self.events = []
        now = datetime.now(timezone.utc)
        due = deleted_at or (now - timedelta(days=1)).isoformat()
        started = deletion_started_at
        if status == "deletion_in_progress" and started is None:
            started = (now - timedelta(minutes=30)).isoformat()
        self.tables = {
            "profiles": [{"id": "user-A", "status": status, "deleted_at": due, "deletion_started_at": started}]
        }
        self.auth = SimpleNamespace(admin=SimpleNamespace(delete_user=self.delete_auth_user))
    def delete_auth_user(self, user_id):
        self.events.append(("auth_delete", user_id))
    def table(self, name):
        rows = self.tables.setdefault(name, [])
        return CleanupQuery(name, rows, self.events, self.fail_table)


def test_cleanup_preflight_failure_claims_no_account_and_deletes_nothing(monkeypatch):
    class InvalidInventoryDB(CleanupDB):
        def table(self, name):
            query = super().table(name)
            original_execute = query.execute
            def execute():
                if name == "working_memory" and not query.is_delete:
                    raise RuntimeError("missing owner column")
                return original_execute()
            query.execute = execute
            return query

    db = InvalidInventoryDB()
    monkeypatch.setattr(account_routes, "get_db", lambda: db)
    with pytest.raises(RuntimeError, match="inventory preflight failed"):
        asyncio.run(account_routes.run_deletion_cleanup())
    assert not any(event[0] == "delete" for event in db.events)
    assert db.tables["profiles"][0]["status"] == "pending_deletion"


def test_cleanup_stops_before_auth_delete_if_any_personal_data_delete_fails(monkeypatch):
    db = CleanupDB(fail_table="working_memory")
    monkeypatch.setattr(account_routes, "get_db", lambda: db)
    with pytest.raises(RuntimeError, match="cleanup incomplete"):
        asyncio.run(account_routes.run_deletion_cleanup())
    assert ("auth_delete", "user-A") not in db.events
    assert ("delete", "profiles") not in db.events
    assert any(event[0] == "update" and event[1] == "profiles" and event[2].get("status") == "deletion_failed" for event in db.events)


def test_cleanup_deletes_auth_only_after_all_owned_tables_and_uses_due_timestamp(monkeypatch):
    db = CleanupDB()
    monkeypatch.setattr(account_routes, "get_db", lambda: db)
    assert asyncio.run(account_routes.run_deletion_cleanup()) == 1
    auth_index = db.events.index(("auth_delete", "user-A"))
    profile_index = db.events.index(("delete", "profiles"))
    last_personal_delete = max(i for i, event in enumerate(db.events) if event[0] == "delete" and event[1] != "profiles")
    assert last_personal_delete < auth_index < profile_index


def test_cleanup_claims_account_before_deleting_personal_data(monkeypatch):
    db = CleanupDB()
    monkeypatch.setattr(account_routes, "get_db", lambda: db)
    assert asyncio.run(account_routes.run_deletion_cleanup()) == 1
    claim_index = next(i for i, event in enumerate(db.events) if event[0] == "update" and event[1] == "profiles" and event[2].get("status") == "deletion_in_progress")
    first_personal_delete = next(i for i, event in enumerate(db.events) if event[0] == "delete" and event[1] != "profiles")
    assert claim_index < first_personal_delete


def test_cleanup_recovers_stale_in_progress_lease_after_worker_crash(monkeypatch):
    db = CleanupDB(status="deletion_in_progress")
    monkeypatch.setattr(account_routes, "get_db", lambda: db)
    assert asyncio.run(account_routes.run_deletion_cleanup()) == 1
    assert ("auth_delete", "user-A") in db.events
    assert ("delete", "profiles") in db.events
