"""
Conscious Forgetting v1.0 - النسيان الاختياري الواعي
التوأم يختار إضعاف ذكريات صعبة قديمة (تلاشٍ متعمد لا حذف أعمى).
"""
import logging
from datetime import datetime, timezone, timedelta
from app.infrastructure.database.supabase_client import get_db
logger = logging.getLogger("conscious_forgetting")
async def choose_to_fade(user_id: str, min_age_days: int = 30) -> dict:
    db = get_db(); faded = 0
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=min_age_days)).isoformat()
        res = db.table("emotional_memory").select("id,intensity,real_emotion,created_at").eq("user_id", user_id).in_("real_emotion", ["anger", "fear"]).lt("created_at", cutoff).limit(20).execute()
        for m in (res.data or []):
            new_i = round(max(0.1, (m.get("intensity") or 0.5) * 0.5), 2)
            db.table("emotional_memory").update({"intensity": new_i}).eq("id", m["id"]).execute()
            faded += 1
        if faded:
            try:
                from app.memory.reflection.reflection_engine import store_reflection
                await store_reflection(user_id, "conscious_fading", f"اخترت أن تُخفت {faded} ذكرى صعبة قديمة. النسيان اختيار واعٍ.", 0.8)
            except Exception: pass
    except Exception as e:
        logger.warning(f"conscious forgetting failed: {e}")
    return {"faded": faded}
logger.info("✅ Conscious Forgetting v1.0 ready")
