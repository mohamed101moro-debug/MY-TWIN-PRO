"""Consent-gated cloud TTS gateway with local-device fallback semantics."""
import base64
import logging
import os
import tempfile
from typing import Optional, Dict, Any

logger = logging.getLogger("voice_gateway")
PAID_TIERS = {"premium", "pro", "yearly"}


def _eleven_voice(gender: str) -> Optional[str]:
    if gender == "female":
        return os.getenv("ELEVENLABS_ARABIC_FEMALE_VOICE_ID") or os.getenv("ELEVENLABS_ARABIC_FEMALE_V")
    return os.getenv("ELEVENLABS_ARABIC_MALE_VOICE_ID") or os.getenv("ELEVENLABS_ARABIC_MALE_VOI")


def _has_voice_consent(user_id: str | None, provider: str) -> bool:
    try:
        from app.privacy.cloud_ai_consent import get_granted_providers
        return provider in get_granted_providers(user_id, "voice_synthesis")
    except Exception:
        return False


async def _elevenlabs(text: str, gender: str, user_id: str | None = None) -> Optional[str]:
    if not _has_voice_consent(user_id, "elevenlabs"):
        return None
    key = os.getenv("ELEVENLABS_API_KEY")
    voice_id = _eleven_voice(gender)
    if not key or not voice_id:
        return None
    import aiohttp
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {"xi-api-key": key, "Content-Type": "application/json"}
    body = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=body, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as response:
            if response.status == 200:
                return base64.b64encode(await response.read()).decode()
    return None


async def _edge(text: str, language: str, gender: str, user_id: str | None = None) -> Optional[str]:
    if not _has_voice_consent(user_id, "edge_tts"):
        return None
    path = None
    try:
        import edge_tts
        voice = (
            ("ar-EG-SalmaNeural" if gender == "female" else "ar-EG-ShakirNeural")
            if language == "ar"
            else ("en-US-AriaNeural" if gender == "female" else "en-US-GuyNeural")
        )
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
            path = temp_file.name
        await edge_tts.Communicate(text, voice).save(path)
        with open(path, "rb") as audio_file:
            return base64.b64encode(audio_file.read()).decode()
    except Exception as exc:
        logger.warning("edge TTS failed (%s)", type(exc).__name__)
        return None
    finally:
        if path:
            try:
                os.unlink(path)
            except OSError:
                pass


async def synthesize(
    text: str,
    language: str = "ar",
    gender: str = "female",
    tier: str = "free",
    user_id: str | None = None,
) -> Dict[str, Any]:
    try:
        from app.privacy.cloud_ai_consent import get_granted_providers
        allowed = get_granted_providers(user_id, "voice_synthesis")
    except Exception:
        allowed = set()

    # A backend TTS response is optional; a mobile client may use OS-local speech.
    if tier in PAID_TIERS and "elevenlabs" in allowed:
        try:
            audio = await _elevenlabs(text, gender, user_id)
            if audio:
                return {"audio_base64": audio, "engine": "elevenlabs", "voice": "premium_arabic"}
        except Exception as exc:
            logger.warning("elevenlabs failed (%s)", type(exc).__name__)
    if "edge_tts" in allowed:
        audio = await _edge(text, language, gender, user_id)
        if audio:
            return {"audio_base64": audio, "engine": "edge", "voice": "neural_free"}
    return {"audio_base64": None, "engine": "local_fallback", "voice": "system"}
