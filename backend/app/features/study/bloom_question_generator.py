"""
ADAPTIVE BLOOM QUESTION GENERATOR v2.1 – مع حقن AI
"""
import logging, random
from typing import Dict, Any, List, Optional

logger = logging.getLogger("bloom_generator")

BLOOM_LEVELS = {
    1: {"name_ar": "تذكُّر", "verbs_ar": ["اذكر", "عدد", "عرّف"]},
    2: {"name_ar": "فهم", "verbs_ar": ["اشرح", "لخص", "قارن"]},
    3: {"name_ar": "تطبيق", "verbs_ar": ["طبق", "استخدم", "حل"]},
    4: {"name_ar": "تحليل", "verbs_ar": ["حلل", "فرق", "استنتج"]},
    5: {"name_ar": "تقييم", "verbs_ar": ["قيّم", "انقد", "برر"]},
    6: {"name_ar": "إبداع", "verbs_ar": ["صمم", "أنشئ", "اخترع"]},
}

class BloomQuestionGenerator:
    def __init__(self):
        self.ai_route = None
        self.memory_client = None

    async def generate_adaptive_question(self, concept: str, user_id: str, age_group: str = "teen", language: str = "ar") -> Dict[str, Any]:
        current_level = await self._get_current_level(user_id, concept)
        return await self.generate_question(concept, current_level, age_group, language)

    async def generate_question(self, concept: str, bloom_level: int = 1, age_group: str = "teen", language: str = "ar") -> Dict[str, Any]:
        level = BLOOM_LEVELS.get(bloom_level, BLOOM_LEVELS[1])
        verb = random.choice(level.get("verbs_ar", ["اذكر"]))
        
        question_text = f"{verb} {concept}؟"
        if self.ai_route:
            try:
                prompt = self._build_prompt(concept, verb, age_group, language)
                result = await self.ai_route(prompt, task="study")
                if result: question_text = result
            except: pass
        
        return {"question": question_text, "bloom_level": bloom_level, "bloom_name": level.get("name_ar", ""), "verb_used": verb}

    def _build_prompt(self, concept, verb, age_group, language):
        if language == "ar":
            return f"أنشئ سؤالاً واحداً بمستوى {verb} عن '{concept}' لطالب في مرحلة {age_group}. أجب بالسؤال فقط."
        return f"Create one question at the level of '{verb}' about '{concept}' for a {age_group} student. Answer with the question only."

    async def _get_current_level(self, user_id: str, concept: str) -> int:
        if self.memory_client:
            try:
                mind = await self.memory_client.get_entity("learning_mind", user_id)
                if mind:
                    confidence = mind.get("learning_confidence", {}).get(concept, 0.5)
                    if confidence < 0.3: return 1
                    if confidence < 0.5: return 2
                    if confidence < 0.7: return 3
                    if confidence < 0.85: return 4
                    return 5
            except: pass
        return 2


bloom_gen = BloomQuestionGenerator()
