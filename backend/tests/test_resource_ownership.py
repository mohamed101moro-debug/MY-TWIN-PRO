"""Regression tests for user-scoped project and state access."""

import asyncio
import importlib
import os
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from starlette.requests import Request


@pytest.fixture(scope="module")
def route_modules():
    """Import routes with non-routable test-only Supabase settings."""
    # Never let test imports inherit a developer's or production Supabase URL.
    os.environ["SUPABASE_URL"] = "https://example.invalid"
    os.environ["SUPABASE_SERVICE_KEY"] = "local-test-only-key"
    yield SimpleNamespace(
        projects=importlib.import_module("app.api.routes.projects"),
        system=importlib.import_module("app.api.routes.system_routes"),
        auth=importlib.import_module("app.api.dependencies.auth"),
        database=importlib.import_module("app.infrastructure.database.supabase_client"),
        creator=importlib.import_module("app.api.routes.creator_routes"),
        dreams=importlib.import_module("app.api.routes.dream_routes"),
        business=importlib.import_module("app.api.routes.business_routes"),
        avatar=importlib.import_module("app.api.routes.avatar_routes"),
        code_lab=importlib.import_module("app.api.routes.code_lab_routes"),
        image_lab=importlib.import_module("app.api.routes.image_lab_routes"),
        life_coach=importlib.import_module("app.api.routes.life_coach_routes"),
        study=importlib.import_module("app.api.routes.study_routes"),
        smart_home=importlib.import_module("app.api.routes.smart_home_routes"),
        awareness=importlib.import_module("app.api.routes.awareness_score_routes"),
        referral=importlib.import_module("app.api.routes.referral"),
        meta=importlib.import_module("app.api.routes.meta_routes"),
        task_routes=importlib.import_module("app.api.routes.task_manager_routes"),
    )


class FakeQuery:
    def __init__(self, client, table):
        self.client = client
        self.table_name = table
        self.operation = "select"
        self.filters = []
        self.result_data = client.result_data

    def select(self, _columns):
        self.operation = "select"
        return self

    def update(self, _updates):
        self.operation = "update"
        return self

    def delete(self):
        self.operation = "delete"
        return self

    def eq(self, key, value):
        self.filters.append((key, value))
        return self

    def order(self, *_args, **_kwargs):
        return self

    def limit(self, _count):
        return self

    def execute(self):
        self.client.queries.append(self)
        return SimpleNamespace(data=self.result_data)


class FakeClient:
    def __init__(self, result_data=None):
        self.result_data = result_data or []
        self.queries = []

    def table(self, name):
        return FakeQuery(self, name)


def test_missing_authorization_is_a_401(route_modules):
    with pytest.raises(HTTPException) as error:
        asyncio.run(route_modules.auth.get_current_user_id(None))
    assert error.value.status_code == 401


def test_projects_list_rejects_another_users_requested_identity(route_modules, monkeypatch):
    fake = FakeClient()
    monkeypatch.setattr(route_modules.database, "get_db", lambda: fake)
    with pytest.raises(HTTPException) as error:
        asyncio.run(
            route_modules.projects.get_projects(
                user_id="user-B",
                project_type=None,
                limit=50,
                authenticated_user_id="user-A",
            )
        )
    assert error.value.status_code == 404
    assert fake.queries == []


def test_projects_list_scopes_query_to_authenticated_subject(route_modules, monkeypatch):
    fake = FakeClient([{"id": "project-1", "user_id": "user-A", "type": "chat"}])
    monkeypatch.setattr(route_modules.database, "get_db", lambda: fake)
    result = asyncio.run(
        route_modules.projects.get_projects(
            user_id=None,
            project_type=None,
            limit=50,
            authenticated_user_id="user-A",
        )
    )
    assert result["projects"][0]["user_id"] == "user-A"
    assert ("user_id", "user-A") in fake.queries[0].filters


def test_project_read_requires_both_resource_id_and_owner(route_modules, monkeypatch):
    fake = FakeClient([{"id": "project-1", "user_id": "user-A"}])
    monkeypatch.setattr(route_modules.database, "get_db", lambda: fake)
    result = asyncio.run(
        route_modules.projects.get_project("project-1", authenticated_user_id="user-A")
    )
    assert result["project"]["user_id"] == "user-A"
    assert ("id", "project-1") in fake.queries[0].filters
    assert ("user_id", "user-A") in fake.queries[0].filters


def test_project_delete_is_owner_scoped(route_modules, monkeypatch):
    fake = FakeClient()
    monkeypatch.setattr(route_modules.database, "get_db", lambda: fake)
    result = asyncio.run(
        route_modules.projects.delete_project(
            project_id="project-1", authenticated_user_id="user-A"
        )
    )
    assert result == {"status": "deleted"}
    assert fake.queries[0].operation == "delete"
    assert ("id", "project-1") in fake.queries[0].filters
    assert ("user_id", "user-A") in fake.queries[0].filters


def test_project_stats_rejects_cross_user_path_identity(route_modules, monkeypatch):
    fake = FakeClient()
    monkeypatch.setattr(route_modules.database, "get_db", lambda: fake)
    with pytest.raises(HTTPException) as error:
        asyncio.run(
            route_modules.projects.get_project_stats(
                "user-B", authenticated_user_id="user-A"
            )
        )
    assert error.value.status_code == 404
    assert fake.queries == []


def test_snapshot_rejects_cross_user_query_identity(route_modules, monkeypatch):
    fake = FakeClient()
    monkeypatch.setattr(route_modules.database, "get_db", lambda: fake)
    with pytest.raises(HTTPException) as error:
        asyncio.run(
            route_modules.system.user_snapshot(
                user_id="user-B", authenticated_user_id="user-A"
            )
        )
    assert error.value.status_code == 404
    assert fake.queries == []


def test_snapshot_query_is_scoped_to_authenticated_subject(route_modules, monkeypatch):
    fake = FakeClient([{"user_id": "user-A", "state": "private"}])
    monkeypatch.setattr(route_modules.database, "get_db", lambda: fake)
    result = asyncio.run(
        route_modules.system.user_snapshot(
            user_id=None, authenticated_user_id="user-A"
        )
    )
    assert result["state"]["user_id"] == "user-A"
    assert fake.queries[0].table_name == "twin_internal_states"
    assert ("user_id", "user-A") in fake.queries[0].filters


def _request(method="GET", *, query=b"", body=b"", path_params=None):
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": "/api/test",
        "raw_path": b"/api/test",
        "query_string": query,
        "headers": [(b"content-type", b"application/json")],
        "client": ("127.0.0.1", 12345),
        "server": ("test", 80),
        "path_params": path_params or {},
    }

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    return Request(scope, receive)


def test_request_owner_rejects_foreign_path_identity(route_modules):
    request = _request(path_params={"user_id": "user-B"})
    with pytest.raises(HTTPException) as error:
        asyncio.run(route_modules.auth.require_request_owner(request, "user-A"))
    assert error.value.status_code == 404


def test_request_owner_rejects_foreign_query_identity(route_modules):
    request = _request(query=b"user_id=user-B")
    with pytest.raises(HTTPException) as error:
        asyncio.run(route_modules.auth.require_request_owner(request, "user-A"))
    assert error.value.status_code == 404


def test_request_owner_rejects_foreign_body_identity(route_modules):
    request = _request("POST", body=b'{"user_id":"user-B"}')
    with pytest.raises(HTTPException) as error:
        asyncio.run(route_modules.auth.require_request_owner(request, "user-A"))
    assert error.value.status_code == 404


def test_request_owner_accepts_only_authenticated_identity(route_modules):
    request = _request("POST", body=b'{"user_id":"user-A"}')
    assert asyncio.run(route_modules.auth.require_request_owner(request, "user-A")) == "user-A"


def test_all_user_owned_feature_routers_install_the_shared_guard(route_modules):
    routers = (
        route_modules.creator, route_modules.dreams, route_modules.business, route_modules.avatar,
        route_modules.code_lab, route_modules.image_lab, route_modules.life_coach,
        route_modules.study, route_modules.smart_home, route_modules.awareness,
        route_modules.referral, route_modules.meta, route_modules.task_routes,
    )
    for module in routers:
        assert any(
            dependency.dependency is route_modules.auth.require_request_owner
            for dependency in module.router.dependencies
        ), module.router.prefix


def test_fastapi_routes_block_foreign_path_query_and_body_ids(route_modules):
    app = FastAPI()
    app.dependency_overrides[route_modules.auth.get_current_user_id] = lambda: "user-A"
    app.include_router(route_modules.dreams.router)
    app.include_router(route_modules.meta.router)
    app.include_router(route_modules.task_routes.router)
    client = TestClient(app)

    responses = (
        client.get("/api/dreams/dna/user-B"),
        client.post("/api/dreams/interpret", json={"user_id": "user-B", "dream_text": "x"}),
        client.get("/api/meta/relationship-health?user_id=user-B"),
        client.get("/api/pass/tasks?user_id=user-B"),
    )
    assert [response.status_code for response in responses] == [404, 404, 404, 404]


def test_pass_task_update_is_scoped_to_both_task_and_authenticated_owner(route_modules, monkeypatch):
    from app.features.task_manager.pass_orchestrator import PASSOrchestrator

    fake = FakeClient([{"id": "task-B", "user_id": "user-A"}])
    orchestrator = object.__new__(PASSOrchestrator)
    monkeypatch.setattr(orchestrator, "_get_db", lambda: fake)
    updated = asyncio.run(
        orchestrator._update_task_in_db("user-A", "task-B", {"status": "completed"})
    )
    assert updated is True
    assert fake.queries[0].operation == "select"
    assert ("id", "task-B") in fake.queries[0].filters
    assert ("user_id", "user-A") in fake.queries[0].filters
