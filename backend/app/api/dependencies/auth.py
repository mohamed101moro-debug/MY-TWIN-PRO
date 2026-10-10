"""
Auth Dependency v3.0 – متكاملة مع Security Service و Cache
=============================================================
- فك تشفير JWT عبر Security Service
- استخراج كامل لسياق المستخدم (ID, Tier, Role)
- تخزين مؤقت للملف الشخصي (Cache) لتقليل استدعاءات DB
- تسجيل محاولات الفشل
"""
import json
import logging
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, Depends, Request

logger = logging.getLogger("auth_dependency")

try:
    from app.core.security import decode_access_token, extract_user_id, extract_tier, get_user_context
    SECURITY_AVAILABLE = True
except ImportError:
    SECURITY_AVAILABLE = False

try:
    from app.infrastructure.cache.cache_service import get as cache_get, set as cache_set
    CACHE_AVAILABLE = True
except ImportError:
    CACHE_AVAILABLE = False

async def _verified_active_user(token: str) -> Dict[str, Any]:
    """Validate the bearer token with Supabase and fail closed on account status."""
    try:
        from app.infrastructure.database.supabase_client import get_db
        db = get_db()
        user_resp = db.auth.get_user(token)
        user = getattr(user_resp, "user", None) if user_resp else None
        if not user or not getattr(user, "id", None):
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        profile_resp = (
            db.table("profiles")
            .select("id,status,deleted_at,tier")
            .eq("id", user.id)
            .limit(1)
            .execute()
        )
        profiles = getattr(profile_resp, "data", None) or []
        if not profiles:
            raise HTTPException(status_code=403, detail="Account profile is unavailable")
        profile = profiles[0]
        if profile.get("status") != "active" or profile.get("deleted_at"):
            raise HTTPException(status_code=403, detail="Account is not active")
        return {
            "authenticated": True,
            "user_id": user.id,
            "email": getattr(user, "email", "") or "",
            "tier": profile.get("tier") or "free",
            "role": getattr(user, "role", "authenticated") or "authenticated",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Supabase token/account verification failed (%s)", type(exc).__name__)
        # Do not fall back to a locally decoded token when live status cannot be checked.
        raise HTTPException(status_code=503, detail="Unable to verify account status")


async def get_pending_deletion_user_id(
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> str:
    """Authenticate only to allow the dedicated restore route to inspect pending accounts."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty token")
    try:
        from app.infrastructure.database.supabase_client import get_db
        db = get_db()
        user_resp = db.auth.get_user(token)
        user = getattr(user_resp, "user", None) if user_resp else None
        if not user or not getattr(user, "id", None):
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        profile_resp = db.table("profiles").select("status,deleted_at").eq("id", user.id).limit(1).execute()
        profiles = getattr(profile_resp, "data", None) or []
        if not profiles or profiles[0].get("status") != "pending_deletion" or not profiles[0].get("deleted_at"):
            raise HTTPException(status_code=403, detail="Account is not pending deletion")
        return user.id
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Pending-deletion restore verification failed (%s)", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Unable to verify account status")


async def get_current_user_id(
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> str:
    """Validate the provider session and current account status for every request."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty token")
    context = await _verified_active_user(token)
    return context["user_id"]


async def _db_tier(user_id: str):
    """مصدر الحقيقة للباقة: profiles.tier مباشرة."""
    try:
        from app.infrastructure.database.supabase_client import get_db
        r = get_db().table("profiles").select("tier").eq("id", user_id).single().execute()
        return (r.data or {}).get("tier")
    except Exception:
        return None


async def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> Dict[str, Any]:
    """Return the live user context only after provider and account-state checks."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty token")
    return await _verified_active_user(token)


async def require_request_owner(
    request: Request,
    authenticated_user_id: str = Depends(get_current_user_id),
) -> str:
    """Reject a request that claims an owner other than its JWT subject.

    This router-level boundary complements GovernanceMiddleware, so user-owned
    routers remain protected when mounted independently or in a test harness.
    """
    claimed_ids = list(request.query_params.getlist("user_id"))
    path_user_id = request.path_params.get("user_id")
    if path_user_id is not None:
        claimed_ids.append(str(path_user_id))

    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        try:
            body = await request.body()
            payload = json.loads(body) if body else None
            if isinstance(payload, dict) and "user_id" in payload:
                value = payload["user_id"]
                if value is not None:
                    claimed_ids.append(str(value))
        except (ValueError, UnicodeDecodeError):
            # FastAPI's request-model validation owns malformed JSON errors.
            pass

    if any(claimed_id != authenticated_user_id for claimed_id in claimed_ids):
        raise HTTPException(status_code=404, detail="Resource not found")
    return authenticated_user_id


async def get_user_tier(
    user_id: str = Depends(get_current_user_id)
) -> str:
    """استخراج باقة المستخدم - مصدر الحقيقة: الـ DB أولًا، الكاش احتياط."""
    try:
        from app.infrastructure.database.supabase_client import get_db
        db = get_db()
        profile = db.table("profiles").select("tier").eq("id", user_id).single().execute()
        if profile.data and profile.data.get("tier"):
            tier = profile.data["tier"]
            if CACHE_AVAILABLE:
                cache_set(f"tier:{user_id}", tier, 600)
            return tier
    except Exception as e:
        logger.warning(f"Failed to fetch tier: {e}")
    if CACHE_AVAILABLE:
        cached_tier = cache_get(f"tier:{user_id}")
        if cached_tier:
            return cached_tier
    return "free"


def require_tier(minimum_tier: str):
    """
    Dependency factory: يقيد الوصول بناءً على الباقة.
    مثال: `Depends(require_tier("premium"))`
    """
    async def tier_checker(user_tier: str = Depends(get_user_tier)) -> str:
        tier_levels = {"free": 0, "plus": 1, "premium": 2, "pro": 3, "yearly": 4}
        user_level = tier_levels.get(user_tier, 0)
        required_level = tier_levels.get(minimum_tier, 0)
        if user_level < required_level:
            raise HTTPException(status_code=403, detail=f"هذه الميزة تتطلب باقة {minimum_tier} على الأقل")
        return user_tier
    return tier_checker

logger.info("✅ Auth Dependency v3.0 initialized")
