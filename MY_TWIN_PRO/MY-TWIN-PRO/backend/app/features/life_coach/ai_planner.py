"""
AI PLANNER v1.0 – مخطط هجين (AI + Rules)
===========================================
- يجمع بين Rules المحلية و AI
- يختار أفضل استراتيجية للخطة
- يتكيف مع تفضيلات المستخدم
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class AIPlanner:
    def create_hybrid_plan(self, analysis: Dict, goal: str, user_context: Dict, ai_route=None, lang: str = "ar") -> Dict[str, Any]:
        """بناء خطة هجينة"""
        
        # Rules-based: الأساس
        base_plan = self._build_base_plan(goal, analysis, lang)
        
        # AI-enhanced: تحسين الخطة
        if ai_route:
            try:
                ai_suggestions = self._get_ai_suggestions(goal, user_context, ai_route, lang)
                base_plan["ai_suggestions"] = ai_suggestions
            except:
                base_plan["ai_suggestions"] = []
        
        return base_plan

    def _build_base_plan(self, goal: str, analysis: Dict, lang: str) -> Dict[str, Any]:
        """بناء الخطة الأساسية (Rules)"""
        emotion = analysis.get("emotion", {})
        distortions = analysis.get("cognitive_distortions", [])
        
        plan = {
            "goal": goal,
            "approach": "hybrid",
            "phases": [
                {"phase": 1, "name_ar": "الاستقرار", "name_en": "Stabilization", "days": 7, "focus": "بناء روتين أساسي"},
                {"phase": 2, "name_ar": "النمو", "name_en": "Growth", "days": 23, "focus": "تطوير العادات"},
                {"phase": 3, "name_ar": "التمكين", "name_en": "Empowerment", "days": 60, "focus": "الاستقلالية"},
            ],
        }
        
        if distortions:
            plan["phases"][0]["cbt_exercises"] = ["تحدي الأفكار السلبية", "إعادة الصياغة"]
        
        return plan

    async def _get_ai_suggestions(self, goal: str, context: Dict, ai_route, lang: str) -> List[str]:
        """الحصول على اقتراحات من AI"""
        prompt = f"اقترح 3 تعديلات عملية لخطة تحقيق هدف: '{goal}'. السياق: {context}. اللغة: {lang}. كن موجزاً."
        response, _ = await ai_route(prompt, task="planning")
        # استخراج الاقتراحات من النص
        suggestions = [line.strip("- ") for line in response.split("\n") if line.strip().startswith("-")][:3]
        return suggestions if suggestions else [response[:200]]


ai_planner = AIPlanner()
