"""
PRODUCT ARCHITECT – العقل الاستراتيجي لـ Code Lab
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class ProductArchitect:
    def __init__(self):
        self.ai_route = None

    async def analyze_idea(self, idea: str, lang: str = "ar") -> Dict[str, Any]:
        if not self.ai_route:
            return {"recommendation": "AI غير متاح"}
        prompt = f"""أنت CTO خبير. حلل فكرة: "{idea}" من حيث: السوق، المنافسين، MVP، ونموذج الربح. اللغة: {lang}. أعط إجابة مختصرة (5-7 جمل)."""
        try:
            text, _ = await self.ai_route(prompt, task="product_analysis")
            return {"analysis": text, "recommendation": "الفكرة واعدة" if "واعد" in text else "تحتاج دراسة"}
        except:
            return {"recommendation": "تعذر التحليل"}

    async def make_technical_decision(self, question: str, options: List[str], lang: str = "ar") -> Dict:
        if not self.ai_route:
            return {"recommended": options[0] if options else ""}
        prompt = f"""سؤال تقني: {question}. الخيارات: {', '.join(options)}. اختر الأفضل مع تبرير. اللغة: {lang}."""
        try:
            text, _ = await self.ai_route(prompt, task="technical_decision")
            return {"analysis": text, "recommended": options[0]}
        except:
            return {"recommended": options[0]}

    async def startup_mode(self, idea: str, lang: str = "ar") -> Dict:
        if not self.ai_route: return {}
        pitch = await self._generate_pitch(idea, lang)
        roadmap = await self._generate_roadmap(idea, lang)
        return {"pitch_deck": pitch, "roadmap": roadmap}

    async def _generate_pitch(self, idea: str, lang: str) -> str:
        prompt = f"""Pitch Deck من 5 شرائح لفكرة: "{idea}". اللغة: {lang}."""
        try: text, _ = await self.ai_route(prompt, task="startup"); return text
        except: return ""

    async def _generate_roadmap(self, idea: str, lang: str) -> str:
        prompt = f"""Roadmap لفكرة: "{idea}" لمدة 6 أشهر. اللغة: {lang}."""
        try: text, _ = await self.ai_route(prompt, task="startup"); return text
        except: return ""


product_architect = ProductArchitect()
