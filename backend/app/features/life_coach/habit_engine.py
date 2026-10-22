"""
HABIT ENGINE – الطبقة الرابعة من Life Coach
==============================================
- بناء عادات ذكية (Stacking)
- متابعة الالتزام اليومي
- حساب Streak
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


class HabitEngine:
    def create_habit_plan(self, goal: str, user_profile: Dict, lang: str = "ar") -> Dict[str, Any]:
        """بناء خطة عادات مرتبطة بالهدف"""
        habits = self._suggest_habits(goal, user_profile)
        
        return {
            "goal": goal,
            "habits": habits,
            "strategy": "habit_stacking",
            "start_date": datetime.now(timezone.utc).isoformat(),
            "review_after_days": 7,
            "tips": self._get_habit_tips(lang),
        }

    def _suggest_habits(self, goal: str, profile: Dict) -> List[Dict]:
        """اقتراح عادات حسب الهدف والملف الشخصي"""
        base_habits = {
            "فقدان دهون": [
                {"habit": "شرب كوب ماء قبل كل وجبة", "frequency": "daily", "time": "قبل الأكل"},
                {"habit": "المشي 10 دقائق بعد الغداء", "frequency": "daily", "time": "بعد الظهر"},
                {"habit": "تسجيل الوجبات", "frequency": "daily", "time": "مساء"},
            ],
            "بناء عضلات": [
                {"habit": "تناول بروتين بعد التمرين", "frequency": "daily", "time": "بعد التمرين"},
                {"habit": "النوم 7-8 ساعات", "frequency": "daily", "time": "ليل"},
                {"habit": "تسجيل التمارين", "frequency": "daily", "time": "بعد التمرين"},
            ],
            "تحسين الصحة النفسية": [
                {"habit": "كتابة 3 أشياء ممتن لها", "frequency": "daily", "time": "صباح"},
                {"habit": "التنفس العميق 5 دقائق", "frequency": "daily", "time": "عند التوتر"},
                {"habit": "عدم استخدام الهاتف قبل النوم", "frequency": "daily", "time": "قبل النوم"},
            ],
        }
        return base_habits.get(goal, base_habits["تحسين الصحة النفسية"])

    def _get_habit_tips(self, lang: str) -> List[str]:
        if lang == "ar":
            return [
                "ابدأ بعادة واحدة فقط",
                "اربط العادة الجديدة بعادة موجودة",
                "تتبع تقدمك يومياً",
                "لا تقسو على نفسك إذا فشلت يوماً",
            ]
        return [
            "Start with just one habit",
            "Link new habit to existing one",
            "Track progress daily",
            "Don't be hard on yourself if you miss a day",
        ]

    def calculate_streak(self, habit_log: List[Dict]) -> int:
        """حساب أطول سلسلة التزام"""
        if not habit_log:
            return 0
        sorted_log = sorted(habit_log, key=lambda x: x.get("date", ""), reverse=True)
        streak = 0
        for i, entry in enumerate(sorted_log):
            if entry.get("completed"):
                streak += 1
            else:
                break
        return streak


habit_engine = HabitEngine()
