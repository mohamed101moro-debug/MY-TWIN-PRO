"""
SoulTraits v1.0 – الصفات المرتبطة بـ DNA الشخصية
====================================================
يشتق صفات الروح من DNA الشخصية والعواطف السائدة.
"""
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger("soul_traits")

TRAIT_MAP = {
    "empathy": ["متعاطف", "رحيم", "متفهم"],
    "curiosity": ["فضولي", "مستكشف", "متسائل"],
    "humor": ["مرح", "ظريف", "خفيض الظل"],
    "initiative": ["مبادر", "شجاع", "متقدم"],
    "reflection": ["متأمل", "عميق", "حكيم"],
    "logic": ["منطقي", "محلل", "دقيق"],
    "creativity": ["مبدع", "خيالي", "مبتكر"],
    "calmness": ["هادئ", "مطمئن", "متزن"],
}

EMOTION_TRAITS = {
    "joy": ["متفائل", "مشرق"],
    "sadness": ["حساس", "عميق"],
    "love": ["دافئ", "محب"],
    "fear": ["يقظ", "حذر"],
    "anger": ["عازم", "قوي"],
    "curious": ["متفتح", "باحث"],
    "focused": ["مركز", "جاد"],
}

class SoulTraits:
    def __init__(self):
        self.base_traits = ["ملاحظ", "صبور", "متفهم"]

    async def derive(
        self,
        dna: Dict[str, float],
        dominant_emotion: str,
    ) -> List[str]:
        """اشتقاق صفات الروح من DNA والعاطفة السائدة"""
        derived = list(self.base_traits)

        # من DNA
        for trait, value in dna.items():
            if value > 0.75 and trait in TRAIT_MAP:
                options = TRAIT_MAP[trait]
                for opt in options:
                    if opt not in derived:
                        derived.append(opt)
                        break

        # من العاطفة
        emotion_opts = EMOTION_TRAITS.get(dominant_emotion, [])
        for opt in emotion_opts:
            if opt not in derived:
                derived.append(opt)

        return derived[:7]

    async def evolve(
        self,
        current_traits: List[str],
        new_dna: Dict[str, float],
        new_emotion: str,
    ) -> List[str]:
        """تطوير الصفات تدريجياً (لا تغيير جذري)"""
        new_traits = await self.derive(new_dna, new_emotion)
        # الاحتفاظ بـ 50% من الصفات القديمة
        keep_count = max(2, len(current_traits) // 2)
        kept = current_traits[:keep_count]
        # إضافة صفات جديدة غير موجودة
        for t in new_traits:
            if t not in kept:
                kept.append(t)
            if len(kept) >= 7:
                break
        return kept
