"""STT Routes v2.1 — أذن سحابية + لمسة دقة للمدفوع (تصحيح Gemini بعد النسخ)."""
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
    try:
        from app.infrastructure.ai.cloud_stt import transcribe
        from app.infrastructure.voice.voice_gateway import PAID_TIERS
        text = await transcribe(request.audio_base64, request.language)
        if text and tier in PAID_TIERS:
            try:
                import aiohttp
                key = os.getenv("GEMINI_API_KEY")
                if key:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
                    body = {"contents": [{"parts": [{"text": f"صحّح هذا النص المنسوخ صوتيًا (ترقيم وإملاء وتشكيل خفيف) دون تغيير المعنى أو إضافة تعليقات:\n{text}"}]}]}
                    async with aiohttp.ClientSession() as s:
                        async with s.post(url, json=body, timeout=aiohttp.ClientTimeout(total=20)) as r:
                            if r.status == 200:
                                t2 = (await r.json())["candidates"][0]["content"]["parts"][0]["text"].strip()
                                if t2: text = t2
            except Exception: pass
        if text:
            return {"text": text, "language": request.language, "status": "success", "engine": "cloud", "polished": tier in PAID_TIERS}
        return {"text": "", "language": request.language, "status": "empty"}
    except Exception as e:
        logger.error(f"STT failed: {e}")
        raise HTTPException(500, f"STT failed: {str(e)}")
@router.get("/health")
async def health():
    return {"groq": bool(os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY_2")), "gemini": bool(os.getenv("GEMINI_API_KEY")), "elevenlabs": bool(os.getenv("ELEVENLABS_API_KEY"))}
logger.info("✅ STT Routes v2.1 initialized (cloud + paid polish)")
