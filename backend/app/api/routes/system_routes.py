"""System Routes — cron boundary and authenticated user snapshots."""
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query

from app.api.dependencies.auth import get_current_user_id

logger = logging.getLogger("system_routes")
router = APIRouter(prefix="/api/system", tags=["system"])


@router.post("/consolidate")
async def consolidate(x_cron_secret: str = Header(None)):
    configured_secret = os.getenv("CRON_SECRET_KEY", "")
    if not configured_secret or not x_cron_secret or x_cron_secret != configured_secret:
        raise HTTPException(403, "forbidden")
    from app.core.soul_core import soul_kernel, SoulEvent
    from app.infrastructure.database.supabase_client import get_db

    cut = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
    res = get_db().table("profiles").select("id").gte("last_active", cut).limit(10).execute()
    done = 0
    for row in (res.data or []):
        await soul_kernel.dispatch(
            SoulEvent("offline_processing", {"user_id": row["id"]}, user_id=row["id"], source="cron")
        )
        await soul_kernel.dispatch(
            SoulEvent("episodic_narrative", {"user_id": row["id"]}, user_id=row["id"], source="cron")
        )
        done += 1
    return {"consolidated": done}


@router.get("/status")
async def system_status():
    now = datetime.now(timezone.utc)
    engines = [
        "identity", "memory", "reflection", "relationship", "curiosity", "world_model", "self_model",
        "proactive", "dreaming", "energy", "cognitive_load", "context_awareness", "internal_state", "ai_gateway",
    ]
    out = {"ok": True, "engines": engines, "engines_count": len(engines), "last_heartbeat_sec_ago": None}
    try:
        from app.infrastructure.database.supabase_client import get_db

        db = get_db()
        for table in ("twin_internal_states", "twin_internal_state"):
            try:
                result = db.table(table).select("updated_at").order("updated_at", desc=True).limit(1).execute()
                if result.data:
                    timestamp = result.data[0].get("updated_at")
                    if timestamp:
                        out["last_heartbeat_sec_ago"] = int(
                            (now - datetime.fromisoformat(timestamp.replace("Z", "+00:00"))).total_seconds()
                        )
                    break
            except Exception:
                continue
    except Exception as exc:
        logger.warning("System status heartbeat unavailable: %s", type(exc).__name__)
        out["heartbeat_error"] = "unavailable"
    return out


@router.get("/snapshot")
async def user_snapshot(
    user_id: Optional[str] = Query(None, min_length=1, max_length=128),
    authenticated_user_id: str = Depends(get_current_user_id),
):
    """Return only the caller's state; never trust a caller-selected identity."""
    if user_id is not None and user_id != authenticated_user_id:
        # Use a uniform not-found response to avoid confirming another account.
        raise HTTPException(status_code=404, detail="Snapshot not found")

    out = {"ok": True, "state": None}
    try:
        from app.infrastructure.database.supabase_client import get_db

        db = get_db()
        query_errors = 0
        for table in ("twin_internal_states", "twin_internal_state"):
            try:
                result = (
                    db.table(table)
                    .select("*")
                    .eq("user_id", authenticated_user_id)
                    .limit(1)
                    .execute()
                )
                if result.data:
                    out["state"] = result.data[0]
                    break
            except Exception as exc:
                query_errors += 1
                logger.warning("Snapshot query failed for %s: %s", table, type(exc).__name__)
        if out["state"] is None and query_errors == 2:
            raise HTTPException(status_code=503, detail="Snapshot temporarily unavailable")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Snapshot unavailable: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Snapshot temporarily unavailable") from exc
    return out
