from fastapi import APIRouter
api_router = APIRouter()
from app.api.routes import auth, chat, memories, profile
from app.api.routes import study_routes, code_lab_routes, business_routes
from app.api.routes import creator_routes, dream_routes, life_coach_routes
from app.api.routes import image_lab_routes, smart_home_routes, task_manager_routes
from app.api.routes import economy_routes, ads, billing, referral
from app.api.routes import unified_chat, push, perception_snapshot, system_routes
api_router.include_router(auth.router)
api_router.include_router(chat.router)
api_router.include_router(memories.router)
api_router.include_router(profile.router)
api_router.include_router(study_routes.router)
api_router.include_router(code_lab_routes.router)
api_router.include_router(business_routes.router)
api_router.include_router(creator_routes.router)
api_router.include_router(dream_routes.router)
api_router.include_router(life_coach_routes.router)
api_router.include_router(image_lab_routes.router)
api_router.include_router(smart_home_routes.router)
api_router.include_router(task_manager_routes.router)
api_router.include_router(economy_routes.router)
api_router.include_router(ads.router)
api_router.include_router(billing.router)
api_router.include_router(referral.router)
api_router.include_router(unified_chat.router)
api_router.include_router(push.router)
api_router.include_router(perception_snapshot.router)
api_router.include_router(system_routes.router)

# ── تسجيل الراوترات اليتيمة (محروس — لا يكسر الإقلاع) ──
import logging as _lg
logger=_lg.getLogger("routes")
for _mod in ["goals","feedback","graph_routes","fingerprint_routes","passport_routes",
             "awareness_routes","awareness_score_routes","consciousness_routes","meta_routes",
             "onboarding","account","admin","ai_trainer_routes","avatar_routes","sync_routes",
             "projects","stt_routes","tts","recommendations","stats",
             "relationship_economy_routes","twin_state_routes","dev"]:
    try:
        import importlib as _il
        _r=_il.import_module(f"app.api.routes.{_mod}")
        api_router.include_router(_r.router)
    except Exception as _e:
        logger.warning(f"router {_mod} skipped: {_e}")

# ── PHASE6_REG: تسجيل شامل متسامح لكل الراوترات ──
for _m in ["study_routes","creator_routes","dream_routes","image_lab_routes","task_manager_routes","smart_home_routes","consciousness_routes","awareness_routes","awareness_score_routes","meta_routes","onboarding","account","admin","ai_trainer_routes","avatar_routes","sync_routes","projects","stt_routes","tts","recommendations","stats","relationship_economy_routes","twin_state_routes","goals","feedback","graph_routes","fingerprint_routes","passport_routes","dev"]:
    try:
        import importlib as _il
        _r=_il.import_module(f"app.api.routes.{_m}")
        if not any(getattr(_r,"router",None) is getattr(_inc,"router",None) for _inc in []):
            api_router.include_router(_r.router)
    except Exception as _e:
        import logging as _lg; _lg.getLogger("routes").warning(f"router {_m}: {_e}")
