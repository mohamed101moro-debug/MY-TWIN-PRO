"""
EMOTIONAL GROWTH MODEL v1.0 – نموذج النمو العاطفي
=====================================================
- تتبع تطور القلق، الثقة، الانضباط، المرونة
- رسم منحنى النمو العاطفي
- مقارنة بين الفترات
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

class EmotionalGrowth:
    def __init__(self):
        self.metrics = ["anxiety", "confidence", "discipline", "resilience", "optimism", "self_compassion"]

    def analyze_growth(self, history: List[Dict], profile: Dict = None) -> Dict[str, Any]:
        """تحليل النمو العاطفي عبر الزمن"""
        
        if len(history) < 5:
            return {"error": "Need at least 5 interactions for growth analysis", "metrics": {}}
        
        # تقسيم التاريخ إلى فترات
        periods = self._split_into_periods(history)
        
        # حساب المقاييس لكل فترة
        metrics_over_time = {}
        for period_name, period_data in periods.items():
            if period_data:
                metrics_over_time[period_name] = self._calculate_metrics_for_period(period_data)
        
        # حساب التغير
        changes = self._calculate_changes(metrics_over_time)
        
        # رسم منحنى النمو
        growth_curve = self._build_growth_curve(metrics_over_time)
        
        return {
            "periods_analyzed": len(periods),
            "metrics_over_time": metrics_over_time,
            "changes": changes,
            "growth_curve": growth_curve,
            "overall_growth_score": self._calculate_overall_growth(changes),
            "insights": self._generate_insights(changes, profile),
        }

    def _split_into_periods(self, history: List[Dict]) -> Dict[str, List[Dict]]:
        """تقسيم التاريخ إلى فترات زمنية"""
        now = datetime.now(timezone.utc)
        periods = {
            "last_7_days": [],
            "last_30_days": [],
            "last_90_days": [],
        }
        
        for memory in history:
            try:
                memory_date = datetime.fromisoformat(memory.get("date", ""))
                days_ago = (now - memory_date).days
                
                if days_ago <= 7:
                    periods["last_7_days"].append(memory)
                if days_ago <= 30:
                    periods["last_30_days"].append(memory)
                if days_ago <= 90:
                    periods["last_90_days"].append(memory)
            except:
                pass
        
        return periods

    def _calculate_metrics_for_period(self, period_data: List[Dict]) -> Dict[str, float]:
        """حساب المقاييس لفترة زمنية"""
        if not period_data:
            return {metric: 50.0 for metric in self.metrics}
        
        metrics = {metric: 0.0 for metric in self.metrics}
        
        for memory in period_data:
            emotion = memory.get("emotion", {})
            if isinstance(emotion, dict):
                valence = emotion.get("valence", 0)
                intensity = emotion.get("intensity", 0.5)
                
                # anxiety: inverse of valence (negative valence = higher anxiety)
                metrics["anxiety"] += (1 - (valence + 1) / 2) * intensity
                # confidence: positive valence
                metrics["confidence"] += ((valence + 1) / 2) * intensity
                # discipline: based on completion
                metrics["discipline"] += 0.7 if memory.get("completed", False) else 0.3
                # resilience: ability to bounce back
                metrics["resilience"] += 0.6
                # optimism: positive valence
                metrics["optimism"] += ((valence + 1) / 2)
                # self_compassion: medium-high baseline
                metrics["self_compassion"] += 0.5
        
        # متوسط
        count = len(period_data) or 1
        return {k: round(v / count * 100, 1) for k, v in metrics.items()}

    def _calculate_changes(self, metrics_over_time: Dict) -> Dict[str, Dict]:
        """حساب التغيرات بين الفترات"""
        periods = list(metrics_over_time.keys())
        if len(periods) < 2:
            return {}
        
        changes = {}
        latest = periods[0]
        earliest = periods[-1]
        
        if latest in metrics_over_time and earliest in metrics_over_time:
            for metric in self.metrics:
                old_value = metrics_over_time[earliest].get(metric, 50)
                new_value = metrics_over_time[latest].get(metric, 50)
                diff = new_value - old_value
                changes[metric] = {
                    "from": old_value,
                    "to": new_value,
                    "change": round(diff, 1),
                    "trend": "improving" if diff > 5 else ("declining" if diff < -5 else "stable"),
                }
        
        return changes

    def _build_growth_curve(self, metrics_over_time: Dict) -> List[Dict]:
        """بناء منحنى النمو"""
        curve = []
        for period, metrics in metrics_over_time.items():
            curve.append({"period": period, "metrics": metrics})
        return curve

    def _calculate_overall_growth(self, changes: Dict) -> float:
        """حساب درجة النمو الإجمالية"""
        if not changes:
            return 0.0
        total_change = sum(c["change"] for c in changes.values())
        return round(total_change / len(changes), 1)

    def _generate_insights(self, changes: Dict, profile: Dict) -> List[str]:
        """توليد رؤى من التغيرات"""
        insights = []
        
        for metric, data in changes.items():
            if data["trend"] == "improving":
                insights.append(f"تحسن ملحوظ في {metric} – استمر في هذا التقدم!")
            elif data["trend"] == "declining":
                insights.append(f"انخفاض في {metric} – هل هناك شيء يزعجك مؤخراً؟")
        
        return insights


emotional_growth = EmotionalGrowth()
