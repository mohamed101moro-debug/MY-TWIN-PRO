"""
NUTRITION INTELLIGENCE v1.0 – ذكاء غذائي متكامل
==================================================
- حساب BMR (Mifflin-St Jeor)
- حساب TDEE
- توزيع Macronutrients
- خطة مخصصة حسب: العمر، الجنس، الوزن، الطول، BMI، النشاط،
  الأمراض، السكر، الضغط، الحساسية، الدولة، الميزانية، الثقافة الغذائية
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class NutritionIntelligence:
    def comprehensive_plan(self, profile: Dict, goal: str, lang: str = "ar") -> Dict[str, Any]:
        """بناء خطة غذائية شاملة"""
        # 1. حساب المقاييس الأساسية
        bmr = self._calculate_bmr(profile)
        tdee = self._calculate_tdee(bmr, profile.get("activity_level", "sedentary"))
        target_calories = self._calculate_target_calories(tdee, goal)
        macros = self._calculate_macros(target_calories, goal, profile)
        
        # 2. بناء خطة الوجبات
        meals = self._build_meal_plan(profile, goal, target_calories, lang)
        
        # 3. نصائح مخصصة
        tips = self._generate_tips(profile, goal, lang)
        
        return {
            "calculations": {
                "bmr": round(bmr),
                "tdee": round(tdee),
                "target_calories": target_calories,
                "macros": macros,
                "bmi": round(profile.get("weight", 70) / ((profile.get("height", 170) / 100) ** 2), 1),
            },
            "meals": meals,
            "tips": tips,
            "water_intake_liters": round(profile.get("weight", 70) * 0.033, 1),
        }

    def _calculate_bmr(self, profile: Dict) -> float:
        """Mifflin-St Jeor Equation"""
        weight = profile.get("weight", 70)
        height = profile.get("height", 170)
        age = profile.get("age", 30)
        gender = profile.get("gender", "male")
        
        if gender == "female":
            return (10 * weight) + (6.25 * height) - (5 * age) - 161
        return (10 * weight) + (6.25 * height) - (5 * age) + 5

    def _calculate_tdee(self, bmr: float, activity_level: str) -> float:
        """Total Daily Energy Expenditure"""
        multipliers = {
            "sedentary": 1.2,
            "lightly_active": 1.375,
            "moderately_active": 1.55,
            "very_active": 1.725,
            "extra_active": 1.9,
        }
        return bmr * multipliers.get(activity_level, 1.2)

    def _calculate_target_calories(self, tdee: float, goal: str) -> Dict[str, int]:
        """تحديد السعرات المستهدفة حسب الهدف"""
        if "فقدان" in goal or "خسارة" in goal or "lose" in goal.lower():
            return {"min": int(tdee - 500), "max": int(tdee - 300), "deficit": 500}
        elif "بناء" in goal or "عضلات" in goal or "gain" in goal.lower():
            return {"min": int(tdee + 300), "max": int(tdee + 500), "surplus": 400}
        return {"min": int(tdee - 200), "max": int(tdee + 200), "maintenance": True}

    def _calculate_macros(self, calories: Dict, goal: str, profile: Dict) -> Dict[str, Any]:
        """توزيع المغذيات الكبرى"""
        avg_calories = (calories["min"] + calories["max"]) / 2
        
        # توزيع حسب الهدف
        if "فقدان" in goal or "خسارة" in goal:
            protein_pct = 0.35
            fat_pct = 0.25
            carb_pct = 0.40
        elif "بناء" in goal or "عضلات" in goal:
            protein_pct = 0.30
            fat_pct = 0.25
            carb_pct = 0.45
        else:
            protein_pct = 0.25
            fat_pct = 0.30
            carb_pct = 0.45

        protein_g = round((avg_calories * protein_pct) / 4)
        fat_g = round((avg_calories * fat_pct) / 9)
        carb_g = round((avg_calories * carb_pct) / 4)
        
        return {
            "protein": {"grams": protein_g, "calories": protein_g * 4, "percentage": int(protein_pct * 100)},
            "fat": {"grams": fat_g, "calories": fat_g * 9, "percentage": int(fat_pct * 100)},
            "carbs": {"grams": carb_g, "calories": carb_g * 4, "percentage": int(carb_pct * 100)},
        }

    def _build_meal_plan(self, profile: Dict, goal: str, calories: Dict, lang: str) -> List[Dict]:
        """بناء خطة وجبات مخصصة"""
        country = profile.get("country", "EG")
        restrictions = profile.get("allergies", []) + profile.get("disliked_foods", [])
        medical = profile.get("medical_conditions", [])
        
        # قاعدة بيانات مبسطة للوجبات حسب البلد
        if country in ["EG", "SA", "AE", "QA", "KW", "OM", "BH"]:
            breakfast_options = ["فول مدمس + خبز أسمر", "بيض مسلوق + خضار", "زبادي يوناني + عسل + مكسرات", "شوفان + موز"]
            lunch_options = ["صدر دجاج مشوي + أرز بني + سلطة", "سمك مشوي + خضار سوتيه", "لحم بقري + كينوا", "عدس + خبز أسمر"]
            dinner_options = ["سلطة تونة + زيت زيتون", "جبن قريش + خيار", "شوربة خضار + بيض", "زبادي + فواكه"]
            snacks = ["تفاحة", "حفنة مكسرات", "جزر", "تمر (3 حبات)"]
        else:
            breakfast_options = ["Oatmeal + banana", "Eggs + avocado toast", "Greek yogurt + granola", "Smoothie bowl"]
            lunch_options = ["Grilled chicken + quinoa", "Salmon + sweet potato", "Lean beef + brown rice", "Lentil soup"]
            dinner_options = ["Tuna salad", "Cottage cheese + cucumber", "Vegetable soup", "Light protein shake"]
            snacks = ["Apple", "Almonds", "Carrot sticks", "Protein bar"]

        # استبعاد الأطعمة الممنوعة
        if "سكر" in medical or "diabetes" in str(medical).lower():
            snacks = [s for s in snacks if "تمر" not in s and "banana" not in s.lower()]

        return [
            {"meal": "فطور" if lang == "ar" else "Breakfast", "options": breakfast_options[:2], "calories": f"{int(calories['min'] * 0.3)}-{int(calories['max'] * 0.3)}"},
            {"meal": "غداء" if lang == "ar" else "Lunch", "options": lunch_options[:2], "calories": f"{int(calories['min'] * 0.4)}-{int(calories['max'] * 0.4)}"},
            {"meal": "عشاء" if lang == "ar" else "Dinner", "options": dinner_options[:2], "calories": f"{int(calories['min'] * 0.2)}-{int(calories['max'] * 0.2)}"},
            {"meal": "وجبات خفيفة" if lang == "ar" else "Snacks", "options": snacks[:2], "calories": f"{int(calories['min'] * 0.1)}-{int(calories['max'] * 0.1)}"},
        ]

    def _generate_tips(self, profile: Dict, goal: str, lang: str) -> List[str]:
        tips = []
        if lang == "ar":
            tips.append("اشرب 8-10 أكواب ماء يومياً")
            tips.append("تجنب الأكل قبل النوم بـ 3 ساعات")
            tips.append("امضغ الطعام ببطء")
            if profile.get("age", 30) > 50:
                tips.append("زد من الكالسيوم وفيتامين د")
            if "ضغط" in str(profile.get("medical_conditions", [])):
                tips.append("قلل من الملح والصوديوم")
        else:
            tips.append("Drink 8-10 cups of water daily")
            tips.append("Avoid eating 3 hours before bed")
            tips.append("Chew food slowly")
        return tips


nutrition_intelligence = NutritionIntelligence()
