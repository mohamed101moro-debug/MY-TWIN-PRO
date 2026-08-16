"""لقطات المستشعرات من الجسد إلى العقل."""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.api.dependencies.auth import get_current_user_id
logger = logging.getLogger("perception_snapshot")
router = APIRouter(prefix="/api/perception", tags=["perception"])
class SnapshotBody(BaseModel):
    steps: int = 0
    battery: Optional[int] = None
    walking: bool = False
    night: bool = False
    audio_level: float = 0.1
    face_detected: bool = False
    weather: str = "unknown"
    calendar_next_title: Optional[str] = None
    calendar_next_min: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    place: Optional[str] = None
    vision_summary: Optional[str] = None
@router.post("/snapshot")
async def snapshot(body: SnapshotBody, user_id: str = Depends(get_current_user_id)):
    try:
        from app.twin_state.internal_state import twin_internal_state as t
        data = {**body.dict(), "ts": datetime.now(timezone.utc).isoformat()}
        if data.get("latitude") is not None and not data.get("place"):
            try:
                from app.api.routes.vision_routes import reverse_geocode
                data["place"] = await reverse_geocode(data["latitude"], data["longitude"])
            except Exception:
                pass
        await t.update_field(user_id, "last_perception", data)
    except Exception as e:
        logger.debug(f"snapshot store: {e}")
    return {"status": "ok"}
