"""STT Routes v2.0 — أذن سحابية فقط (صفر نماذج محلية، صفر مساحة مهدرة)."""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
logger = logging.getLogger("stt_routes")
router = APIRouter(prefix="/api/stt", tags=["stt"])
class STTRequest(BaseModel):
    audio_base64: str = Field(..., min_length=10)
    language: str = Field(default="ar")
    user_id: Optional[str] = None
@router.post("/transcribe")
async def transcribe_audio(request: STTRequest):
    try:
        from app.infrastructure.ai.cloud_stt import transcribe
        text = await transcribe(request.audio_base64, request.language)
        if text:
            return {"text": text, "language": request.language, "status": "success", "engine": "cloud"}
        return {"text": "", "language": request.language, "status": "empty"}
    except Exception as e:
        logger.error(f"STT failed: {e}")
        raise HTTPException(500, f"STT failed: {str(e)}")
@router.get("/health")
async def health():
    import os
    return {"groq": bool(os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY_2")), "gemini": bool(os.getenv("GEMINI_API_KEY"))}
logger.info("✅ STT Routes v2.0 initialized (cloud-only)")
