"""
TTS Route v2.0 – Edge TTS Endpoint with Voice Mapping
======================================================
توليد الصوت عبر Edge TTS مع دعم كامل للأصوات العربية والإنجليزية
"""
import logging
import base64
import tempfile
import os
import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict

logger = logging.getLogger("tts_route")
router = APIRouter(prefix="/api/tts", tags=["tts"])

# ============================================================
# Voice Mapping
# ============================================================

VOICE_MAP: Dict[str, Dict[str, str]] = {
    "ar": {
        "male": "ar-EG-ShakirNeural",
        "female": "ar-SA-ZariyahNeural",
        "shakir": "ar-EG-ShakirNeural",
        "hamed": "ar-SA-HamedNeural",
        "zariyah": "ar-SA-ZariyahNeural",
        "fatima": "ar-SA-FatimaNeural",
    },
    "en": {
        "male": "en-US-GuyNeural",
        "female": "en-US-JennyNeural",
        "guy": "en-US-GuyNeural",
        "jenny": "en-US-JennyNeural",
        "aria": "en-US-AriaNeural",
        "davis": "en-US-DavisNeural",
    }
}

# ============================================================
# Models
# ============================================================

class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=800)
    voice_id: Optional[str] = Field(None, description="مثل ar-EG-ShakirNeural أو en-US-GuyNeural أو alias: male/female")
    language: str = Field("ar", description="ar أو en")
    gender: Optional[str] = Field(None, description="male أو female — يُستخدم إذا لم يُحدد voice_id")

class TTSResponse(BaseModel):
    audio_base64: str
    mime_type: str
    voice_id: str
    language: str
    duration_estimate: Optional[float] = None

# ============================================================
# Helpers
# ============================================================

def resolve_voice(voice_id: Optional[str], language: str, gender: Optional[str]) -> str:
    """تحديد الصوت المناسب"""
    lang = language.lower()[:2]

    # إذا كان voice_id alias
    if voice_id:
        vid = voice_id.lower().strip()
        # التحقق من alias
        if vid in VOICE_MAP.get(lang, {}):
            return VOICE_MAP[lang][vid]
        # إذا كان voice_id كامل
        if "Neural" in voice_id:
            return voice_id

    # استخدام gender
    if gender:
        g = gender.lower()
        if g in VOICE_MAP.get(lang, {}):
            return VOICE_MAP[lang][g]

    # الافتراضي
    return VOICE_MAP.get(lang, VOICE_MAP["ar"]).get("male", "ar-EG-ShakirNeural")

def estimate_duration(text: str, language: str) -> float:
    """تقدير مدة الصوت بالثواني"""
    # العربية: ~3.5 حرف/ثانية، الإنجليزية: ~5 حرف/ثانية
    rate = 3.5 if language.startswith("ar") else 5.0
    return round(len(text) / rate, 1)

# ============================================================
# Endpoint
# ============================================================

@router.post("", response_model=TTSResponse)
async def generate_tts(request: TTSRequest):
    """
    توليد ملف صوتي باستخدام Edge TTS وإرجاعه كـ base64.
    """
    try:
        import edge_tts
    except ImportError:
        logger.error("Edge TTS not installed")
        raise HTTPException(
            status_code=500,
            detail="Edge TTS library not installed. Run: pip install edge-tts"
        )

    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    lang = request.language.lower()[:2]
    voice = resolve_voice(request.voice_id, lang, request.gender)

    # إنشاء ملف مؤقت
    tmp_file = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    tmp_path = tmp_file.name
    tmp_file.close()

    try:
        logger.info(f"Generating TTS: voice={voice}, lang={lang}, text_len={len(text)}")

        communicate = edge_tts.Communicate(text=text, voice=voice)
        await communicate.save(tmp_path)

        # قراءة الملف
        with open(tmp_path, "rb") as f:
            audio_bytes = f.read()

        if not audio_bytes or len(audio_bytes) < 100:
            raise ValueError("Generated audio is too small or empty")

        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        duration = estimate_duration(text, lang)

        logger.info(f"TTS generated successfully: {len(audio_b64)} chars base64, ~{duration}s")

        return TTSResponse(
            audio_base64=audio_b64,
            mime_type="audio/mpeg",
            voice_id=voice,
            language=lang,
            duration_estimate=duration,
        )

    except Exception as e:
        logger.error(f"Edge TTS generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")

    finally:
        # تنظيف الملف المؤقت
        try:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        except Exception as e:
            logger.warning(f"Failed to cleanup temp file: {e}")

# ============================================================
# Health Check
# ============================================================

@router.get("/health")
async def tts_health():
    """التحقق من توفر Edge TTS"""
    try:
        import edge_tts
        return {"status": "ok", "edge_tts": "available", "voices_count": len(VOICE_MAP["ar"]) + len(VOICE_MAP["en"])}
    except ImportError:
        return {"status": "degraded", "edge_tts": "not_installed"}

logger.info("✅ TTS Route v2.0 initialized with voice mapping")
