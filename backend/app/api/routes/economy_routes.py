"""Economy Routes v3 — تسعير استراتيجي + فلسفة التدرج العلائقي"""
import logging, time
from fastapi import APIRouter, Depends, HTTPException
from app.infrastructure.database.supabase_client import get_db
try:
    from app.api.dependencies.auth import get_current_user_id
except Exception:
    from app.api.dependencies.auth import get_user_id as get_current_user_id
logger = logging.getLogger("economy_routes")
router = APIRouter(prefix="/api/economy", tags=["economy"])
PRICING = [
    {
        "tier": "free",
        "name_ar": "مجاني",
        "name_en": "Free",
        "price": 0,
        "period": "forever",
        "philosophy": "أعرفك",
        "philosophy_en": "Getting to know you",
        "features": [
            "15 رسالة/يوم",
            "محادثات أساسية بلا إعلانات طرف ثالث",
            "صوت عصبي مجاني (Edge TTS)",
            "ذاكرة أساسية (7 أيام)",
            "Inner Life أساسي",
            "Soul Observatory محدود"
        ],
        "features_en": [
            "15 messages per day", "Basic conversations without third-party ads",
            "Neural voice (Edge TTS)", "Basic memory (7 days)", "Basic Inner Life", "Limited Soul Observatory"
        ],
        "gating": {
            "messages_per_day": 15,
            "memory_days": 7,
            "voice_provider": "edge-tts",
            "vision_enabled": False,
            "dreams_enabled": False,
            "prediction_enabled": False,
            "proactive_enabled": False,
            "ads_in_chat": False,
            "priority_inference": False,
        }
    },
    {
        "tier": "plus",
        "name_ar": "بلس",
        "name_en": "Plus",
        "price": 5.99,
        "period": "month",
        "philosophy": "أتذكرك",
        "philosophy_en": "Remembering you",
        "features": [
            "بدون إعلانات داخل المحادثة",
            "50 رسالة/يوم",
            "صوت عصبي مجاني",
            "ذاكرة أعمق (30 يوم)",
            "Rituals يومية",
            "Presence محسّنة"
        ],
        "features_en": [
            "No ads inside conversations", "50 messages per day", "Neural voice (Edge TTS)",
            "Deeper memory (30 days)", "Daily rituals", "Enhanced Presence"
        ],
        "gating": {
            "messages_per_day": 50,
            "memory_days": 30,
            "voice_provider": "edge-tts",
            "vision_enabled": False,
            "dreams_enabled": False,
            "prediction_enabled": False,
            "proactive_enabled": False,
            "ads_in_chat": False,
            "priority_inference": False,
        }
    },
    {
        "tier": "premium",
        "name_ar": "بريميوم",
        "name_en": "Premium",
        "price": 14.99,
        "period": "month",
        "philosophy": "أفهمك",
        "philosophy_en": "Understanding you",
        "features": [
            "رسائل غير محدودة",
            "تنبؤات سلوكية",
            "تحليل أحلام",
            "ذاكرة عميقة (90 يوم)",
            "تفاعل استباقي",
            "Inner Life متقدم"
        ],
        "features_en": [
            "Up to 999 messages per day", "Behavioral predictions", "Dream analysis", "Deep memory (90 days)",
            "Proactive interaction", "Advanced Inner Life"
        ],
        "gating": {
            "messages_per_day": 999,
            "memory_days": 90,
            "voice_provider": "elevenlabs",
            "vision_enabled": False,
            "dreams_enabled": True,
            "prediction_enabled": True,
            "proactive_enabled": True,
            "ads_in_chat": False,
            "priority_inference": False,
        }
    },
    {
        "tier": "pro",
        "name_ar": "برو",
        "name_en": "Pro",
        "price": 89.99,
        "period": "6months",
        "philosophy": "أعيش معك",
        "philosophy_en": "Living alongside you",
        "features": [
            "كل مزايا Premium",
            "ذاكرة غير محدودة",
            "أولوية استدلال AI",
            "تنبؤات متقدمة",
            "استقلالية متقدمة",
            "Inner Life عميق جدًا",
            "ميزات تجريبية مستقبلية",
            "أقل قيود استخدام"
        ],
        "features_en": [
            "All Premium features", "Long-term memory allowance", "Priority AI inference",
            "Advanced predictions", "Advanced autonomy", "Very deep Inner Life",
            "Early access to upcoming features", "Fewer usage limits"
        ],
        "gating": {
            "messages_per_day": 9999,
            "memory_days": 9999,
            "voice_provider": "elevenlabs",
            "vision_enabled": False,
            "dreams_enabled": True,
            "prediction_enabled": True,
            "proactive_enabled": True,
            "ads_in_chat": False,
            "priority_inference": True,
        }
    },
    {
        "tier": "yearly",
        "name_ar": "سنوي",
        "name_en": "Yearly",
        "price": 149.99,
        "period": "year",
        "philosophy": "Best Value",
        "philosophy_en": "Best value",
        "equivalent_monthly": 12.50,
        "features": [
            "كل مزايا Premium",
            "سنة كاملة بسعر موسم",
            "خصم 16.6% (وفّر $29.89)",
            "ميزات مبكرة"
        ],
        "features_en": [
            "All Premium features", "One year at a seasonal price", "16.6% discount (save $29.89)", "Early access to features"
        ],
        "gating": {
            "messages_per_day": 999,
            "memory_days": 90,
            "voice_provider": "elevenlabs",
            "vision_enabled": False,
            "dreams_enabled": True,
            "prediction_enabled": True,
            "proactive_enabled": True,
            "ads_in_chat": False,
            "priority_inference": False,
        }
    },
]

@router.get("/pricing")
async def pricing():
    return {"catalog": PRICING}

@router.get("/overview")
async def overview(uid: str = Depends(get_current_user_id)):
    db = get_db(); tier = "free"; ref = ""
    try:
        p = db.table("profiles").select("tier,referral_code").eq("id", uid).single().execute()
        tier = (p.data or {}).get("tier") or "free"; ref = (p.data or {}).get("referral_code") or ""
    except Exception: pass
    today = time.strftime("%Y-%m-%d"); used = 0
    try:
        u = db.table("daily_usage").select("messages").eq("user_id", uid).eq("date", today).single().execute()
        used = (u.data or {}).get("messages", 0)
    except Exception: pass
    current_tier = next((t for t in PRICING if t["tier"] == tier), PRICING[0])
    return {
        "tier": tier,
        "referral_code": ref,
        "used_today": used,
        "catalog": PRICING,
        "current_tier": current_tier,
        "gating": current_tier["gating"],
    }

@router.post("/ad-reward")
async def ad_reward():
    # No reward is granted until an approved ad policy and verifiable provider proof exist.
    raise HTTPException(status_code=410, detail="ad rewards are disabled pending verified provider proof and approved policy")

@router.post("/trial/start")
async def trial_start():
    raise HTTPException(status_code=410, detail="free trials are unavailable until a durable, atomic trial ledger is configured")

logger.info("✅ Economy Routes v3 ready (strategic pricing + feature gating)")

@router.post("/purchase/record")
async def purchase_record(body: dict, uid: str = Depends(get_current_user_id)):
    # Backward-compatible tombstone: never grant a paid tier from client-supplied fields.
    raise HTTPException(status_code=410, detail="client-side purchase recording is disabled; verify through Google Play first")

@router.post("/push-token")
async def push_token(body: dict, uid: str = Depends(get_current_user_id)):
    tok = str(body.get("token") or "")
    if not tok: raise HTTPException(400, "no token")
    db = get_db()
    try:
        db.table("user_devices").upsert({"user_id": uid, "device_id": tok[-12:], "push_token": tok}, on_conflict="user_id,device_id").execute()
    except Exception:
        try: db.table("user_devices").insert({"user_id": uid, "device_id": tok[-12:], "push_token": tok}).execute()
        except Exception: pass
    return {"success": True}
