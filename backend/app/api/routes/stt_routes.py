"""STT Routes v2.2 — cloud processing disabled until explicit consent."""
import logging, os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from app.api.dependencies.auth import get_user_tier
logger = logging.getLogger("stt_routes")
router = APIRouter(prefix="/api/stt", tags=["stt"])
class STTRequest(BaseModel):
    audio_base64: str = Field(..., min_length=10)
    language: str = Field(default="ar")
    user_id: Optional[str] = None
@router.post("/transcribe")
async def transcribe_audio(request: STTRequest, tier: str = Depends(get_user_tier)):
    """Cloud STT stays disabled until explicit, revocable per-user consent is implemented."""
    raise HTTPException(
        status_code=503,
        detail="المعالجة الصوتية السحابية متوقفة مؤقتًا حتى تفعيل موافقة صريحة قابلة للسحب.",
    )

@router.get("/health")
async def health():
    return {"groq": bool(os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY_2")), "gemini": bool(os.getenv("GEMINI_API_KEY")), "elevenlabs": bool(os.getenv("ELEVENLABS_API_KEY"))}
logger.info("✅ STT Routes v2.2 initialized (cloud STT fail-closed pending consent)")
