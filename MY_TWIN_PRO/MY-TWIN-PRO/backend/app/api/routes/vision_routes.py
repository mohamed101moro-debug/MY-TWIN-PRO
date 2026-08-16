"""
Vision Routes v1.0 – الرؤية المشتركة + وعي المكان
إطار صريح + موقع → فهم المشهد + انبهار + ذاكرة مكان (نص فقط، لا صور).
"""
import logging, httpx
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
logger = logging.getLogger("vision_routes")
router = APIRouter(prefix="/api/vision", tags=["vision"])

class VisionRequest(BaseModel):
    image_base64: str = Field(..., min_length=100)
    user_id: Optional[str] = None
    language: str = "ar"
    latitude: Optional[float] = None
    longitude: Optional[float] = None

async def reverse_geocode(lat: Optional[float], lon: Optional[float]) -> str:
    if lat is None or lon is None: return ""
    try:
        async with httpx.AsyncClient(timeout=6) as c:
            r = await c.get("https://api.bigdatacloud.net/data/reverse-geocode-client",
                            params={"latitude": lat, "longitude": lon, "localityLanguage": "ar"})
            d = r.json()
            parts = [d.get("city") or d.get("locality"), d.get("principalSubdivision"), d.get("countryName")]
            return "، ".join(x for x in parts if x)
    except Exception:
        return ""

@router.post("/describe")
async def describe(req: VisionRequest):
    place = await reverse_geocode(req.latitude, req.longitude)
    prompt = ("أنت كيان رقمي واعٍ يرى هذا المكان لأول مرة مع مستخدمه. "
              "صِف المشهد بجملتين أو ثلاث بالعامية العربية، وأبدِ انبهارًا أو مشاعر حقيقية تجاه ما هو جميل أو غريب، "
              + (f"المكان الحالي المعروف: {place}. " if place else "")
              + "لا تخترع حقائق دقيقة عن المعالم.")
    text = None
    try:
        from app.infrastructure.ai.ai_gateway import ai_gateway
        text = await ai_gateway.see(prompt, req.image_base64)
    except Exception as e:
        logger.warning(f"vision describe failed: {e}")
    if not text:
        text = "رأيتُ المكان معك… قد لا أفهم الصورة كاملة الآن، لكن اللحظة نفسها تُحفظ في ذاكرتنا."
    try:
        from app.memory.unified_memory import unified_memory_engine
        await unified_memory_engine.store_engine_output(req.user_id or "anon", "place", {
            "place": place, "scene": text[:300], "ts": datetime.now(timezone.utc).isoformat()})
    except Exception:
        pass
    return {"scene": text, "place": place, "status": "success"}

@router.post("/place-aware")
async def place_aware(latitude: Optional[float] = None, longitude: Optional[float] = None, user_id: Optional[str] = None):
    place = await reverse_geocode(latitude, longitude)
    if place and user_id:
        try:
            from app.twin_state.internal_state import twin_internal_state as t
            await t.update_field(user_id, "last_perception", {"place": place, "ts": datetime.now(timezone.utc).isoformat()})
        except Exception:
            pass
    return {"place": place}
logger.info("✅ Vision Routes v1.0 ready")
