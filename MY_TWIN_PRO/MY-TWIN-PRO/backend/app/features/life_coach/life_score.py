"""
LIFE SCORE v1.0 – مؤشر توازن الحياة (0-100)
===============================================
- 8 مجالات: النوم، التغذية، الرياضة، العلاقات، المزاج، المال، العمل، الالتزام
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class LifeScore:
    def calculate(self, dashboard_data: Dict, profile: Dict) -> Dict[str, Any]:
        """حساب مؤشر توازن الحياة من 8 مجالات"""
        
        scores = {
            "sleep": self._score_sleep(dashboard_data.get("daily_status", {}), profile),
            "nutrition": self._score_nutrition(dashboard_data.get("active_goals", []), profile),
            "fitness": self._score_fitness(dashboard_data.get("active_goals", []), dashboard_data.get("daily_status", {})),
            "relationships": self._score_relationships(profile),
            "mood": self._score_mood(dashboard_data.get("daily_status", {})),
            "finance": self._score_finance(profile),
            "work": self._score_work(profile, dashboard_data.get("daily_status", {})),
            "commitment": self._score_commitment(dashboard_data.get("daily_status", {})),
        }
        
        overall = sum(scores.values()) / len(scores)
        
        # تحديد مجالات التحسين
        weak_areas = [k for k, v in scores.items() if v < 40]
        strong_areas = [k for k, v in scores.items() if v >= 70]
        
        return {
            "overall_score": round(overall),
            "domain_scores": scores,
            "weak_areas": weak_areas,
            "strong_areas": strong_areas,
            "recommendation": self._get_recommendation(weak_areas, overall),
        }

    def _score_sleep(self, status: Dict, profile: Dict) -> float:
        hours = status.get("sleep_hours", 6)
        quality = status.get("sleep_quality", "medium")
        score = min(hours / 8 * 50, 50)
        if quality == "good": score += 40
        elif quality == "medium": score += 25
        else: score += 10
        return min(score, 100)

    def _score_nutrition(self, goals: List, profile: Dict) -> float:
        nutrition_goals = [g for g in goals if "تغذية" in str(g.get("title", "")) or "nutrition" in str(g.get("title", "")).lower()]
        if not nutrition_goals:
            return 50  # محايد
        return nutrition_goals[0].get("progress", 50)

    def _score_fitness(self, goals: List, status: Dict) -> float:
        fitness_goals = [g for g in goals if "رياضة" in str(g.get("title", "")) or "fitness" in str(g.get("title", "")).lower()]
        if not fitness_goals:
            return 40
        progress = fitness_goals[0].get("progress", 40)
        streak = status.get("streak", 0)
        return min(progress + streak * 3, 100)

    def _score_relationships(self, profile: Dict) -> float:
        bond = profile.get("bond_level", 50)
        return bond

    def _score_mood(self, status: Dict) -> float:
        mood_map = {"joy": 90, "excitement": 85, "optimism": 80, "gratitude": 80,
                     "neutral": 60, "confusion": 40, "anxiety": 30, "sadness": 20, "fear": 15}
        mood = status.get("mood", "neutral")
        return mood_map.get(mood, 50)

    def _score_finance(self, profile: Dict) -> float:
        # مبسط – يمكن تطويره لاحقاً
        return profile.get("financial_wellness", 50)

    def _score_work(self, profile: Dict, status: Dict) -> float:
        energy = status.get("energy", 50)
        return energy

    def _score_commitment(self, status: Dict) -> float:
        streak = status.get("streak", 0)
        return min(streak * 5, 100)

    def _get_recommendation(self, weak_areas: List[str], overall: float) -> str:
        if not weak_areas:
            return "أنت متوازن جداً! استمر في هذا المسار الرائع."
        areas_ar = {
            "sleep": "النوم", "nutrition": "التغذية", "fitness": "الرياضة",
            "relationships": "العلاقات", "mood": "المزاج", "finance": "المال",
            "work": "العمل", "commitment": "الالتزام"
        }
        weak_labels = [areas_ar.get(a, a) for a in weak_areas[:3]]
        return f"أقترح التركيز على: {', '.join(weak_labels)}. هذا سيرفع مؤشر توازن حياتك."


life_score_calculator = LifeScore()
