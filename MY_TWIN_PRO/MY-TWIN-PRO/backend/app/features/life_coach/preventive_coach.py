"""
PREVENTIVE COACH v1.0 – التدخل الاستباقي
===========================================
- اكتشاف علامات الانتكاسة المبكرة
- التدخل قبل السقوط
- اقتراح تعديلات استباقية
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class PreventiveCoach:
    def check_and_intervene(self, user_id: str, current_state: Dict, history: List[Dict], lang: str = "ar") -> Dict[str, Any]:
        """فحص الحالة والتدخل إذا لزم الأمر"""
        
        # اكتشاف علامات الخطر
        warning_signs = self._detect_warning_signs(current_state, history)
        
        # تحديد مستوى التدخل
        intervention_level = self._determine_intervention_level(warning_signs)
        
        # بناء رسالة تدخل
        intervention_message = self._build_intervention_message(warning_signs, intervention_level, lang)
        
        # اقتراح إجراءات
        suggested_actions = self._suggest_actions(warning_signs, lang)
        
        return {
            "warning_signs_detected": len(warning_signs) > 0,
            "warning_signs": warning_signs,
            "intervention_level": intervention_level,
            "intervention_message": intervention_message,
            "suggested_actions": suggested_actions,
            "should_intervene": intervention_level in ["medium", "high"],
        }

    def _detect_warning_signs(self, current_state: Dict, history: List[Dict]) -> List[Dict]:
        """اكتشاف علامات الخطر المبكرة"""
        signs = []
        
        # انخفاض الالتزام
        if history and len(history) >= 3:
            recent_completions = sum(1 for h in history[-3:] if h.get("completed", False))
            if recent_completions <= 1:
                signs.append({
                    "type": "commitment_drop",
                    "severity": "high" if recent_completions == 0 else "medium",
                    "message_ar": "لاحظت أنك بدأت تتأخر عن أهدافك في الأيام الأخيرة.",
                    "message_en": "I noticed you've been falling behind on your goals lately.",
                })
        
        # انخفاض المزاج
        mood_valence = current_state.get("mood_valence", 0.5)
        if mood_valence < 0.3:
            signs.append({
                "type": "mood_drop",
                "severity": "high" if mood_valence < 0.1 else "medium",
                "message_ar": "مزاجك منخفض اليوم. هل تريد التحدث عن شيء يزعجك؟",
                "message_en": "Your mood seems low today. Want to talk about what's bothering you?",
            })
        
        # انخفاض الطاقة
        energy = current_state.get("energy", 50)
        if energy < 30:
            signs.append({
                "type": "energy_drop",
                "severity": "medium",
                "message_ar": "طاقتك منخفضة. ربما تحتاج لراحة اليوم.",
                "message_en": "Your energy is low. Maybe you need some rest today.",
            })
        
        # زيادة التوتر
        stress = current_state.get("stress_level", 0.3)
        if stress > 0.6:
            signs.append({
                "type": "stress_rise",
                "severity": "high" if stress > 0.8 else "medium",
                "message_ar": "مستوى التوتر مرتفع. دعنا نجرب تمرين تنفس سريع.",
                "message_en": "Your stress level is high. Let's try a quick breathing exercise.",
            })
        
        return signs

    def _determine_intervention_level(self, warning_signs: List[Dict]) -> str:
        """تحديد مستوى التدخل"""
        if not warning_signs:
            return "none"
        
        high_count = sum(1 for s in warning_signs if s["severity"] == "high")
        if high_count >= 2:
            return "high"
        elif high_count >= 1 or len(warning_signs) >= 3:
            return "medium"
        return "low"

    def _build_intervention_message(self, warning_signs: List[Dict], level: str, lang: str) -> str:
        """بناء رسالة التدخل"""
        if not warning_signs:
            return ""
        
        messages = [s.get(f"message_{lang}", s.get("message_ar", "")) for s in warning_signs[:2]]
        
        if lang == "ar":
            prefix = "مرحباً، " if level == "low" else "أهلاً، أريد أن أطمئن عليك. "
            return prefix + " ".join(messages)
        else:
            prefix = "Hey, " if level == "low" else "Hi, I wanted to check on you. "
            return prefix + " ".join(messages)

    def _suggest_actions(self, warning_signs: List[Dict], lang: str) -> List[Dict]:
        """اقتراح إجراءات"""
        actions = []
        
        for sign in warning_signs:
            if sign["type"] == "commitment_drop":
                actions.append({
                    "action_ar": "تخفيف الهدف هذا الأسبوع لتستعيد زخمك",
                    "action_en": "Ease up on your goal this week to regain momentum",
                    "type": "adjust_goal",
                })
            elif sign["type"] == "mood_drop":
                actions.append({
                    "action_ar": "جلسة حوار مفتوح لمدة 5 دقائق",
                    "action_en": "5-minute open talk session",
                    "type": "open_session",
                })
            elif sign["type"] == "stress_rise":
                actions.append({
                    "action_ar": "تمرين تنفس 4-7-8 (دقيقتان)",
                    "action_en": "4-7-8 breathing exercise (2 minutes)",
                    "type": "breathing",
                })
        
        return actions


preventive_coach = PreventiveCoach()
