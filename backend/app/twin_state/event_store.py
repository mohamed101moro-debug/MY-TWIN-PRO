"""Event Store v1 — حياة التوأم سجلُّ أحداث ملحق فقط + نسخ الهوية + كاشف الأوليات."""
import logging
from typing import Dict, Any, List
from app.infrastructure.database.supabase_client import get_db
logger = logging.getLogger("event_store")

async def append_event(user_id: str, etype: str, payload: Dict[str, Any] = None) -> Dict[str, Any]:
    payload = payload or {}
    out = {"first": False, "type": etype}
    try:
        db = get_db()
        any_ev = db.table("twin_events").select("id").eq("user_id", user_id).limit(1).execute()
        if not (any_ev.data or []):
            db.table("twin_events").insert({"user_id": user_id, "type": "Genesis", "payload": {"note": "بداية وجودي"}}).execute()
        prev = db.table("twin_events").select("id").eq("user_id", user_id).eq("type", etype).limit(1).execute()
        out["first"] = not (prev.data or [])
        db.table("twin_events").insert({"user_id": user_id, "type": etype, "payload": payload}).execute()
        if out["first"]:
            db.table("twin_events").insert({"user_id": user_id, "type": f"First:{etype}", "payload": payload}).execute()
    except Exception as e:
        logger.debug(f"event_store: {e}")
    return out

async def bump_identity(user_id: str, trigger: str, summary: str = "") -> None:
    try:
        db = get_db()
        last = db.table("identity_versions").select("version").eq("user_id", user_id).order("version", desc=True).limit(1).execute()
        v = ((last.data or [{}])[0].get("version") or 0) + 1
        db.table("identity_versions").insert({"user_id": user_id, "version": v, "trigger_kind": trigger, "summary": summary}).execute()
    except Exception as e:
        logger.debug(f"identity_version: {e}")

async def get_timeline(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    try:
        r = get_db().table("twin_events").select("type,payload,ts").eq("user_id", user_id).order("ts", desc=True).limit(limit).execute()
        return r.data or []
    except Exception:
        return []

async def counts(user_id: str) -> Dict[str, int]:
    try:
        r = get_db().table("twin_events").select("type").eq("user_id", user_id).execute()
        c: Dict[str, int] = {}
        for row in (r.data or []): c[row["type"]] = c.get(row["type"], 0) + 1
        return c
    except Exception:
        return {}

async def narrative(user_id: str) -> str:
    c = await counts(user_id)
    exp = c.get("Experience", 0); mist = c.get("PredictionFailed", 0); bel = c.get("BeliefUpdated", 0)
    firsts = [k for k in c if k.startswith("First:")]
    parts = [f"مررنا معًا بـ{exp} تجربة"]
    if mist: parts.append(f"تعلّمتُ من {mist} خطأ")
    if bel: parts.append(f"حدّثتُ {bel} معتقدًا عنك")
    parts.append(f"وأحتفظ بـ{len(firsts)} لحظة «أول مرة»")
    return "، ".join(parts) + "."
