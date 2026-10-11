"""STT routes with authenticated owner and per-provider audio-transcription consent."""
import logging
import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from app.api.dependencies.auth import get_current_user_id
from app.privacy.cloud_ai_consent import get_granted_providers

logger = logging.getLogger("stt_routes")
router = APIRouter(prefix="/api/stt", tags=["stt"])


class STTRequest(BaseModel):
    audio_base64: str = Field(..., min_length=16, max_length=11_200_000)
    language: str = Field(default="ar", pattern="^(ar|en)$")


@router.post("/transcribe")
async def transcribe_audio(request: STTRequest, user_id: str = Depends(get_current_user_id)):
    allowed = get_granted_providers(user_id, "audio_transcription")
    if not allowed:
        raise HTTPException(403, "يلزم اختيار موافقة تفريغ الصوت لمزود سحابي محدد قبل إرسال التسجيل.")
    from app.infrastructure.ai.cloud_stt import transcribe
    transcript = await transcribe(request.audio_base64, request.language, user_id=user_id)
    if transcript is None:
        raise HTTPException(502, "تعذّر تفريغ الصوت عبر المزود المصرح به.")
    return {"text": transcript}


@router.get("/health")
async def health():
    return {
        "groq": bool(os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY_2")),
        "gemini": bool(os.getenv("GEMINI_API_KEY")),
        "elevenlabs": bool(os.getenv("ELEVENLABS_API_KEY")),
    }


logger.info("STT routes initialized with owner-scoped provider consent")
