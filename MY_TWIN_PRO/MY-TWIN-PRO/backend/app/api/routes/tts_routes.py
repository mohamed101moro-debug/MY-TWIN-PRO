"""TTS Routes v2.0 — صوت متدرج بالباقات عبر voice_gateway."""
import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from app.api.dependencies.auth import get_user_tier
logger = logging.getLogger("tts_routes")
router = APIRouter(prefix="/api/tts", tags=["tts"])
class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1)
    language: str = "ar"
    gender: str = "female"
@router.post("")
async def tts(req: TTSRequest, tier: str = Depends(get_user_tier)):
    from app.infrastructure.voice.voice_gateway import synthesize
    out = await synthesize(req.text, req.language, req.gender, tier)
    return {**out, "language": req.language, "tier": tier}
