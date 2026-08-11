"""
RECOVERY ENGINE – الطبقة الخامسة من Life Coach
=================================================
- اكتشاف الانتكاسة
- خطة تعافي (لا يبدأ من الصفر)
- تحليل سبب الانتكاسة
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class RecoveryEngine:
    def detect_relapse(self, current_state: Dict, previous_state: Dict) -> Dict[str, Any]:
        """اكتشاف ما إذا كان المستخدم قد انتكس"""
        relapse_score = 0
        triggers = []

        if previous_state.get("streak", 0) > current_state.get("streak", 0):
            relapse_score += 0.3
            triggers.append("broken_streak")
        
        if current_state.get("mood_valence", 0) < previous_state.get("mood_valence", 0) - 0.3:
            relapse_score += 0.3
            triggers.append("mood_drop")
        
        if current_state.get("energy", 50) < previous_state.get("energy", 50) - 20:
            relapse_score += 0.2
            triggers.append("energy_drop")

        return {
            "is_relapse": relapse_score > 0.4,
            "relapse_score": relapse_score,
            "triggers": triggers,
            "needs_intervention": relapse_score > 0.6,
        }

    def create_recovery_plan(self, goal: str, relapse_reason: str, lang: str = "ar") -> Dict[str, Any]:
        """بناء خطة تعافي"""
        plans = {
            "broken_streak": {
                "message_ar": "لا بأس، الانتكاسة جزء من الرحلة. دعنا نعود خطوة للوراء لننطلق أقوى.",
                "message_en": "It's okay, relapse is part of the journey. Let's step back to leap forward.",
                "steps": [
                    {"action": "تقليل الهدف للنصف", "duration": "3 أيام"},
                    {"action": "التركيز على عادة واحدة", "duration": "أسبوع"},
                    {"action": "العودة للمستوى السابق", "duration": "بعد أسبوع"},
                ],
            },
            "mood_drop": {
                "message_ar": "أرى أن مزاجك منخفض. دعنا نركز على صحتك النفسية أولاً.",
                "message_en": "I see your mood is low. Let's focus on your mental health first.",
                "steps": [
                    {"action": "تمارين تنفس يومية", "duration": "5 دقائق"},
                    {"action": "كتابة المشاعر", "duration": "يومياً"},
                    {"action": "استشارة متخصص إذا استمر", "duration": "بعد أسبوع"},
                ],
            },
        }
        return plans.get(relapse_reason, plans["broken_streak"])


recovery_engine = RecoveryEngine()
