"""Owner-scoped, purpose/provider-gated cloud speech transcription."""
import base64
import logging
import os
from typing import Optional

logger = logging.getLogger("cloud_stt")
MAX_AUDIO_BYTES = 8 * 1024 * 1024


def _allowed(user_id: str | None, provider: str) -> bool:
    try:
        from app.privacy.cloud_ai_consent import get_granted_providers
        return provider in get_granted_providers(user_id, "audio_transcription")
    except Exception:
        return False


async def _groq_transcribe(audio: bytes, language: str, user_id: str | None) -> Optional[str]:
    if not _allowed(user_id, "groq"):
        return None
    key = os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY_2")
    if not key:
        return None
    try:
        import aiohttp
        form = aiohttp.FormData()
        form.add_field("file", audio, filename="audio.m4a", content_type="audio/mp4")
        form.add_field("model", "whisper-large-v3")
        form.add_field("language", language)
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {key}"},
                data=form,
                timeout=aiohttp.ClientTimeout(total=30),
            ) as response:
                if response.status == 200:
                    return ((await response.json()).get("text") or "").strip() or None
    except Exception as exc:
        logger.warning("Groq STT failed (%s)", type(exc).__name__)
    return None


async def _gemini_transcribe(audio_b64: str, user_id: str | None) -> Optional[str]:
    if not _allowed(user_id, "gemini"):
        return None
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return None
    try:
        import aiohttp
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
        body = {"contents": [{"parts": [
            {"text": "انسخ هذا الصوت نصًا حرفيًا بدقة، بدون أي تعليقات، وبنفس اللغة المنطوقة."},
            {"inline_data": {"mime_type": "audio/mp4", "data": audio_b64}},
        ]}]}
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=body, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status == 200:
                    data = await response.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"].strip() or None
    except Exception as exc:
        logger.warning("Gemini STT failed (%s)", type(exc).__name__)
    return None


async def transcribe(audio_b64: str, language: str = "ar", user_id: str | None = None) -> Optional[str]:
    if not user_id:
        return None
    try:
        audio = base64.b64decode(audio_b64, validate=True)
    except Exception:
        return None
    if not audio or len(audio) > MAX_AUDIO_BYTES:
        return None
    try:
        from app.privacy.cloud_ai_consent import get_granted_providers
        approved = get_granted_providers(user_id, "audio_transcription")
    except Exception:
        approved = set()
    if not approved:
        return None

    if "groq" in approved:
        transcript = await _groq_transcribe(audio, language, user_id)
        if transcript:
            return transcript
    # Fallback is only permitted when the user explicitly approved Gemini too.
    if "gemini" in approved:
        return await _gemini_transcribe(audio_b64, user_id)
    return None
