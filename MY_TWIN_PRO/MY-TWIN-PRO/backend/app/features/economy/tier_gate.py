"""TierGate v1 — تنفيذ فعلي لقيود الباقات: لا بيانات تصريحية بعد اليوم."""
import time, logging
from fastapi import HTTPException
logger = logging.getLogger("tier_gate")
_CACHE = {}
def _pricing():
    from app.api.routes.economy_routes import PRICING
    return PRICING
def gating_for_tier(tier: str) -> dict:
    for t in _pricing():
        if t["tier"] == tier: return t["gating"]
    return _pricing()[0]["gating"]
async def get_gating(uid: str, db) -> dict:
    now = time.time(); hit = _CACHE.get(uid)
    if hit and now - hit[0] < 60: return hit[1]
    tier = "free"
    try:
        r = db.table("profiles").select("tier").eq("id", uid).single().execute()
        tier = (r.data or {}).get("tier") or "free"
    except Exception: pass
    g = gating_for_tier(tier); _CACHE[uid] = (now, g); return g
async def assert_feature(uid: str, db, key: str):
    g = await get_gating(uid, db)
    if not g.get(key, False):
        raise HTTPException(402, {"error": "UPGRADE_REQUIRED", "feature": key})
async def assert_daily_cap(uid: str, db):
    g = await get_gating(uid, db); cap = int(g.get("messages_per_day", 15))
    if cap >= 999: return
    today = time.strftime("%Y-%m-%d"); used = 0
    try:
        u = db.table("daily_usage").select("messages").eq("user_id", uid).eq("date", today).single().execute()
        used = (u.data or {}).get("messages", 0)
    except Exception: pass
    if used >= cap:
        raise HTTPException(429, {"error": "DAILY_LIMIT", "limit": cap})
async def memory_days(uid: str, db) -> int:
    g = await get_gating(uid, db); return int(g.get("memory_days", 7))
