"""Canonical authenticated user-id contract for identity/lifecycle state.

The Soul Sync canonical entity graph uses the Supabase Auth UUID as its stable
user principal. This dependency validates the boundary once; downstream
services may continue to accept ``str`` for compatibility, but the value is
guaranteed to be a UUID-shaped identifier at the canonical boundary.
"""
from __future__ import annotations

from uuid import UUID
from fastapi import Depends, HTTPException

from app.api.dependencies.auth import get_current_user_id


def canonical_user_id(user_id: str) -> str:
    try:
        return str(UUID(str(user_id)))
    except (TypeError, ValueError, AttributeError) as exc:
        raise HTTPException(status_code=401, detail="invalid_canonical_user_id") from exc


async def get_current_canonical_user_id(
    user_id: str = Depends(get_current_user_id),
) -> str:
    return canonical_user_id(user_id)
