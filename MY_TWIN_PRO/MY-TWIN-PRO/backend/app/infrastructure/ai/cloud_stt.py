"""Cloud STT v1 — أذن سحابية بلا نماذج محلية: Groq whisper-large-v3 ثم Gemini Audio."""
import logging, base64, os
from typing import Optional
logger = logging.getLogger("cloud_stt")
async def transcribe(audio_b64: str, language: str = "ar") -> Optional[str]:
    data = base64.b64decode(audio_b64)
    try:
        key = os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY_2")
        if key:
            import aiohttp
            form = aiohttp.FormData()
            form.add_field("file", data, filename="audio.m4a", content_type="audio/mp4")
            form.add_field("model", "whisper-large-v3")
            form.add_field("language", language)
            async with aiohttp.ClientSession() as s:
                async with s.post("https://api.groq.com/openai/v1/audio/transcriptions",
                                  headers={"Authorization": f"Bearer {key}"},
                                  data=form, timeout=aiohttp.ClientTimeout(total=30)) as r:
                    if r.status == 200:
                        t = ((await r.json()).get("text") or "").strip()
                        if t: return t
    except Exception as e:
        logger.warning(f"groq stt failed: {e}")
    try:
        key = os.getenv("GEMINI_API_KEY")
        if key:
            import aiohttp
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
            body = {"contents": [{"parts": [
                {"text": "انسخ هذا الصوت نصًا حرفيًا بدقة، بدون أي تعليقات، وبنفس اللغة المنطوقة."},
                {"inline_data": {"mime_type": "audio/mp4", "data": audio_b64}}]}]}
            async with aiohttp.ClientSession() as s:
                async with s.post(url, json=body, timeout=aiohttp.ClientTimeout(total=30)) as r:
                    if r.status == 200:
                        d = await r.json()
                        t = d["candidates"][0]["content"]["parts"][0]["text"].strip()
                        if t: return t
    except Exception as e:
        logger.warning(f"gemini stt failed: {e}")
    return None
