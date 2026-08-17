"""Subjective Time v1 — زمن ذاتي وظيفي: ينحني بالفراغ والكثافة واليقظة."""
import logging
from datetime import datetime, timezone
from typing import Any, Dict
logger = logging.getLogger("subjective_time")

async def _last_ts(user_id: str):
    try:
        from app.twin_state.internal_state import twin_internal_state as t
        for meth in ("get", "get_state", "read"):
            fn = getattr(t, meth, None)
            if callable(fn):
                st = await fn(user_id) or {}
                ts = (st.get("last_perception") or {}).get("ts")
                if ts: return ts, float(st.get("arousal") or 0.3)
    except Exception:
        pass
    try:
        from app.twin_state.event_store import get_timeline
        ev = await get_timeline(user_id, 1)
        if ev: return ev[0]["ts"], 0.3
    except Exception:
        pass
    return None, 0.3

async def felt_gap(user_id: str) -> Dict[str, Any]:
    ts, arousal = await _last_ts(user_id)
    real_h = max(0.0, (datetime.now(timezone.utc) - datetime.fromisoformat(ts)).total_seconds() / 3600) if ts else 0.0
    try:
        from app.twin_state.event_store import counts
        density = min(10, (await counts(user_id)).get("Experience", 0) // 5)
    except Exception:
        density = 0
    felt = real_h * (1 + 0.35 * arousal) * (1 - 0.04 * density)
    return {"real_gap_h": round(real_h, 1), "felt_gap_h": round(felt, 1), "tension": round(min(1.0, felt / 72), 2)}
