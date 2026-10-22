"""
Twin State Routes v1.0 – API لحالة التوأم الداخلية
=====================================================
- GET /api/twin/state → مزاج، طاقة، فضول، عمق الرابطة
"""
from fastapi import APIRouter, Query, Depends
from app.twin_state.internal_state import twin_internal_state
from app.api.dependencies.canonical_user_id import get_current_canonical_user_id as get_current_user_id

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
async def get_twin_state(user_id: str = Depends(get_current_user_id), lang: str = "ar"):
    """استرجاع الحالة الداخلية للتوأم"""
    state = await twin_internal_state.get_state(user_id)
    mood_label = await twin_internal_state.get_mood_label(user_id, lang)
    cognitive_state = await twin_internal_state.get_cognitive_state(user_id)
    from app.twin_state.presence_binding import build_presence_binding
    return {
        "mood": state.get("mood", "unknown"),
        "mood_label": mood_label,
        "energy_level": state.get("energy_level", 0.5),
        "curiosity": state.get("curiosity", 0.5),
        "bond_depth": state.get("bond_depth", 0.0),
        "last_thought": state.get("last_thought", ""),
        "last_thought_at": state.get("last_thought_at"),
        "last_experience_at": state.get("last_experience_at"),
        "pending_questions": (state.get("pending_questions") or [])[-5:],
        "cognitive_load": max(0.0, min(1.0, float(state.get("cognitive_load", 0.0) or 0.0))),
        "continuity": {
            "schema_version": str(state.get("continuity_schema_version") or "s5.5"),
            "revision": int(state.get("continuity_revision", 0) or 0),
            "last_thought": state.get("last_thought", ""),
            "last_thought_at": state.get("last_thought_at"),
            "last_experience_at": state.get("last_experience_at"),
            "pending_questions": (state.get("pending_questions") or [])[-5:],
            "cognitive_load": max(0.0, min(1.0, float(state.get("cognitive_load", 0.0) or 0.0))),
            "curiosity": max(0.0, min(1.0, float(state.get("curiosity", 0.5) or 0.5))),
        },
        "life_intention": state.get("last_life_intention"),
        "brain_meaning": (state.get("last_life_intention") or {}).get("meaning"),
        "presence_binding": build_presence_binding(state),
        "soul_state": await _build_soul_state(user_id),
        "cognitive_state": cognitive_state,
    }

# -----------------------------------------------------------------------------
# Lifecycle intention ingestion
# -----------------------------------------------------------------------------
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from fastapi import Depends
from app.api.dependencies.canonical_user_id import get_current_canonical_user_id as get_current_user_id

class LifeIntentionBody(BaseModel):
    intention_id: Optional[str] = Field(default=None, min_length=1, max_length=128)
    # Lifecycle intention is deliberately not accepted as an authoritative
    # field. Older clients may still send it, but the route ignores it and
    # derives the canonical classification from evidence on the backend.
    intention: Optional[str] = Field(default=None, min_length=1, max_length=64)
    evidence: Dict[str, Any] = Field(default_factory=dict)
    observed_at: Optional[str] = None

@router.post("/life-intention")
async def ingest_life_intention(
    body: LifeIntentionBody,
    user_id: str = Depends(get_current_user_id),
):
    """Consume evidence-only lifecycle intentions.

    The mobile runtime never executes autonomous behavior from this event.
    The backend records it as engine output so reasoning/proactive layers can
    decide later whether it is relevant to memory, expression or initiative.
    """
    from app.twin_state.brain_evidence import derive_lifecycle_intention, normalize_evidence
    current_state = await twin_internal_state.get_state(user_id)
    normalized_evidence = normalize_evidence(body.evidence)
    # Canonical policy: client-supplied intention is compatibility input only;
    # it can never override backend evidence classification.
    intention = derive_lifecycle_intention(normalized_evidence, current_state)

    observed_at = body.observed_at or datetime.now(timezone.utc).isoformat()
    payload = {
        "intention_id": body.intention_id,
        "intention": intention,
        "evidence": normalized_evidence,
        "observed_at": observed_at,
        "source": "frontend_existence_loop",
    }

    try:
        canonical = await twin_internal_state.save_life_intention(user_id, payload)
    except Exception as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="life_intention_persistence_failed") from exc

    try:
        from app.memory.unified_memory import unified_memory_engine
        await unified_memory_engine.store_engine_output(user_id, "life_intention", payload)
    except Exception:
        pass

    # Return the canonical backend interpretation so the live renderer can
    # immediately project authoritative meaning without performing a second GET.
    # This remains data-only: the client never decides what the meaning means.
    from app.twin_state.presence_binding import build_presence_binding
    current = await twin_internal_state.get_state(user_id)
    return {
        "status": "accepted",
        "intention": intention,
        "life_intention": canonical,
        "brain_meaning": canonical.get("meaning"),
        "presence_binding": build_presence_binding(current),
    }
