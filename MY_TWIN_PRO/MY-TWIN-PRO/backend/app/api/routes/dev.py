"""
Development Routes v2.0 – اختبار متقدم
=========================================
- إنشاء مستخدم اختبار
- جلب إحصائيات الذاكرة (TCMA)
- فحص حالة النظام الداخلية
"""
import os, logging
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.infrastructure.database.supabase_client import get_db

logger = logging.getLogger("dev_routes")
router = APIRouter(prefix="/api/dev", tags=["dev"])

DEV_SECRET = os.getenv("DEV_SECRET", "devsecret123")

class DevTokenRequest(BaseModel):
    secret: str 
    email: str 
    password: str 

@router.post("/token")
async def get_dev_token(body: DevTokenRequest):
    """إنشاء أو تسجيل دخول مستخدم اختبار"""
    if body.secret != DEV_SECRET:
        raise HTTPException(403, "Wrong dev secret")
    
    db = get_db()
    try:
        result = db.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })
        if result.user and result.session:
            return {"token": result.session.access_token, "user_id": result.user.id, "created": False}
    except:
        pass
    
    try:
        result = db.auth.sign_up({
            "email": body.email,
            "password": body.password,
        })
        if result.user and result.session:
            db.table("profiles").insert({
                "id": result.user.id,
                "email": body.email,
                "full_name": "Test User",
                "twin_name": "توأمي",
                "lang": "ar",
                "tier": "free",
                "onboarded": True,
            }).execute()
            return {"token": result.session.access_token, "user_id": result.user.id, "created": True}
    except Exception as e:
        raise HTTPException(500, f"Failed: {e}")
    
    raise HTTPException(500, "Could not create or login user")

@router.get("/memory-stats")
async def get_memory_stats(user_id: str):
    """جلب إحصائيات الذاكرة (للتطوير فقط)"""
    from app.infrastructure.cache.memory_cleanup_service import get_storage_stats
    stats = await get_storage_stats()
    return {"user_id": user_id, "tcma_tables": stats}

@router.get("/test-tcma")
async def test_tcma(user_id: str):
    """اختبار طبقات TCMA"""
    results = {}
    # Emotional memory
    try:
        from app.memory.emotional.emotional_memory import get_emotional_patterns
        patterns = await get_emotional_patterns(user_id, days=7)
        results["emotional"] = patterns
    except Exception as e:
        results["emotional"] = str(e)
    # Identity
    try:
        from app.memory.identity.identity_model import get_identity
        identity = await get_identity(user_id)
        results["identity"] = identity
    except Exception as e:
        results["identity"] = str(e)
    return results

@router.post("/unlock-tier")
async def unlock_tier(body: dict):
    if body.get("secret") != os.getenv("DEV_SECRET", "devsecret123"):
        raise HTTPException(403, "Wrong dev secret")
    get_db().table("profiles").update({"tier": body.get("tier", "yearly")}).eq("id", body["user_id"]).execute()
    try:
        from app.api.dependencies.auth import invalidate_tier_cache
        await invalidate_tier_cache(body["user_id"], body.get("tier", "yearly"))
    except Exception:
        pass
    # ✅ مزامنة user_metadata حتى تحمل التوكنات الجديدة الباقة الصحيحة
    try:
        db = get_db()
        db.auth.admin.update_user_by_id(body["user_id"], {"user_metadata": {"tier": body.get("tier", "yearly")}})
    except Exception:
        try:
            db.auth.admin.update_user_by_id(body["user_id"], {"data": {"tier": body.get("tier", "yearly")}})
        except Exception:
            pass
    return {"status": "ok", "tier": body.get("tier", "yearly")}

@router.get("/tier-check")
async def tier_check(user_id: str):
    """تشخيص: ما الباقة المخزنة فعليًا؟"""
    from app.infrastructure.database.supabase_client import get_db
    r = get_db().table("profiles").select("tier").eq("id", user_id).single().execute()
    return {"user_id": user_id, "db_tier": (r.data or {}).get("tier")}

@router.get("/tier-trace")
async def tier_trace(user_id: str, authorization: str = Header(None, alias="Authorization")):
    from app.api.dependencies.auth import get_user_tier, get_current_user
    out = {"user_id": user_id}
    try:
        from app.infrastructure.database.supabase_client import get_db
        r = get_db().table("profiles").select("tier").eq("id", user_id).single().execute()
        out["db_tier"] = (r.data or {}).get("tier")
    except Exception as e: out["db_tier"] = f"err:{e}"
    try: out["dep_tier"] = await get_user_tier(user_id)
    except Exception as e: out["dep_tier"] = f"err:{e}"
    if authorization:
        try:
            ctx = await get_current_user(authorization)
            out["context_tier"] = ctx.get("tier")
        except Exception as e: out["context_tier"] = f"err:{e}"
    return out

@router.get("/events-test")
async def events_test(user_id: str):
    """تشخيص مباشر: هل twin_events حيّ؟ يُظهر الخطأ صريحًا."""
    from app.infrastructure.database.supabase_client import get_db
    try:
        r = get_db().table("twin_events").insert({"user_id": user_id, "type": "DevTest", "payload": {"note": "ping"}}).execute()
        n = get_db().table("twin_events").select("type").eq("user_id", user_id).execute()
        return {"ok": True, "inserted": len(r.data or []), "total": len(n.data or [])}
    except Exception as e:
        return {"ok": False, "error": str(e)[:300]}

@router.get("/belief-test")
async def belief_test(user_id: str):
    """تشخيص صريح: ينفذ مسار المعتقدات ويُظهر أي استثناء بدل ابتلاعه."""
    from app.twin_state.belief_system import belief_system
    out = {}
    try:
        out["recorded"] = await belief_system.record_evidence(user_id, "التشخيص المباشر يعمل", origin="diag")
    except Exception as e:
        out["record_error"] = f"{type(e).__name__}: {str(e)[:200]}"
    try:
        out["beliefs"] = await belief_system.get_beliefs(user_id)
    except Exception as e:
        out["load_error"] = f"{type(e).__name__}: {str(e)[:200]}"
    return out

@router.get("/predict-test")
async def predict_test(user_id: str):
    from app.twin_state.prediction_engine import prediction_engine
    return {"prediction": await prediction_engine.predict_tomorrow(user_id)}

@router.get("/ist-test")
async def ist_test(user_id: str):
    """تشخيص نهائي لـ twin_internal_states: يظهر أي خطأ صريحًا."""
    from app.infrastructure.database.supabase_client import get_db
    out = {}
    try:
        r = get_db().table("twin_internal_states").select("user_id").eq("user_id", user_id).maybe_single().execute()
        out["select"] = "row" if r.data else "no_row"
    except Exception as e:
        out["select_error"] = str(e)[:200]
    try:
        get_db().table("twin_internal_states").upsert({"user_id": user_id}, on_conflict="user_id").execute()
        out["upsert"] = "ok"
    except Exception as e:
        out["upsert_error"] = str(e)[:200]
    return out
