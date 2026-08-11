"""
FITNESS INTELLIGENCE v1.0 – ذكاء رياضي متكامل
==================================================
- تخصيص التمارين حسب: إصابات الركبة، الظهر، السمنة، السكري، الحمل، العمر
- مستويات أمان للتمارين
- برامج متدرجة
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class FitnessIntelligence:
    def comprehensive_plan(self, profile: Dict, goal: str, lang: str = "ar") -> Dict[str, Any]:
        """بناء خطة لياقة مخصصة بالكامل"""
        
        # تقييم مستوى الأمان
        safety = self._assess_safety(profile)
        
        # اختيار التمارين المناسبة
        exercises = self._select_exercises(profile, goal, safety)
        
        # بناء جدول أسبوعي
        schedule = self._build_weekly_schedule(exercises, profile, safety, lang)
        
        return {
            "safety_assessment": safety,
            "exercises": exercises,
            "weekly_schedule": schedule,
            "contraindications": safety["contraindicated_exercises"],
            "recommended_intensity": safety["max_intensity"],
            "warm_up": self._get_warm_up(safety, lang),
            "cool_down": self._get_cool_down(safety, lang),
        }

    def _assess_safety(self, profile: Dict) -> Dict[str, Any]:
        """تقييم السلامة وتحديد الموانع"""
        contraindicated = []
        max_intensity = "high"
        precautions = []
        
        injuries = profile.get("injuries", [])
        medical = profile.get("medical_conditions", [])
        weight = profile.get("weight", 70)
        height = profile.get("height", 170)
        bmi = weight / ((height / 100) ** 2)
        age = profile.get("age", 30)
        is_pregnant = profile.get("pregnant", False)
        
        # فحص الإصابات
        if any("ركبة" in str(i) or "knee" in str(i).lower() for i in injuries):
            contraindicated.extend(["القرفصاء العميق", "الجري لمسافات طويلة", "القفز"])
            max_intensity = "low"
            precautions.append("تجنب تمارين الركبة عالية التأثير")
        
        if any("ظهر" in str(i) or "back" in str(i).lower() for i in injuries):
            contraindicated.extend(["رفع الأثقال الثقيلة", "الانحناءات الأمامية"])
            max_intensity = "low"
            precautions.append("حافظ على استقامة الظهر دائماً")
        
        if any("كتف" in str(i) or "shoulder" in str(i).lower() for i in injuries):
            contraindicated.extend(["تمارين فوق الرأس", "السباحة لمسافات طويلة"])
            max_intensity = "medium"
        
        # فحص الحالات الطبية
        if "سكري" in str(medical) or "diabetes" in str(medical).lower():
            precautions.append("افحص السكر قبل وبعد التمرين")
            precautions.append("احمل وجبة خفيفة معك")
        
        if "ضغط" in str(medical) or "hypertension" in str(medical).lower():
            contraindicated.extend(["تمارين رفع الأثقال الثقيلة"])
            max_intensity = "medium"
            precautions.append("تجنب حبس النفس أثناء التمرين")
        
        # السمنة
        if bmi > 35:
            contraindicated.extend(["الجري", "القفز", "القرفصاء العميق"])
            max_intensity = "low"
            precautions.append("ابدأ بالمشي والسباحة")
            precautions.append("تجنب التمارين عالية التأثير على المفاصل")
        
        # العمر
        if age > 60:
            max_intensity = "low"
            precautions.append("استشر طبيبك قبل البدء")
            precautions.append("زد الإحماء تدريجياً")
        
        # الحمل
        if is_pregnant:
            contraindicated.extend(["تمارين البطن", "الاستلقاء على الظهر", "رفع الأثقال"])
            max_intensity = "low"
            precautions.append("استشيري طبيبك قبل أي تمرين")
        
        return {
            "contraindicated_exercises": list(set(contraindicated)),
            "max_intensity": max_intensity,
            "precautions": precautions,
            "bmi": round(bmi, 1),
            "safe_to_exercise": max_intensity != "none",
        }

    def _select_exercises(self, profile: Dict, goal: str, safety: Dict) -> Dict[str, List[Dict]]:
        """اختيار التمارين المناسبة"""
        contraindicated = safety["contraindicated_exercises"]
        max_intensity = safety["max_intensity"]
        
        all_exercises = {
            "cardio": [
                {"name": "المشي", "intensity": "low", "calories_30min": 120},
                {"name": "المشي السريع", "intensity": "medium", "calories_30min": 180},
                {"name": "الجري", "intensity": "high", "calories_30min": 300},
                {"name": "السباحة", "intensity": "medium", "calories_30min": 250},
                {"name": "ركوب الدراجة", "intensity": "medium", "calories_30min": 220},
                {"name": "نط الحبل", "intensity": "high", "calories_30min": 350},
            ],
            "strength": [
                {"name": "تمارين وزن الجسم (Push-ups)", "intensity": "medium", "target": "الصدر والذراعين"},
                {"name": "القرفصاء (Squats)", "intensity": "medium", "target": "الأرجل"},
                {"name": "رفع أثقال خفيفة", "intensity": "medium", "target": "كامل الجسم"},
                {"name": "تمارين المقاومة", "intensity": "high", "target": "كامل الجسم"},
            ],
            "flexibility": [
                {"name": "اليوغا", "intensity": "low", "duration": "15-30 دقيقة"},
                {"name": "تمارين الإطالة", "intensity": "low", "duration": "10-15 دقيقة"},
                {"name": "البيلاتس", "intensity": "medium", "duration": "20-30 دقيقة"},
            ],
        }
        
        # تصفية التمارين حسب الموانع ومستوى الشدة
        selected = {"cardio": [], "strength": [], "flexibility": []}
        
        for category, exercises in all_exercises.items():
            for ex in exercises:
                if ex["name"] not in contraindicated:
                    if max_intensity == "high" or ex["intensity"] == "low" or ex["intensity"] == max_intensity:
                        selected[category].append(ex)
        
        return selected

    def _build_weekly_schedule(self, exercises: Dict, profile: Dict, safety: Dict, lang: str) -> List[Dict]:
        """بناء جدول أسبوعي"""
        days_ar = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]
        days_en = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        days = days_ar if lang == "ar" else days_en
        
        schedule = []
        cardio = exercises.get("cardio", [])
        strength = exercises.get("strength", [])
        flexibility = exercises.get("flexibility", [])
        
        for i, day in enumerate(days):
            if day in (["الجمعة"] if lang == "ar" else ["Friday"]):
                schedule.append({"day": day, "activity": "راحة" if lang == "ar" else "Rest", "type": "rest"})
            elif i % 2 == 0 and cardio:
                ex = cardio[0]
                schedule.append({"day": day, "activity": f"{ex['name']} - 30 دقيقة", "type": "cardio", "intensity": ex["intensity"]})
            elif i % 2 == 1 and strength:
                ex = strength[0]
                schedule.append({"day": day, "activity": f"{ex['name']} - 15 دقيقة", "type": "strength", "intensity": ex["intensity"]})
            elif flexibility:
                ex = flexibility[0]
                schedule.append({"day": day, "activity": f"{ex['name']} - {ex.get('duration', '15 دقيقة')}", "type": "flexibility"})
            else:
                schedule.append({"day": day, "activity": "راحة نشطة (مشي خفيف)" if lang == "ar" else "Active rest (light walk)", "type": "rest"})
        
        return schedule

    def _get_warm_up(self, safety: Dict, lang: str) -> List[str]:
        if lang == "ar":
            return ["المشي في المكان 3 دقائق", "تحريك الذراعين 2 دقيقة", "تمارين إطالة خفيفة 5 دقائق"]
        return ["Walk in place 3 min", "Arm circles 2 min", "Light stretching 5 min"]

    def _get_cool_down(self, safety: Dict, lang: str) -> List[str]:
        if lang == "ar":
            return ["تمارين إطالة 5 دقائق", "تنفس عميق 2 دقيقة", "شرب كوب ماء"]
        return ["Stretching 5 min", "Deep breathing 2 min", "Drink water"]


fitness_intelligence = FitnessIntelligence()
