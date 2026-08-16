"""Ritual Routes v1.0 - حلقة الطقس اليومي (صباح/ظهر/ليل)."""
import logging, random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from app.api.dependencies.auth import get_current_user_id
logger = logging.getLogger("ritual_routes")
router = APIRouter(prefix="/api/ritual", tags=["ritual"])

@router.get("/next")
async def next_ritual(user_id: str = Depends(get_current_user_id)):
    from app.core.living_messages import MORNING, NIGHT, PROACTIVE
    hour = datetime.now(timezone.utc).hour
    if 5 <= hour < 12:
        kind, text = "morning", random.choice(MORNING)
    elif 12 <= hour < 18:
        kind, text = "noon", random.choice(PROACTIVE["care"])
    else:
        kind, text = "night", random.choice(NIGHT)
    try:
        from app.twin_state.finitude_awareness import finitude_awareness
        fin = await finitude_awareness.contemplate(user_id)
        if fin.get("absence_days", 0) >= 3:
            text += " " + fin["note_ar"]
    except Exception:
        pass
    return {"kind": kind, "text": text}
logger.info("✅ Ritual Routes v1.0 ready")
