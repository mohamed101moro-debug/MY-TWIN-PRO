"""Constitution Drift v1 — دستور حي: أوزان منجرفة + سجل تغييرات + «الصدق» ثابت لا يُمس."""
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
logger = logging.getLogger("constitution_drift")
DEFAULT_WEIGHTS = {"honesty": 1.0, "empathy": 0.6, "playfulness": 0.4, "protectiveness": 0.5, "autonomy": 0.3}
IMMUTABLE = {"honesty": 1.0}
def _clamp(v: float) -> float: return max(0.2, min(0.9, v))
async def get_weights(user_id: str) -> Dict[str, Any]:
    from app.twin_state.event_store import get_timeline
    evs = await get_timeline(user_id, 60)
    snap = next((e for e in evs if e["type"] == "ConstitutionSnapshot"), None)
    w = dict(DEFAULT_WEIGHTS); last_ts = None
    if snap:
        w.update((snap.get("payload") or {}).get("weights") or {}); last_ts = snap.get("ts")
        try: age = (datetime.now(timezone.utc) - datetime.fromisoformat(last_ts)).days
        except Exception: age = 0
        if age >= 7: w = await drift(user_id, w)
    return {"weights": w, "immutable": list(IMMUTABLE), "last_snapshot": last_ts}
async def drift(user_id: str, weights: Dict[str, float]) -> Dict[str, float]:
    from app.twin_state.event_store import get_timeline, append_event
    evs = await get_timeline(user_id, 100)
    joys = sum(1 for e in evs if (e.get("payload") or {}).get("emotion") in ("joy", "love"))
    sads = sum(1 for e in evs if (e.get("payload") or {}).get("emotion") in ("sadness", "fear"))
    w = dict(weights)
    w["playfulness"] = _clamp(w.get("playfulness", 0.4) + 0.03 * min(3, joys))
    w["empathy"] = _clamp(w.get("empathy", 0.6) + 0.03 * min(3, sads))
    w.update(IMMUTABLE)
    changelog = [{"principle": k, "from": round(weights.get(k, 0), 2), "to": round(w[k], 2)}
                 for k in ("playfulness", "empathy") if abs(w[k] - weights.get(k, w[k])) > 1e-9]
    await append_event(user_id, "ConstitutionSnapshot", {"weights": w, "changelog": changelog})
    return w
async def changelog(user_id: str) -> List[Dict[str, Any]]:
    from app.twin_state.event_store import get_timeline
    evs = await get_timeline(user_id, 200)
    return [{"ts": e["ts"], "changes": (e.get("payload") or {}).get("changelog") or []}
            for e in evs if e["type"] == "ConstitutionSnapshot" and (e.get("payload") or {}).get("changelog")][:10]
