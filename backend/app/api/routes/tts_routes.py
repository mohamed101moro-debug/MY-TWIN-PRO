"""Consent-gated TTS Routes — provider egress requires an authenticated owner grant."""
import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from app.api.dependencies.auth import get_current_user_id, get_user_tier

logger = logging.getLogger("tts_routes")
router = APIRouter(prefix="/api/tts", tags=["tts"])


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=3000)
    language: str = Field(default="ar", pattern="^(ar|en)$")
    gender: str = Field(default="female", pattern="^(female|male)$")


async def _synthesize(req: TTSRequest, tier: str, user_id: str):
    from app.infrastructure.voice.voice_gateway import synthesize
    out = await synthesize(req.text, req.language, req.gender, tier, user_id=user_id)
    return {**out, "language": req.language, "tier": tier}


@router.post("")
async def tts(
    req: TTSRequest,
    tier: str = Depends(get_user_tier),
    user_id: str = Depends(get_current_user_id),
):
    return await _synthesize(req, tier, user_id)


@router.post("/")
async def tts_slash(
    req: TTSRequest,
    tier: str = Depends(get_user_tier),
    user_id: str = Depends(get_current_user_id),
):
    return await _synthesize(req, tier, user_id)
