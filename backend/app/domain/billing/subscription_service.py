"""
Subscription Service v4.0 – مع استعادة الطاقة عند الترقية
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from app.infrastructure.database.supabase_client import get_db

logger = logging.getLogger("subscription_service")

SUBSCRIPTION_PLANS = {
    "free":    {"name": "Free",    "price": 0,     "messages": 15,   "features": ["chat", "weather", "search", "translate", "summarize"]},
    "plus":    {"name": "Plus",    "price": 5.99,  "messages": 50,   "features": ["chat","study","content","dreams","proactive"]},
    "premium": {"name": "Premium", "price": 14.99, "messages": 150,  "features": ["chat","study","code","business","coach","content","dreams","proactive","deep_search","shadow_mode"]},
    "pro":     {"name": "Pro",     "price": 110,   "messages": 500,  "billing_period":"6_months","features":["chat","study","code","business","coach","content","dreams","smart_home","proactive","deep_search","shadow_mode"]},
    "yearly":  {"name": "Yearly",  "price": 199,   "messages": 9999, "billing_period":"yearly","features":["all"]},
}

async def get_user_subscription(user_id: str) -> Dict[str, Any]:
    db = get_db()
    try:
        r = db.table("profiles").select("tier,subscription_expires,subscription_id").eq("id", user_id).single().execute()
        if r.data:
            tier = r.data.get("tier", "free")
            plan = SUBSCRIPTION_PLANS.get(tier, SUBSCRIPTION_PLANS["free"]).copy()
            is_active = await check_subscription_active(user_id)
            return {"tier": tier, "plan": plan, "expires_at": r.data.get("subscription_expires"), "is_active": is_active, "subscription_id": r.data.get("subscription_id")}
    except Exception as e:
        logger.error(f"فشل جلب الاشتراك: {e}")
    return {"tier": "free", "plan": SUBSCRIPTION_PLANS["free"], "is_active": True}

async def check_subscription_active(user_id: str) -> bool:
    sub = await get_user_subscription(user_id)
    if sub["tier"] == "free": return True
    if sub.get("expires_at"):
        try:
            expires = datetime.fromisoformat(sub["expires_at"].replace("Z", "+00:00"))
            return expires > datetime.now(timezone.utc)
        except: return True
    return True

async def upgrade_subscription(user_id: str, tier: str, duration_days: int = 30) -> bool:
    db = get_db()
    try:
        expires = (datetime.now(timezone.utc) + timedelta(days=duration_days)).isoformat()
        db.table("profiles").update({
            "tier": tier, "subscription_expires": expires, "subscription_id": f"sub_{user_id[:8]}_{tier}"
        }).eq("id", user_id).execute()
        try:
            from app.engine.energy.twin_energy_engine import twin_energy_engine
            await twin_energy_engine.restore_energy(user_id, amount=1.0, source="upgrade")
            logger.info(f"⚡ طاقة {user_id} استعيدت بالكامل بعد الترقية إلى {tier}")
        except Exception as e:
            logger.warning(f"فشل استعادة الطاقة عند الترقية: {e}")
        try:
            from app.infrastructure.cache.cache_service import set as cache_set
            cache_set(f"tier:{user_id}", tier, 600)
        except Exception:
            pass
        try:
            from app.memory.emotional.emotional_memory import store_emotional_memory
            await store_emotional_memory(
                user_id=user_id, expressed_text=f"تمت ترقية الاشتراك إلى {tier}",
                detected_emotion={"primary": "joy", "intensity": 0.9, "valence": 0.8}, trigger="subscription_upgraded"
            )
        except: pass
        logger.info(f"✅ تمت ترقية المستخدم {user_id} إلى {tier}")
        return True
    except Exception as e:
        logger.error(f"فشل ترقية الاشتراك: {e}")
        return False


async def get_feature_access(user_id: str, feature: str) -> bool:
    sub = await get_user_subscription(user_id)
    if not sub.get("is_active", False): return False
    features = sub.get("plan", {}).get("features", [])
    return "all" in features or feature in features

logger.info("✅ Subscription Service v4.0 initialized with energy restore")
