"""
Limits Service v7.0 – متكامل مع Supabase و Tier Service
===========================================================
- حدود يومية لكل باقة (من tier_service)
- تخزين في Supabase + Redis Cache
- آمن ضد فقدان البيانات
"""
import logging
from typing import Dict, Tuple, Optional
from datetime import datetime, timezone, timedelta
from app.infrastructure.cache.cache_service import get, set as cache_set
from app.infrastructure.database.supabase_client import get_db

logger = logging.getLogger(__name__)

def _get_today() -> str:
    return datetime.now(timezone.utc).date().isoformat()

def _get_today_start() -> str:
    return datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

async def _get_db_usage(user_id: str, usage_type: str, today: str) -> int:
    """جلب الاستخدام من Supabase (مصدر دائم)"""
    try:
        db = get_db()
        res = db.table("daily_usage").select("count").eq(
            "user_id", user_id
        ).eq("usage_type", usage_type).eq("date", today).single().execute()
        if res.data:
            return res.data.get("count", 0)
        return 0
    except Exception as e:
        logger.debug(f"Failed to get db usage: {e}")
        return 0

async def _increment_db_usage(user_id: str, usage_type: str, today: str, current_count: int):
    """زيادة عداد الاستخدام في Supabase"""
    try:
        db = get_db()
        db.table("daily_usage").upsert({
            "user_id": user_id,
            "usage_type": usage_type,
            "date": today,
            "count": current_count + 1,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to increment db usage: {e}")

async def check_message_limit(uid: str, tier: str) -> Tuple[bool, int]:
    """التحقق من حد الرسائل اليومي (مع تخزين مزدوج)"""
    from app.domain.services.tier_service import get_daily_messages
    today = _get_today()
    key = f"msg:{uid}:{today}"
    
    # 1. جلب من الكاش
    used_cache = get(key)
    if used_cache is not None:
        used = used_cache
    else:
        # 2. جلب من Supabase
        used = await _get_db_usage(uid, "messages", today)
        cache_set(key, used, 86400)
    
    limit = get_daily_messages(tier)
    if limit >= 9999:  # باقة غير محدودة
        return True, 9999
    
    if used >= limit:
        return False, 0
    
    # 3. زيادة العداد
    cache_set(key, used + 1, 86400)
    await _increment_db_usage(uid, "messages", today, used)
    
    remaining = limit - used - 1
    return True, remaining


async def check_feature_usage(uid: str, tier: str, feature: str) -> Tuple[bool, int]:
    """التحقق من حد استخدام ميزة معينة"""
    from app.domain.services.tier_service import get_feature_limit, get_tier_features
    
    # 1. التحقق من صلاحية الميزة للباقة
    features = get_tier_features(tier)
    if feature in features and not features[feature]:
        return False, 0

    today = _get_today()
    key = f"feat:{uid}:{feature}:{today}"
    
    # 2. جلب من الكاش
    used_cache = get(key)
    if used_cache is not None:
        used = used_cache
    else:
        used = await _get_db_usage(uid, f"feature:{feature}", today)
        cache_set(key, used, 86400)
    
    limit = get_feature_limit(tier, feature)
    if limit >= 9999:
        return True, 9999
    
    if used >= limit:
        return False, 0
    
    # 3. زيادة العداد
    cache_set(key, used + 1, 86400)
    await _increment_db_usage(uid, f"feature:{feature}", today, used)
    
    remaining = limit - used - 1
    return True, remaining


def get_usage_summary(uid: str, tier: str) -> Dict:
    """ملخص الاستخدام اليومي (متزامن - من الكاش فقط للسرعة)"""
    from app.domain.services.tier_service import get_daily_messages, get_all_feature_limits
    today = _get_today()
    
    msg_used = get(f"msg:{uid}:{today}") or 0
    msg_limit = get_daily_messages(tier)
    
    all_feature_limits = get_all_feature_limits()
    feature_usage = {}
    for feature in all_feature_limits:
        key = f"feat:{uid}:{feature}:{today}"
        used = get(key) or 0
        limit = all_feature_limits.get(feature, {}).get(tier, 0)
        if used > 0 or limit > 0:
            feature_usage[feature] = {
                "used": used,
                "limit": limit,
                "remaining": max(0, limit - used),
            }
    
    return {
        "messages": {
            "used": msg_used,
            "limit": msg_limit,
            "remaining": max(0, msg_limit - msg_used),
        },
        "features": feature_usage,
    }


async def reset_daily_usage(user_id: str):
    """إعادة تعيين الاستخدام اليومي (تُستدعى عند منتصف الليل)"""
    today = _get_today()
    db = get_db()
    try:
        db.table("daily_usage").delete().eq("user_id", user_id).lt("date", today).execute()
        logger.debug(f"Daily usage reset for {user_id}")
    except Exception as e:
        logger.warning(f"Failed to reset daily usage: {e}")


logger.info("✅ Limits Service v7.0 initialized — Supabase + Cache")
