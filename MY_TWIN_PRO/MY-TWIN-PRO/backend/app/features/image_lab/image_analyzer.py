"""
IMAGE ANALYZER v2.0 – تحليل الصور الكامل (100%)
====================================================
- Describe (وصف تفصيلي)
- Tags (كلمات مفتاحية)
- OCR (استخراج النص)
- Object Detection (اكتشاف العناصر)
"""
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class ImageAnalyzer:
    def __init__(self):
        self.ai_route = None

    async def describe(self, image_base64: str, language: str = "ar") -> Dict[str, Any]:
        """وصف تفصيلي للصورة"""
        if not self.ai_route:
            return {"description": ""}
        try:
            prompt = f"Describe this image in detail. Language: {language}."
            text, _ = await self.ai_route(prompt, task="vision")
            return {"description": text or ""}
        except:
            return {"description": ""}

    async def extract_tags(self, image_base64: str, language: str = "ar") -> Dict[str, Any]:
        """استخراج كلمات مفتاحية"""
        if not self.ai_route:
            return {"tags": []}
        try:
            prompt = f"Extract 10-15 relevant tags/keywords from this image. Reply as comma-separated list. Language: {language}."
            text, _ = await self.ai_route(prompt, task="vision")
            tags = [t.strip() for t in (text or "").split(",") if t.strip()]
            return {"tags": tags}
        except:
            return {"tags": []}

    async def ocr(self, image_base64: str, language: str = "ar") -> Dict[str, Any]:
        """استخراج النص من الصورة"""
        if not self.ai_route:
            return {"text": ""}
        try:
            prompt = f"Extract all visible text from this image. Language: {language}."
            text, _ = await self.ai_route(prompt, task="vision")
            return {"text": text or ""}
        except:
            return {"text": ""}

    async def detect_objects(self, image_base64: str) -> Dict[str, Any]:
        """اكتشاف العناصر في الصورة"""
        if not self.ai_route:
            return {"objects": []}
        try:
            prompt = "List all objects, people, and elements visible in this image. Reply as comma-separated list."
            text, _ = await self.ai_route(prompt, task="vision")
            objects = [o.strip() for o in (text or "").split(",") if o.strip()]
            return {"objects": objects}
        except:
            return {"objects": []}

    async def full_analysis(self, image_base64: str, language: str = "ar") -> Dict[str, Any]:
        """تحليل كامل للصورة"""
        description = await self.describe(image_base64, language)
        tags = await self.extract_tags(image_base64, language)
        text = await self.ocr(image_base64, language)
        objects = await self.detect_objects(image_base64)
        return {
            "description": description.get("description", ""),
            "tags": tags.get("tags", []),
            "extracted_text": text.get("text", ""),
            "objects": objects.get("objects", []),
        }


image_analyzer = ImageAnalyzer()
