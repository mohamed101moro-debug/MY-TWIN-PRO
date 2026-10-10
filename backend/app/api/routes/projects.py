"""Project endpoints with server-derived identity and owner-scoped queries."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies.auth import get_current_user_id

logger = logging.getLogger("projects_routes")
router = APIRouter(prefix="/api", tags=["projects"])


def _enforce_requested_user(requested_user_id: Optional[str], authenticated_user_id: str) -> None:
    """Keep legacy URL compatibility without ever trusting its user_id."""
    if requested_user_id is not None and requested_user_id != authenticated_user_id:
        # Same response for unknown resources and another user's resources.
        raise HTTPException(status_code=404, detail="Project not found")


def _database_client():
    from app.infrastructure.database.supabase_client import get_db

    client = get_db()
    if client is None:
        raise HTTPException(status_code=503, detail="Project service temporarily unavailable")
    return client


def _service_unavailable(operation: str, exc: Exception) -> HTTPException:
    logger.warning("Project %s failed: %s", operation, type(exc).__name__)
    return HTTPException(status_code=503, detail="Project service temporarily unavailable")


@router.get("/projects")
async def get_projects(
    user_id: Optional[str] = Query(None, min_length=1, max_length=128),
    project_type: Optional[str] = Query(None, min_length=1, max_length=64),
    limit: int = Query(50, ge=1, le=100),
    authenticated_user_id: str = Depends(get_current_user_id),
):
    """List only the authenticated user's projects."""
    _enforce_requested_user(user_id, authenticated_user_id)
    try:
        query = _database_client().table("projects").select("*").eq("user_id", authenticated_user_id)
        if project_type:
            query = query.eq("type", project_type)
        response = query.order("created_at", desc=True).limit(limit).execute()
        return {"projects": response.data or []}
    except HTTPException:
        raise
    except Exception as exc:
        raise _service_unavailable("list", exc) from exc


@router.get("/projects/{project_id}")
async def get_project(
    project_id: str,
    authenticated_user_id: str = Depends(get_current_user_id),
):
    """Read a project only when its owner matches the authenticated subject."""
    try:
        response = (
            _database_client()
            .table("projects")
            .select("*")
            .eq("id", project_id)
            .eq("user_id", authenticated_user_id)
            .limit(1)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Project not found")
        return {"project": response.data[0]}
    except HTTPException:
        raise
    except Exception as exc:
        raise _service_unavailable("read", exc) from exc


@router.delete("/projects")
async def delete_project(
    project_id: str = Query(..., min_length=1, max_length=128),
    authenticated_user_id: str = Depends(get_current_user_id),
):
    """Delete only rows owned by the authenticated subject.

    The endpoint intentionally returns an idempotent success for a missing or
    foreign project, avoiding a resource-existence oracle.
    """
    try:
        (
            _database_client()
            .table("projects")
            .delete()
            .eq("id", project_id)
            .eq("user_id", authenticated_user_id)
            .execute()
        )
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as exc:
        raise _service_unavailable("delete", exc) from exc


@router.get("/projects/stats/{user_id}")
async def get_project_stats(
    user_id: str,
    authenticated_user_id: str = Depends(get_current_user_id),
):
    """Retain the legacy path shape, but reject a caller-selected identity."""
    _enforce_requested_user(user_id, authenticated_user_id)
    try:
        response = (
            _database_client()
            .table("projects")
            .select("type")
            .eq("user_id", authenticated_user_id)
            .execute()
        )
        projects = response.data or []
        by_type: dict[str, int] = {}
        for project in projects:
            project_type = project.get("type") or "other"
            by_type[project_type] = by_type.get(project_type, 0) + 1
        return {"total": len(projects), "by_type": by_type}
    except HTTPException:
        raise
    except Exception as exc:
        raise _service_unavailable("stats", exc) from exc
