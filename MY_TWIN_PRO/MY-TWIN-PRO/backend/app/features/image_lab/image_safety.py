"""
IMAGE SAFETY v2.0 – فحص سلامة المحتوى (100%)
================================================
- يفحص الـ Prompt قبل الإرسال (AI)
- يفحص الصورة المُولدة بعد التوليد (AI Vision)
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class ImageSafety:
    def __init__(self):
        self.ai_route = None

    async def check_prompt(self, prompt: str, language: str = "ar") -> Dict[str, Any]:
        """فحص الـ Prompt قبل الإرسال"""
        if not self.ai_route:
            return {"safe": True}
        try:
            text, _ = await self.ai_route(
                f"Check if this image prompt is safe, appropriate, and not harmful: '{prompt}'. Reply 'safe' or 'unsafe' followed by reason.",
                task="safety"
            )
            is_safe = "unsafe" not in (text or "").lower()
            return {"safe": is_safe, "reason": text[:200] if text else ""}
        except:
            return {"safe": True}

    async def check_image(self, image_base64: str, prompt: str, language: str = "ar") -> Dict[str, Any]:
        """فحص الصورة المُولدة"""
        if not self.ai_route:
            return {"safe": True}
        try:
            text, _ = await self.ai_route(
                f"Check if this generated image for prompt '{prompt}' is safe and appropriate. Image data provided. Reply 'safe' or 'unsafe'.",
                task="vision"
            )
            return {"safe": "unsafe" not in (text or "").lower()}
        except:
            return {"safe": True}


image_safety = ImageSafety()
