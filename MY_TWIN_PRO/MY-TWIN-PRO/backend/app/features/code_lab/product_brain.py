"""
PRODUCT BRAIN v3.0 – عقل المنتج (Code Lab)
=============================================
- تحليل السوق والمنافسين
- تعريف MVP
- نموذج الربح
- Startup Mode (Pitch Deck + Roadmap + Investor Notes)
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class ProductBrain:
    def __init__(self):
        self.ai_route = None

    async def analyze_idea(self, idea: str, lang: str = "ar") -> Dict[str, Any]:
        if not self.ai_route:
            return {"recommendation": "الفكرة واعدة"}
        
        prompt = f"""أنت محلل منتجات محترف. حلل فكرة: "{idea}" من حيث:
1. حجم السوق المحتمل
2. الجمهور المستهدف
3. المنافسون الرئيسيون
4. فرص النمو
5. MVP المقترح
6. نموذج الربح
اللغة: {lang}. أعط إجابة مختصرة (6-8 جمل)."""
        try:
            text, _ = await self.ai_route(prompt, task="product_analysis")
            return {"analysis": text, "recommendation": "موصى بالمتابعة" if "واعد" in text else "يحتاج مزيداً من الدراسة"}
        except Exception as e:
            return {"error": str(e)}

    async def startup_mode(self, idea: str, lang: str = "ar") -> Dict[str, Any]:
        if not self.ai_route:
            return {"error": "AI غير متاح"}
        
        pitch = await self._generate_pitch(idea, lang)
        roadmap = await self._generate_roadmap(idea, lang)
        investor_notes = await self._generate_investor_notes(idea, lang)
        
        return {"pitch_deck": pitch, "roadmap": roadmap, "investor_notes": investor_notes}

    async def _generate_pitch(self, idea: str, lang: str) -> str:
        prompt = f"""أنشئ Pitch Deck من 5 شرائح لفكرة: "{idea}":
1. المشكلة 2. الحل 3. السوق 4. نموذج العمل 5. الفريق
اللغة: {lang}. اجعلها مقنعة ومختصرة."""
        try:
            text, _ = await self.ai_route(prompt, task="startup")
            return text
        except: return ""

    async def _generate_roadmap(self, idea: str, lang: str) -> str:
        prompt = f"""ضع Roadmap لفكرة: "{idea}" لمدة 6 أشهر (3 مراحل). اللغة: {lang}."""
        try:
            text, _ = await self.ai_route(prompt, task="startup")
            return text
        except: return ""

    async def _generate_investor_notes(self, idea: str, lang: str) -> str:
        prompt = f"""اكتب ملاحظات للمستثمرين عن فكرة: "{idea}". اللغة: {lang}."""
        try:
            text, _ = await self.ai_route(prompt, task="startup")
            return text
        except: return ""


product_brain = ProductBrain()
