"""Central API router registry — each router is included at most once.

Development and administrative routers are not part of the normal API surface.
They are loaded only by the fail-closed local-development policy.
"""
import importlib
import logging
from fastapi import APIRouter
from app.core.internal_route_policy import resolve_internal_routers

logger = logging.getLogger("routes")
api_router = APIRouter()

# Core release routers. Keep explicit imports for predictable startup order.
from app.api.routes import auth, chat, memories, profile
from app.api.routes import study_routes, code_lab_routes, business_routes, creator_routes, dream_routes, life_coach_routes
from app.api.routes import image_lab_routes, smart_home_routes, task_manager_routes, economy_routes, billing_routes, referral
from app.api.routes import push, system_routes

_CORE = [
    auth, chat, memories, profile, study_routes, code_lab_routes, business_routes, creator_routes, dream_routes,
    life_coach_routes, image_lab_routes, smart_home_routes, task_manager_routes, economy_routes, billing_routes,
    referral, push, system_routes,
]

# Optional product routers are loaded defensively, but never duplicated.
# Privileged routers (admin/admin_routes/dev) are intentionally absent here.
_OPTIONAL = [
    "goals", "feedback", "graph_routes", "fingerprint_routes", "passport_routes", "awareness_routes", "awareness_score_routes",
    "consciousness_routes", "meta_routes", "onboarding", "account", "avatar_routes", "sync_routes", "projects",
    "stt_routes", "tts", "recommendations", "stats", "relationship_economy_routes", "twin_state_routes",
    "ritual_routes", "self_routes", "tts_routes", "relationship", "reports",
]

_seen = set()


def _include(module) -> None:
    router = getattr(module, "router", None)
    if router is None or id(router) in _seen:
        return
    api_router.include_router(router)
    _seen.add(id(router))


for _module in _CORE:
    _include(_module)

for _name in _OPTIONAL:
    try:
        _include(importlib.import_module(f"app.api.routes.{_name}"))
    except Exception as exc:
        logger.warning("optional router %s skipped: %s", _name, exc)

# Unlike optional product features, an explicitly enabled internal router must
# import successfully or startup should fail; silently skipping it is unsafe.
_INTERNAL_ROUTERS = resolve_internal_routers()
for _name in _INTERNAL_ROUTERS:
    _include(importlib.import_module(f"app.api.routes.{_name}"))
