from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from app.infrastructure.database.supabase_client import get_db
import random, string, logging

logger = logging.getLogger("referral")
router = APIRouter(prefix="/api/referral", tags=["referral"])

# ─── تابع مساعد (مؤقت) لاستخراج user_id من الطلب ───
async def get_current_user_id(user_id: str = Query(...)):
    return user_id

class ReferralRequest(BaseModel):
    user_id: str

@router.post("/generate")
async def generate(req: ReferralRequest):
    db = get_db()
    code = 'TWIN-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    # تخزين الكود في قاعدة البيانات
    try:
        db.table("referral_codes").insert({
            "user_id": req.user_id,
            "code": code,
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to store referral code: {e}")
    return {"code": code}

@router.post("/use")
async def use_referral_code(
    user_id: str = Depends(get_current_user_id),
    code: str = Query(..., min_length=3),
):
    db = get_db()
    try:
        referrer = db.table("referral_codes").select("user_id").eq("code", code.upper()).single().execute()
        if not referrer.data:
            raise HTTPException(404, "الكود غير صالح")

        referrer_id = referrer.data["user_id"]
        now = datetime.now(timezone.utc).isoformat()
        
        db.table("referral_rewards").insert({
            "user_id": referrer_id,
            "type": "points",
            "amount": 100,
            "description": f"إحالة جديدة: {user_id}",
            "created_at": now,
        }).execute()
        
        db.table("referral_rewards").insert({
            "user_id": user_id,
            "type": "messages",
            "amount": 10,
            "description": "مكافأة استخدام كود إحالة",
            "created_at": now,
        }).execute()
        
        return {"success": True, "message": "تم تفعيل الكود"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Referral use failed: {e}")
        raise HTTPException(500, "فشل استخدام الكود")

@router.get("/rewards")
async def get_rewards(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    try:
        rewards = db.table("referral_rewards").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(20).execute()
        return {"rewards": rewards.data or []}
    except Exception as e:
        return {"rewards": [], "error": str(e)}

logger.info("✅ Referral Routes initialized")
