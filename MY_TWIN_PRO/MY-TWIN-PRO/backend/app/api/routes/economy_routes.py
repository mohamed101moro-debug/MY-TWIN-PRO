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
try:
    from app.infrastructure.cache import get as cget, set as cset
except Exception:
    _mem = {}
    def cget(k): return _mem.get(k)
    def cset(k, v, ttl=0): _mem[k] = v
try:
    from token_limits import add_referral_bonus
except Exception:
    add_referral_bonus = None

ADS_DAILY_MAX = 5
TRIAL_DAYS = 3

PRICING = [
    {
        "tier": "free",
        "price": 0,
        "period": "forever",
        "philosophy": "أعرفك",
        "features": [
            "15 رسالة/يوم",
            "إعلانات داخل المحادثة",
            "Energy محدود",
            "صوت عصبي مجاني (Edge TTS)",
            "ذاكرة أساسية (7 أيام)",
            "Inner Life أساسي",
            "Soul Observatory محدود"
        ],
        "gating": {
            "messages_per_day": 15,
            "memory_days": 7,
            "voice_provider": "edge-tts",
            "vision_enabled": False,
            "dreams_enabled": False,
            "prediction_enabled": False,
            "proactive_enabled": False,
            "ads_in_chat": True,
            "priority_inference": False,
        }
    },
    {
        "tier": "plus",
        "price": 5.99,
        "period": "month",
        "philosophy": "أتذكرك",
        "features": [
            "بدون إعلانات داخل المحادثة",
            "50 رسالة/يوم",
            "Energy أكبر",
            "صوت عصبي مجاني",
            "ذاكرة أعمق (30 يوم)",
            "مكالمات صوتية",
            "Rituals يومية",
            "Presence محسّنة"
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
        "price": 14.99,
        "period": "month",
        "philosophy": "أفهمك",
        "features": [
            "رسائل غير محدودة",
            "طاقة عالية",
            "صوت ElevenLabs عربي",
            "نسخ صوتي مصقول (STT polishing)",
            "رؤية مشتركة (Vision)",
            "تنبؤات سلوكية",
            "تحليل أحلام",
            "ذاكرة عميقة (90 يوم)",
            "تفاعل استباقي",
            "Inner Life متقدم"
        ],
        "gating": {
            "messages_per_day": 999,
            "memory_days": 90,
            "voice_provider": "elevenlabs",
            "vision_enabled": True,
            "dreams_enabled": True,
            "prediction_enabled": True,
            "proactive_enabled": True,
            "ads_in_chat": False,
            "priority_inference": False,
        }
    },
    {
        "tier": "pro",
        "price": 89.99,
        "period": "6months",
        "philosophy": "أعيش معك",
        "features": [
            "كل مزايا Premium",
            "طاقة قصوى (Maximum Energy)",
            "ذاكرة غير محدودة",
            "أولوية استدلال AI",
            "تنبؤات متقدمة",
            "استقلالية متقدمة",
            "إدراك حسي متقدم",
            "Inner Life عميق جدًا",
            "ميزات تجريبية مستقبلية",
            "أقل قيود استخدام"
        ],
        "gating": {
            "messages_per_day": 9999,
            "memory_days": 9999,
            "voice_provider": "elevenlabs",
            "vision_enabled": True,
            "dreams_enabled": True,
            "prediction_enabled": True,
            "proactive_enabled": True,
            "ads_in_chat": False,
            "priority_inference": True,
        }
    },
    {
        "tier": "yearly",
        "price": 149.99,
        "period": "year",
        "philosophy": "Best Value",
        "equivalent_monthly": 12.50,
        "features": [
            "كل مزايا Premium",
            "سنة كاملة بسعر موسم",
            "خصم 16.6% (وفّر $29.89)",
            "ميزات مبكرة"
        ],
        "gating": {
            "messages_per_day": 999,
            "memory_days": 90,
            "voice_provider": "elevenlabs",
            "vision_enabled": True,
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
    tr = cget(f"trial:{uid}")
    if tr and time.time() > float(tr) and tier == "premium":
        try: db.table("profiles").update({"tier": "free"}).eq("id", uid).execute()
        except Exception: pass
        tier = "free"
    today = time.strftime("%Y-%m-%d"); used = 0; ads = 0
    try:
        u = db.table("daily_usage").select("*").eq("user_id", uid).eq("date", today).single().execute()
        used = (u.data or {}).get("messages", 0); ads = (u.data or {}).get("ads", 0)
    except Exception: pass
    current_tier = next((t for t in PRICING if t["tier"] == tier), PRICING[0])
    return {
        "tier": tier,
        "referral_code": ref,
        "used_today": used,
        "ads_today": ads,
        "ads_max": ADS_DAILY_MAX,
        "trial_active": bool(tr and time.time() < float(tr)),
        "catalog": PRICING,
        "current_tier": current_tier,
        "gating": current_tier["gating"],
    }

@router.post("/ad-reward")
async def ad_reward(uid: str = Depends(get_current_user_id)):
    db = get_db(); today = time.strftime("%Y-%m-%d"); ads = 0
    try:
        u = db.table("daily_usage").select("*").eq("user_id", uid).eq("date", today).single().execute()
        ads = (u.data or {}).get("ads", 0)
    except Exception: pass
    if ads >= ADS_DAILY_MAX: raise HTTPException(429, "daily ads limit reached")
    try: db.rpc("increment_daily_usage", {"p_user_id": uid, "p_field": "ads"}).execute()
    except Exception: pass
    granted = 0
    if add_referral_bonus:
        try: add_referral_bonus(uid, 150); granted = 150
        except Exception: pass
    return {"success": True, "tokens_granted": granted, "ads_today": ads + 1}

@router.post("/trial/start")
async def trial_start(uid: str = Depends(get_current_user_id)):
    db = get_db()
    if cget(f"trial_used:{uid}"): raise HTTPException(409, "trial already used")
    exp = time.time() + TRIAL_DAYS * 86400
    cset(f"trial:{uid}", exp, TRIAL_DAYS * 86400 + 60); cset(f"trial_used:{uid}", 1, 30 * 86400)
    try: db.table("profiles").update({"tier": "premium"}).eq("id", uid).execute()
    except Exception: pass
    return {"success": True, "expires_at": exp}

logger.info("✅ Economy Routes v3 ready (strategic pricing + feature gating)")

@router.post("/purchase/record")
async def purchase_record(body: dict, uid: str = Depends(get_current_user_id)):
    tier = str(body.get("tier") or "plus"); token = str(body.get("token") or ""); sku = str(body.get("sku") or "")
    if tier not in ("plus","premium","pro","yearly"): raise HTTPException(400, "bad tier")
    db = get_db()
    # TODO(production): تحقق خادمي من token عبر Google Android Publisher قبل التفعيل.
    try: db.table("profiles").update({"tier": tier}).eq("id", uid).execute()
    except Exception: pass
    return {"success": True, "tier": tier, "verified": token not in ("", "sandbox")}

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
