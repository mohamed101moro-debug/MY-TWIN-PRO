"""
COACH PLANNER – الطبقة الثالثة من Life Coach
===============================================
- بناء خطط 7 / 30 / 90 يوم
- تخصيص حسب التحليل
- متابعة وتعديل
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


class CoachPlanner:
    def create_plan(self, analysis: Dict, goal: str, lang: str = "ar") -> Dict[str, Any]:
        """بناء خطة متكاملة حسب التحليل والهدف"""
        emotion = analysis.get("emotion", {})
        domains = analysis.get("life_domains", {})
        distortions = analysis.get("cognitive_distortions", [])

        plan = {
            "goal": goal,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "phases": [],
            "daily_actions": [],
            "weekly_review": True,
            "adaptation_strategy": "progressive",
        }

        # المرحلة 1: الاستقرار (7 أيام)
        phase1 = {
            "name_ar": "الاستقرار",
            "name_en": "Stabilization",
            "duration_days": 7,
            "focus": "بناء أساس آمن",
            "actions": self._get_phase1_actions(emotion, distortions, lang),
        }
        plan["phases"].append(phase1)

        # المرحلة 2: النمو (30 يوم)
        phase2 = {
            "name_ar": "النمو",
            "name_en": "Growth",
            "duration_days": 23,
            "focus": "تطوير العادات والمهارات",
            "actions": self._get_phase2_actions(domains, goal, lang),
        }
        plan["phases"].append(phase2)

        # المرحلة 3: التمكين (90 يوم)
        phase3 = {
            "name_ar": "التمكين",
            "name_en": "Empowerment",
            "duration_days": 60,
            "focus": "الاستقلالية والثقة",
            "actions": self._get_phase3_actions(goal, lang),
        }
        plan["phases"].append(phase3)

        return plan

    def _get_phase1_actions(self, emotion: Dict, distortions: List, lang: str) -> List[Dict]:
        actions = []
        if emotion.get("needs_support"):
            actions.append({"action_ar": "تمارين تنفس يومية", "action_en": "Daily breathing exercises", "frequency": "مرتين يومياً"})
        if distortions:
            actions.append({"action_ar": "تحدي الأفكار السلبية", "action_en": "Challenge negative thoughts", "frequency": "عند الحاجة"})
        actions.append({"action_ar": "تسجيل المشاعر يومياً", "action_en": "Daily mood journal", "frequency": "مساء"})
        return actions

    def _get_phase2_actions(self, domains: Dict, goal: str, lang: str) -> List[Dict]:
        actions = []
        if "health" in domains:
            actions.append({"action_ar": "خطة غذائية مخصصة", "action_en": "Personalized meal plan", "frequency": "يومي"})
            actions.append({"action_ar": "برنامج رياضي", "action_en": "Workout program", "frequency": "3 مرات أسبوعياً"})
        if "work" in domains:
            actions.append({"action_ar": "تنظيم وقت العمل", "action_en": "Work time management", "frequency": "يومي"})
        if "relationships" in domains:
            actions.append({"action_ar": "تخصيص وقت للعلاقات", "action_en": "Quality time for relationships", "frequency": "أسبوعي"})
        return actions

    def _get_phase3_actions(self, goal: str, lang: str) -> List[Dict]:
        return [
            {"action_ar": "مراجعة شاملة للتقدم", "action_en": "Comprehensive progress review", "frequency": "شهري"},
            {"action_ar": "تحديد أهداف جديدة", "action_en": "Set new goals", "frequency": "كل 90 يوم"},
        ]

    def adjust_plan(self, current_plan: Dict, feedback: Dict) -> Dict:
        """تعديل الخطة حسب التقدم والملاحظات"""
        if feedback.get("too_hard"):
            current_plan["adaptation_strategy"] = "ease"
            for phase in current_plan.get("phases", []):
                phase["duration_days"] = int(phase["duration_days"] * 1.2)
        elif feedback.get("too_easy"):
            current_plan["adaptation_strategy"] = "accelerate"
            for phase in current_plan.get("phases", []):
                phase["duration_days"] = int(phase["duration_days"] * 0.8)
        return current_plan


coach_planner = CoachPlanner()
