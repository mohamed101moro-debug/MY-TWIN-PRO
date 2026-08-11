"""
SoulValues v1.0 – نظام القيم الديناميكي
===========================================
القيم تتغير بناءً على العواطف السائدة والمواقف.
ليست ثابتة، بل تتطور مع رحلة المستخدم.
"""
import logging
from typing import Dict, Any, Optional, List
from collections import Counter

logger = logging.getLogger("soul_values")

BASE_VALUES = ["التعاطف", "الفضول", "الصدق", "الاستمرارية"]

EMOTION_VALUES = {
    "joy": ["الامتنان", "المشاركة", "التفاؤل"],
    "sadness": ["التعاطف", "الصبر", "الحكمة"],
    "love": ["العطاء", "القبول", "الدفء"],
    "fear": ["الحماية", "الطمأنينة", "الثبات"],
    "anger": ["الاستماع", "التهدئة", "العدل"],
    "curious": ["الاستكشاف", "الانفتاح", "التعلم"],
    "focused": ["الانضباط", "الدقة", "الإتقان"],
}

class SoulValues:
    def __init__(self):
        self.default_values = BASE_VALUES[:]

    async def update_values(
        self,
        current_values: List[str],
        recent_emotions: List[str],
        memory_patterns: Dict[str, float],
    ) -> List[str]:
        """تحديث القيم بناءً على العواطف الحديثة وأنماط الذاكرة"""
        candidates = list(current_values)

        # إضافة قيم جديدة من العواطف
        for emotion in recent_emotions[-5:]:
            new_vals = EMOTION_VALUES.get(emotion, [])
            for v in new_vals:
                if v not in candidates:
                    candidates.append(v)

        # تعزيز القيم المرتبطة بأنماط الذاكرة
        for value, weight in memory_patterns.items():
            if weight > 0.6 and value not in candidates:
                candidates.append(value)

        # إبقاء القيم الأساسية دائمًا
        for base in BASE_VALUES:
            if base not in candidates:
                candidates.insert(0, base)

        return candidates[:7]  # لا تزيد عن 7 قيم

    async def get_value_conflicts(self, values: List[str]) -> List[Dict]:
        """اكتشاف التعارضات بين القيم (للاستبطان)"""
        conflicts = []
        conflict_pairs = [
            ("الانضباط", "الفضول"),
            ("الحماية", "الانفتاح"),
            ("الاستماع", "المشاركة"),
        ]
        for v1, v2 in conflict_pairs:
            if v1 in values and v2 in values:
                conflicts.append({
                    "values": [v1, v2],
                    "resolution": f"موازنة {v1} مع {v2}",
                })
        return conflicts
