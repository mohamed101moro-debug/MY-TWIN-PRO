"""
Ad Service v3.0 – خدمة الإعلانات + استعادة الطاقة
"""
from datetime import datetime, timezone, timedelta
from app.infrastructure.database.supabase_client import get_db
import logging

logger = logging.getLogger("ad_service")

DAILY_AD_LIMIT = 5
ENERGY_RESTORE_PER_AD = 0.20

async def claim_ad_reward(user_id: str, ad_type: str = "rewarded", ad_platform: str = "google", pass_duration_minutes: int = 60) -> dict:
    db = get_db()
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    res = db.table("ad_views").select("*").eq("user_id", user_id).gte("created_at", today_start).execute()
    watched_today = len(res.data) if res.data else 0

    if watched_today >= DAILY_AD_LIMIT:
        return {"success": False, "message": "لقد وصلت للحد الأقصى اليومي للإعلانات"}

    db.table("ad_views").insert({
        "user_id": user_id, "ad_type": ad_type, "ad_platform": ad_platform, "created_at": now.isoformat(),
    }).execute()

    pass_expires_at = (now + timedelta(minutes=pass_duration_minutes)).isoformat()
    db.table("user_explorer_passes").upsert({
        "user_id": user_id, "active": True, "expires_at": pass_expires_at, "updated_at": now.isoformat(),
    }).execute()

    # ✅ استعادة طاقة الكيان
    energy_restored = False
    new_energy = None
    try:
        from app.engine.energy.twin_energy_engine import twin_energy_engine
        new_state = await twin_energy_engine.restore_energy(
            user_id=user_id, amount=ENERGY_RESTORE_PER_AD, source="ad_reward"
        )
        energy_restored = True
        new_energy = new_state.get("energy", 0)
        logger.info(f"⚡ طاقة {user_id} استعيدت من إعلان: +{ENERGY_RESTORE_PER_AD*100:.0f}%")
    except Exception as e:
        logger.warning(f"فشل استعادة الطاقة من الإعلان: {e}")

    return {
        "success": True,
        "message": f"تمت استعادة {ENERGY_RESTORE_PER_AD*100:.0f}% طاقة + Explorer Pass",
        "explorer_pass_duration": pass_duration_minutes,
        "explorer_pass_expires_at": pass_expires_at,
        "energy_restored": ENERGY_RESTORE_PER_AD if energy_restored else 0,
        "current_energy": new_energy,
        "remaining_ads": DAILY_AD_LIMIT - watched_today - 1,
    }

async def get_ad_status(user_id: str) -> dict:
    db = get_db()
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    res = db.table("ad_views").select("*").eq("user_id", user_id).gte("created_at", today_start).execute()
    watched_today = len(res.data) if res.data else 0

    pass_res = db.table("user_explorer_passes").select("*").eq("user_id", user_id).eq("active", True).execute()
    pass_active = False
    pass_expires_at = None
    if pass_res.data:
        for p in pass_res.data:
            if p.get("expires_at") and p.get("expires_at") > now.isoformat():
                pass_active = True
                pass_expires_at = p["expires_at"]
                break

    # الباقة الفعلية
    try:
        from app.infrastructure.database.supabase_client import get_db
        db = get_db()
        profile = db.table("profiles").select("tier").eq("id", user_id).single().execute()
        user_tier = profile.data.get("tier", "free") if profile.data else "free"
    except:
        user_tier = "free"

    is_ads_required = user_tier == "free"

    # طاقة الكيان
    try:
        from app.engine.energy.twin_energy_engine import twin_energy_engine
        energy_state = await twin_energy_engine.get_state(user_id)
        current_energy = energy_state.get("energy", 0.7)
        is_low_energy = energy_state.get("is_low_energy", False)
    except:
        current_energy = 0.7
        is_low_energy = False

    return {
        "watched_today": watched_today,
        "daily_limit": DAILY_AD_LIMIT,
        "can_watch_more": watched_today < DAILY_AD_LIMIT,
        "explorer_pass_active": pass_active,
        "explorer_pass_expires_at": pass_expires_at,
        "tier": user_tier,
        "ads_required": is_ads_required,
        "energy_per_ad": ENERGY_RESTORE_PER_AD,
        "current_energy": current_energy,
        "is_low_energy": is_low_energy,
    }

logger.info("✅ Ad Service v3.0 initialized with energy integration")
