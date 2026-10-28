"""Canonical Soul Sync entity identity.

This module owns durable identity metadata only. It is deliberately not a second
Twin State store: mutable cognition, emotion, memory, relationship and lifecycle
state remain in their existing canonical services.
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.infrastructure.database.supabase_client import get_db

logger = logging.getLogger("entity_identity")

ENTITY_SCHEMA_VERSION = "sss.entity.1"
PASSPORT_VERSION = "2.0.0"
CONSTITUTION_VERSION = "1.0.0"


def _canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)


def compute_integrity_hash(document: Dict[str, Any]) -> str:
    payload = dict(document)
    payload.pop("integrity_hash", None)
    return hashlib.sha256(_canonical_json(payload).encode("utf-8")).hexdigest()


async def ensure_entity_identity(user_id: str) -> Dict[str, Any]:
    """Return the one durable entity identity bound to a user.

    The database function performs the creation atomically, so two first-time
    requests cannot manufacture two different entity IDs.
    """
    if not user_id:
        raise ValueError("user_id_required")
    try:
        result = get_db().rpc("ensure_twin_entity_identity", {"p_user_id": user_id}).execute()
        row = result.data
        if isinstance(row, list):
            row = row[0] if row else None
        if not isinstance(row, dict) or not row.get("entity_id"):
            raise RuntimeError("entity_identity_unavailable")
        return row
    except Exception as exc:
        logger.error("entity identity unavailable for %s: %s", user_id, exc)
        raise RuntimeError("entity_identity_unavailable") from exc


async def get_entity_identity(user_id: str) -> Optional[Dict[str, Any]]:
    try:
        result = get_db().table("twin_entity_identity").select("*").eq("user_id", user_id).maybe_single().execute()
        return dict(result.data) if result.data else None
    except Exception as exc:
        logger.debug("entity identity read failed: %s", exc)
        return None


async def build_passport(user_id: str, state: Dict[str, Any], memory_count: int = 0) -> Dict[str, Any]:
    """Build a deterministic passport projection from canonical identity + state.

    The projection is not itself authoritative mutable state. The durable
    identity row is the identity authority; lifecycle/memory state comes from
    their canonical services.
    """
    identity = await ensure_entity_identity(user_id)
    traits = []
    try:
        from app.twin_state.internal_state import twin_internal_state
        traits = list((await twin_internal_state.get_personality_dna(user_id)).keys())[:15]
    except Exception:
        traits = []

    document: Dict[str, Any] = {
        "passport_id": f"SSS-DP-{identity['entity_id']}",
        "entity_id": identity["entity_id"],
        "entity_name": state.get("twin_name") or "My Twin",
        "entity_type": "persistent_digital_entity",
        "schema_version": ENTITY_SCHEMA_VERSION,
        "origin": identity.get("origin") or {"organization": "Soul Sync"},
        "birth": {
            "created_at": identity.get("birth_at") or identity.get("created_at"),
            "source": "canonical_entity_identity",
        },
        "identity": {
            "version": int(identity.get("identity_version") or 1),
            "traits": traits,
            "continuity_revision": int(state.get("continuity_revision", 0) or 0),
        },
        "memory": {
            "total_memories": int(memory_count or 0),
        },
        "governance": {
            "constitution_version": identity.get("constitution_version") or CONSTITUTION_VERSION,
            "human_authority": True,
        },
        "capabilities": identity.get("capability_manifest") or {},
        "provenance": identity.get("provenance") or {},
        "version": {
            "passport_version": identity.get("passport_version") or PASSPORT_VERSION,
        },
        "current_state": {
            "continuity_schema_version": state.get("continuity_schema_version", "s5.5"),
            "continuity_revision": int(state.get("continuity_revision", 0) or 0),
            "last_experience_at": state.get("last_experience_at"),
        },
    }
    document["integrity_hash"] = compute_integrity_hash(document)
    document["generated_at"] = datetime.now(timezone.utc).isoformat()
    return document
