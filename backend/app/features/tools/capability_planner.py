"""
CAPABILITY PLANNER v1.0 – العقل المدبر
===========================================
يخطط لأفضل تسلسل للقدرات لتحقيق هدف المستخدم.
يستخدم Scoring لاختيار القدرات المناسبة.
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("capability_planner")

class CapabilityPlanner:
    def __init__(self):
        self.ai_route = None

    async def plan(self, intent: str, capabilities: List[str], user_context: Dict = None, language: str = "ar") -> Dict[str, Any]:
        """بناء خطة: أي القدرات ننفذ؟ بأي ترتيب؟"""
        # Scoring لكل قدرة
        scored = []
        for cap in capabilities:
            score = self._score_capability(cap, user_context)
            scored.append({"capability": cap, "score": score})

        # ترتيب حسب الأولوية
        scored.sort(key=lambda x: x["score"], reverse=True)

        # بناء Pipeline
        pipeline = [c["capability"] for c in scored[:3]]  # أهم 3 قدرات

        # إضافة قدرات ذاكرة إذا كان السياق يتطلب
        if user_context and user_context.get("needs_memory"):
            pipeline.insert(0, "memory")

        plan = {
            "intent": intent,
            "capabilities_to_execute": pipeline,
            "scored_capabilities": scored,
            "estimated_steps": len(pipeline),
            "fallback": "general_response" if not pipeline else None,
        }

        # إذا لم تكن هناك قدرات، نستخدم AI لتوليد خطة
        if not pipeline and self.ai_route:
            try:
                prompt = f"""المستخدم يحتاج: "{intent}". اقترح 3 قدرات مناسبة من: memory, weather, news, study, business, code, life_coach, dream, recommendation. اللغة: {language}."""
                text, _ = await self.ai_route(prompt, task="general")
                plan["ai_suggested"] = text
            except: pass

        return plan

    def _score_capability(self, capability: str, context: Dict = None) -> int:
        """تقييم مدى ملاءمة القدرة"""
        base_scores = {
            "memory": 80, "emotion": 75, "weather": 60, "news": 50,
            "study": 70, "business": 65, "code": 60, "life_coach": 85,
            "dream": 55, "recommendation": 90,
        }
        score = base_scores.get(capability, 50)

        # تعديل حسب السياق
        if context:
            if capability == "study" and context.get("is_student"): score += 20
            if capability == "business" and context.get("is_entrepreneur"): score += 20
            if capability == "life_coach" and context.get("emotion") in ["sadness", "anxiety"]: score += 15

        return min(score, 100)


capability_planner = CapabilityPlanner()
