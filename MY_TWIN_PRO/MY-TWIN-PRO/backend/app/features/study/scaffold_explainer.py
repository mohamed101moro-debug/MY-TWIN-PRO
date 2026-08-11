"""
S.C.A.F.F.O.L.D. EXPLAINER v2.0 – مع سياق طويل المدى
"""
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger("scaffold_explainer")

try:
    from app.infrastructure.ai.provider_router import provider_router
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False

class ScaffoldExplainer:
    def __init__(self):
        pass

    async def explain(self, concept: str, student_profile: Dict[str, Any], age_group: str = "teen", language: str = "ar", current_emotion: str = "neutral", depth: int = 1, user_id: str = None, memory_client = None) -> Dict[str, Any]:
        # بناء سياق طويل المدى
        previous_context = ""
        if memory_client and user_id:
            try:
                history = await memory_client.get_entity_list("learning_history", user_id)
                if history:
                    relevant = [s for s in history[-5:] if s.get("subject") == concept]
                    if relevant:
                        last = relevant[-1]
                        previous_context = f"آخر مرة شرحت فيها هذا المفهوم، استخدمت مستوى {last.get('depth_reached', 1)} وكانت دقة الطالب {last.get('accuracy', 0) * 100:.0f}%."
            except: pass
        
        prompt = self._build_prompt(concept, student_profile, age_group, language, current_emotion, depth, previous_context)
        
        explanation = {"simplified": "", "connection": "", "analogy": "", "fragments": [], "check_question": "", "emotion_note": "", "ladder_hint": ""}
        
        if AI_AVAILABLE:
            try:
                response = await provider_router.generate(prompt, language=language)
                if response:
                    explanation["simplified"] = response
            except Exception as e:
                logger.error(f"AI generation failed: {e}")
        
        notes = {
            "frustration": {"ar": "أشعر أنك مجتهد. دعنا نأخذها خطوة بخطوة 💪", "en": "Let's take it step by step 💪"},
            "confident": {"ar": "ممتاز! دعنا نستغل حماسك! 🎯", "en": "Great! Let's use this energy! 🎯"},
        }
        explanation["emotion_note"] = notes.get(current_emotion, {}).get(language, "")
        
        return explanation

    def _build_prompt(self, concept, profile, age_group, language, emotion, depth, previous_context):
        people = profile.get("important_people", [])
        traits = profile.get("identity_traits", [])
        
        if language == "ar":
            prompt = f"""أنت معلم خبير في شرح المفاهيم للطلاب.
قم بشرح مفهوم "{concept}" لطالب في مرحلة {age_group}.
{previous_context}
استخدم أسلوب S.C.A.F.F.O.L.D:
1. بسّط المفهوم في جملة واحدة.
2. اربطه بحياة الطالب.
3. قدم تشبيهاً من عالم الطالب.
4. قسمه إلى 3-5 أجزاء صغيرة.
5. اطرح سؤالاً للتحقق من الفهم.
6. لاحظ أن الطالب يشعر بـ {emotion} وتكيف معه.
7. قدم تلميحاً للتعمق أو إعادة الشرح.
أجب بالعربية الفصحى المبسطة."""
        else:
            prompt = f"""You are an expert teacher. Explain "{concept}" to a {age_group} student.
{previous_context}
Use the S.C.A.F.F.O.L.D method. Respond in English."""
        return prompt


scaffold = ScaffoldExplainer()
