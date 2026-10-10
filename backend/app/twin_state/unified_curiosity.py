"""
Unified Curiosity Engine v2.0 — محرك الفضول الموحد
=====================================================
يتبع الدستور: لا يسأل في الحزن/الغضب/الخوف.
يستخدم 5 أنواع أسئلة: ذاكرة، عاطفة، اهتمام، مستقبل، رأي.
"""
import logging, random, asyncio
from typing import Optional, Dict, List
from datetime import datetime, timezone

logger = logging.getLogger("unified_curiosity")

try:
    from app.memory.unified_memory import unified_memory_engine
    MEMORY_AVAILABLE = True
except ImportError:
    MEMORY_AVAILABLE = False

try:
    from app.twin_state.personality_engine import get_personality_dna
    DNA_AVAILABLE = True
except ImportError:
    DNA_AVAILABLE = False

try:
    from app.twin_state.relationship_service import load as load_relationship
    RELATIONSHIP_AVAILABLE = True
except ImportError:
    RELATIONSHIP_AVAILABLE = False


class UnifiedCuriosityEngine:
    """محرك الفضول الموحد – يتبع الدستور."""
    
    async def should_ask(self, user_id: str) -> bool:
        """التحقق من شروط الدستور."""
        # 1. الفضول > 0.6
        if DNA_AVAILABLE:
            dna = await get_personality_dna(user_id)
            if dna.get("curiosity", 0.8) < 0.6:
                return False
        
        # 2. الرابطة > 40
        if RELATIONSHIP_AVAILABLE:
            rel = await load_relationship(user_id)
            if rel.get("bond_level", 0) < 40:
                return False
        
        return True
    
    async def can_ask_now(self, user_id: str, current_emotion: str) -> bool:
        """لا يسأل في الحزن/الغضب/الخوف."""
        forbidden = ["sadness", "anger", "fear"]
        if current_emotion in forbidden:
            return False
        return await self.should_ask(user_id)
    
    async def generate(self, user_id: str, lang: str = "ar") -> Optional[str]:
        """توليد سؤال فضولي."""
        try:
            # استرجاع ذكريات
            memories = []
            if MEMORY_AVAILABLE:
                mem_ctx = await unified_memory_engine.retrieve(user_id, "", limit=5)
                memories = mem_ctx.get("memories", [])
            
            # اختيار نوع السؤال
            question_types = [
                self._memory_question,
                self._emotional_question,
                self._interest_question,
                self._future_question,
                self._opinion_question,
            ]
            random.shuffle(question_types)
            for q_type in question_types:
                q = await q_type(user_id, memories, lang)
                if q:
                    return q
            return None
        except Exception as e:
            logger.debug(f"Curiosity skipped: {e}")
            return None
    
    async def _memory_question(self, user_id: str, memories: List, lang: str) -> Optional[str]:
        if not memories:
            return None
        mem = random.choice(memories)
        content = mem.get("content", "")[:80]
        if lang == "ar":
            return f"هل تتذكر عندما تحدثنا عن '{content}'؟ كيف تطور الأمر؟"
        return f"Do you remember when we talked about '{content}'? How has it been going?"
    
    async def _emotional_question(self, user_id: str, memories: List, lang: str) -> Optional[str]:
        if lang == "ar":
            return "كيف تشعر اليوم مقارنة بالأمس؟"
        return "How are you feeling today compared to yesterday?"
    
    async def _interest_question(self, user_id: str, memories: List, lang: str) -> Optional[str]:
        if lang == "ar":
            return "ما هو أكثر شيء يشغل بالك هذه الأيام؟"
        return "What's been on your mind most these days?"
    
    async def _future_question(self, user_id: str, memories: List, lang: str) -> Optional[str]:
        questions_ar = [
            "كيف ترى نفسك بعد سنة من الآن؟",
            "ما هو أكثر شيء متحمس له في المستقبل؟",
        ]
        questions_en = [
            "Where do you see yourself a year from now?",
            "What are you most excited about in the future?",
        ]
        return random.choice(questions_ar if lang == "ar" else questions_en)
    
    async def _opinion_question(self, user_id: str, memories: List, lang: str) -> Optional[str]:
        questions_ar = [
            "ما هو أهم درس تعلمته في الحياة؟",
            "هل تعتقد أن الإنسان يتغير مع الوقت؟",
        ]
        questions_en = [
            "What's the most important lesson life has taught you?",
            "Do you think people really change over time?",
        ]
        return random.choice(questions_ar if lang == "ar" else questions_en)


unified_curiosity_engine = UnifiedCuriosityEngine()
logger.info("✅ Unified Curiosity Engine v2.0 ready")
