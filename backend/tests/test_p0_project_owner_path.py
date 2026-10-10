"""Regression coverage for owner-scoped legacy project URL paths."""
import asyncio
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

# Importing backend packages validates configuration at module load. Use test-only
# placeholders; every database path below is replaced with an in-memory fake.
os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "local-test-only-key")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.api.routes import projects


class _Query:
    def __init__(self, rows):
        self.rows = rows
        self.filters = []

    def select(self, *_args):
        return self

    def eq(self, key, value):
        self.filters.append((key, value))
        return self

    def execute(self):
        rows = self.rows
        for key, value in self.filters:
            rows = [row for row in rows if row.get(key) == value]
        return SimpleNamespace(data=rows)


class _Database:
    def __init__(self, rows):
        self.query = _Query(rows)

    def table(self, _name):
        return self.query


def test_project_stats_rejects_a_path_user_other_than_the_authenticated_user(monkeypatch):
    database_calls = []
    monkeypatch.setattr(projects, "_database_client", lambda: database_calls.append(True))

    with pytest.raises(HTTPException) as error:
        asyncio.run(projects.get_project_stats("user-B", "user-A"))

    assert error.value.status_code == 404
    assert database_calls == []


def test_project_stats_filters_database_rows_by_authenticated_subject(monkeypatch):
    database = _Database([
        {"user_id": "user-A", "type": "creative"},
        {"user_id": "user-A", "type": "study"},
        {"user_id": "user-B", "type": "private"},
    ])
    monkeypatch.setattr(projects, "_database_client", lambda: database)

    result = asyncio.run(projects.get_project_stats("user-A", "user-A"))

    assert result == {"total": 2, "by_type": {"creative": 1, "study": 1}}
    assert ("user_id", "user-A") in database.query.filters
