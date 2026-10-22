"""
SLEEP COACH v1.0 – محرك النوم المستقل
========================================
- تحليل جودة النوم
- حساب ساعات النوم المثالية
- نصائح حسب المشكلة (أرق، استيقاظ متكرر، نوم غير مريح)
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class SleepCoach:
    def analyze(self, sleep_data: Dict, profile: Dict, lang: str = "ar") -> Dict[str, Any]:
        """تحليل شامل للنوم"""
        
        hours = sleep_data.get("hours", 6)
        quality = sleep_data.get("quality", "medium")  # poor, medium, good
        issues = sleep_data.get("issues", [])
        
        # تحليل جودة النوم
        analysis = self._analyze_sleep_quality(hours, quality, issues, profile)
        
        # نصائح مخصصة
        tips = self._generate_sleep_tips(issues, profile, lang)
        
        # روتين مقترح
        routine = self._build_sleep_routine(profile, lang)
        
        return {
            "analysis": analysis,
            "tips": tips,
            "routine": routine,
            "optimal_hours": self._calculate_optimal_sleep(profile),
        }

    def _analyze_sleep_quality(self, hours: float, quality: str, issues: List[str], profile: Dict) -> Dict:
        score = 0
        if hours >= 7.5:
            score += 40
        elif hours >= 6:
            score += 25
        else:
            score += 10
        
        quality_scores = {"good": 40, "medium": 25, "poor": 10}
        score += quality_scores.get(quality, 20)
        
        score -= len(issues) * 5
        score = max(0, min(score, 100))
        
        return {
            "sleep_score": score,
            "rating": "good" if score >= 70 else ("medium" if score >= 40 else "poor"),
            "hours_recorded": hours,
            "deficit": max(0, 7.5 - hours),
        }

    def _calculate_optimal_sleep(self, profile: Dict) -> float:
        age = profile.get("age", 30)
        if age < 18:
            return 9.0
        elif age < 25:
            return 8.5
        elif age < 65:
            return 7.5
        return 7.0

    def _generate_sleep_tips(self, issues: List[str], profile: Dict, lang: str) -> List[str]:
        tips = []
        if lang == "ar":
            if "أرق" in str(issues) or "insomnia" in str(issues).lower():
                tips.extend(["تجنب الشاشات قبل النوم بساعة", "جرب القراءة الورقية", "استخدم تقنية 4-7-8 للتنفس"])
            if "استيقاظ" in str(issues) or "waking" in str(issues).lower():
                tips.extend(["تجنب الكافيين بعد 4 مساءً", "تأكد من درجة حرارة الغرفة (18-22°C)"])
            if "نوم غير مريح" in str(issues) or "unrefreshing" in str(issues).lower():
                tips.extend(["تأكد من جودة المرتبة والوسادة", "مارس الرياضة بانتظام (وليس قبل النوم مباشرة)"])
            tips.extend(["نم واستيقظ في نفس الموعد يومياً", "اجعل غرفة النوم مظلمة وهادئة"])
        else:
            tips.extend(["Avoid screens 1 hour before bed", "Try reading a physical book", "Use 4-7-8 breathing technique"])
            tips.extend(["Keep consistent sleep/wake times", "Make your bedroom dark and quiet"])
        return tips[:5]

    def _build_sleep_routine(self, profile: Dict, lang: str) -> List[Dict]:
        if lang == "ar":
            return [
                {"time": "قبل النوم بـ 90 دقيقة", "action": "إطفاء الشاشات"},
                {"time": "قبل النوم بـ 60 دقيقة", "action": "حمام دافئ أو قراءة"},
                {"time": "قبل النوم بـ 30 دقيقة", "action": "تأمل أو تنفس عميق"},
                {"time": "قبل النوم بـ 5 دقائق", "action": "كتابة 3 أشياء إيجابية حدثت اليوم"},
            ]
        return [
            {"time": "90 min before bed", "action": "Turn off screens"},
            {"time": "60 min before bed", "action": "Warm bath or reading"},
            {"time": "30 min before bed", "action": "Meditation or deep breathing"},
            {"time": "5 min before bed", "action": "Write 3 positive things from today"},
        ]


sleep_coach = SleepCoach()
