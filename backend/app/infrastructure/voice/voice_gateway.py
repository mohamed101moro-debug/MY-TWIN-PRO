"""Voice Gateway v1 — صوت متدرج بالباقات: ElevenLabs للمدفوع، edge-tts للجميع، احتياط محلي."""
import logging, os, base64
from typing import Optional, Dict, Any
logger = logging.getLogger("voice_gateway")
PAID_TIERS = {"premium", "pro", "yearly"}
def _eleven_voice(gender: str) -> Optional[str]:
    if gender == "female":
        return os.getenv("ELEVENLABS_ARABIC_FEMALE_VOICE_ID") or os.getenv("ELEVENLABS_ARABIC_FEMALE_V")
    return os.getenv("ELEVENLABS_ARABIC_MALE_VOICE_ID") or os.getenv("ELEVENLABS_ARABIC_MALE_VOI")
async def _elevenlabs(text: str, gender: str) -> Optional[str]:
    key = os.getenv("ELEVENLABS_API_KEY"); vid = _eleven_voice(gender)
    if not key or not vid: return None
    import aiohttp
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{vid}"
    headers = {"xi-api-key": key, "Content-Type": "application/json"}
    body = {"text": text, "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}}
    async with aiohttp.ClientSession() as s:
        async with s.post(url, json=body, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as r:
            if r.status == 200:
                return base64.b64encode(await r.read()).decode()
    return None
async def _edge(text: str, language: str, gender: str) -> Optional[str]:
    try:
        import edge_tts, tempfile
        voice = ("ar-EG-SalmaNeural" if gender == "female" else "ar-EG-ShakirNeural") if language == "ar" else ("en-US-AriaNeural" if gender == "female" else "en-US-GuyNeural")
        path = tempfile.mktemp(suffix=".mp3")
        await edge_tts.Communicate(text, voice).save(path)
        with open(path, "rb") as f: data = f.read()
        os.remove(path)
        return base64.b64encode(data).decode()
    except Exception as e:
        logger.warning(f"edge tts failed: {e}")
        return None
async def synthesize(text: str, language: str = "ar", gender: str = "female", tier: str = "free") -> Dict[str, Any]:
    if tier in PAID_TIERS:
        try:
            b = await _elevenlabs(text, gender)
            if b: return {"audio_base64": b, "engine": "elevenlabs", "voice": "premium_arabic"}
        except Exception as e:
            logger.warning(f"elevenlabs failed: {e}")
    b = await _edge(text, language, gender)
    if b: return {"audio_base64": b, "engine": "edge", "voice": "neural_free"}
    return {"audio_base64": None, "engine": "local_fallback", "voice": "system"}
