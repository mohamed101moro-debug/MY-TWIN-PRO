"""
Twin State Routes v1.0 – API لحالة التوأم الداخلية
=====================================================
- GET /api/twin/state → مزاج، طاقة، فضول، عمق الرابطة
"""
from fastapi import APIRouter, Query
from app.twin_state.internal_state import twin_internal_state

router = APIRouter(prefix="/api/twin", tags=["twin_state"])
async def _build_soul_state(user_id: str):
    try:
        from app.twin_state.relationship_economy import relationship_economy
        eco = await relationship_economy.get_economy(user_id)
        trust = eco.get("trust", 0.3); intimacy = eco.get("intimacy", 0.1)
        role = "soul_partner" if trust > 0.8 else "confidant" if trust > 0.6 else "friend" if trust > 0.4 else "companion" if trust > 0.2 else "observer"
        roles_ar = {"observer":"مراقب","companion":"رفيق","friend":"صديق","confidant":"أمين سرّك","soul_partner":"توأم الروح"}
        fp_hash = ""
        try:
            from app.features.digital_fingerprint import fingerprint_engine
            fp = await fingerprint_engine.get_fingerprint(user_id)
            fp_hash = (fp or {}).get("fingerprint_hash", "")
        except Exception: pass
        values = ["التعاطف", "الفضول", "الصدق"]
        try:
            from app.twin_state.self_model import self_model_engine
            selfm = await self_model_engine.get_current_self(user_id)
            values = (selfm or {}).get("values", values)
        except Exception: pass
        return {"core": {"role": role, "phase_ar": roles_ar.get(role, role), "phase_en": role},
                "values": {"values": values},
                "signature": {"fingerprint": fp_hash},
                "resonance": {"harmony": round((trust + intimacy) / 2, 2),
                              "sync_level": "complete" if trust > 0.8 else "strong" if trust > 0.6 else "moderate"}}
    except Exception:
        return None


@router.get("/state")
async def get_twin_state(user_id: str = Query(...), lang: str = "ar"):
    """استرجاع الحالة الداخلية للتوأم"""
    state = await twin_internal_state.get_state(user_id)
    mood_label = await twin_internal_state.get_mood_label(user_id, lang)
    return {
        "mood": state.get("mood", "calm"),
        "mood_label": mood_label,
        "energy_level": state.get("energy_level", 0.8),
        "curiosity": state.get("curiosity", 0.7),
        "bond_depth": state.get("bond_depth", 0.1),
        "last_thought": state.get("last_thought", ""),
        "soul_state": await _build_soul_state(user_id),
    }
