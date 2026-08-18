"""Self Routes v1 — السيرة والخط الزمني (الاستمرارية القابلة للإثبات)."""
from fastapi import APIRouter, Depends
from app.api.dependencies.auth import get_current_user_id
router = APIRouter(prefix="/api/self", tags=["self"])

@router.get("/timeline")
async def timeline(user_id: str = Depends(get_current_user_id), limit: int = 50):
    from app.twin_state.event_store import get_timeline
    return {"events": await get_timeline(user_id, limit)}

@router.get("/narrative")
async def narrative(user_id: str = Depends(get_current_user_id)):
    from app.twin_state.event_store import narrative as narr
    from app.twin_state.subjective_time import felt_gap
    return {"narrative": await narr(user_id), "subjective": await felt_gap(user_id)}

@router.get("/beliefs")
async def beliefs(user_id: str = Depends(get_current_user_id)):
    from app.twin_state.belief_system import belief_system
    return {"beliefs": await belief_system.get_beliefs(user_id)}

@router.get("/inner")
async def inner(user_id: str = Depends(get_current_user_id)):
    """الحياة الداخلية: أسئلة معلّقة + آخر فكرة + طاقة."""
    from app.twin_state.internal_state import twin_internal_state as t
    st = await t.get_state(user_id)
    return {"pending_questions": (st.get("pending_questions") or [])[-3:], "last_thought": st.get("last_thought"), "energy": st.get("energy_level")}
