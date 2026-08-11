"""
PREDICTION ENGINE – الطبقة السابعة من Life Coach
===================================================
- توقع الانتكاسة قبل حدوثها
- تحليل الأنماط السلوكية
- اقتراح تدخل استباقي
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class PredictionEngine:
    def predict_relapse_risk(self, user_id: str, history: List[Dict], current_state: Dict) -> Dict[str, Any]:
        """توقع خطر الانتكاسة"""
        risk_factors = []
        risk_score = 0.0

        # تحليل تاريخ الالتزام
        if history:
            recent_completions = sum(1 for h in history[-7:] if h.get("completed"))
            if recent_completions < 4:
                risk_score += 0.3
                risk_factors.append("انخفاض الالتزام مؤخراً")

        # تحليل المزاج
        if current_state.get("mood_valence", 0.5) < 0.3:
            risk_score += 0.3
            risk_factors.append("مزاج منخفض")

        # تحليل الطاقة
        if current_state.get("energy", 50) < 30:
            risk_score += 0.2
            risk_factors.append("طاقة منخفضة")

        # تحليل التوتر
        if current_state.get("stress_level", 0) > 0.6:
            risk_score += 0.2
            risk_factors.append("توتر مرتفع")

        return {
            "relapse_risk": risk_score,
            "risk_level": "high" if risk_score > 0.6 else ("medium" if risk_score > 0.3 else "low"),
            "risk_factors": risk_factors,
            "needs_preventive_action": risk_score > 0.4,
            "suggested_action": self._suggest_preventive_action(risk_score, risk_factors),
        }

    def _suggest_preventive_action(self, risk: float, factors: List[str]) -> str:
        if risk > 0.6:
            return "تقليل الأهداف مؤقتاً والتركيز على الراحة"
        elif risk > 0.3:
            return "مراجعة خطة الأسبوع وتقليل الضغط"
        return "الاستمرار في الخطة الحالية مع مراقبة ذاتية"

    def analyze_behavior_pattern(self, history: List[Dict]) -> Dict[str, Any]:
        """تحليل الأنماط السلوكية"""
        if len(history) < 5:
            return {"patterns_found": False}

        patterns = []
        
        # هل يتوقف عن الرياضة مع ضغط العمل؟
        work_stress_days = [h for h in history if "عمل" in str(h.get("input", "")) or "ضغط" in str(h.get("input", ""))]
        missed_workout_after = sum(1 for h in work_stress_days if not h.get("completed", True))
        if missed_workout_after > len(work_stress_days) * 0.5:
            patterns.append({
                "pattern": "workout_drop_with_stress",
                "description_ar": "ألاحظ أنك تتوقف عن الرياضة عندما يزيد ضغط العمل.",
                "description_en": "I notice you stop exercising when work stress increases.",
                "recommendation": "لنبنِ خطة رياضية مرنة لأيام العمل المزدحمة.",
            })

        # هل يأكل أكثر مع انخفاض المزاج؟
        low_mood_days = [h for h in history if h.get("mood_valence", 0.5) < 0.4]
        if len(low_mood_days) > 3:
            patterns.append({
                "pattern": "eating_with_mood",
                "description_ar": "ألاحظ أن نمط أكلك يتغير مع مزاجك.",
                "description_en": "I notice your eating pattern changes with your mood.",
                "recommendation": "لنجرب الأكل الواعي في الأيام الصعبة.",
            })

        return {
            "patterns_found": len(patterns) > 0,
            "patterns": patterns,
        }


prediction_engine = PredictionEngine()
