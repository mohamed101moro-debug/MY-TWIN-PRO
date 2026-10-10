"""
SoulEvolution v1.0 – التطور العميق للروح
=============================================
يدير التطور الأسبوعي والشهري والسنوي.
يتكامل مع unified_evolution.py لكن على مستوى أعمق.
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("soul_evolution")

class SoulEvolution:
    def __init__(self):
        self.weekly_snapshots: Dict[str, list] = {}
        self.monthly_reviews: Dict[str, list] = {}
        self.yearly_reviews: Dict[str, list] = {}

    async def weekly_snapshot(
        self,
        user_id: str,
        dna: Dict[str, float],
        harmony: float,
        interaction_count: int,
    ) -> Dict[str, Any]:
        """لقطة أسبوعية لحالة الروح"""
        snapshot = {
            "week": self._get_week_number(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "dna": dna.copy(),
            "harmony": harmony,
            "interaction_count": interaction_count,
        }
        if user_id not in self.weekly_snapshots:
            self.weekly_snapshots[user_id] = []
        self.weekly_snapshots[user_id].append(snapshot)
        if len(self.weekly_snapshots[user_id]) > 52:
            self.weekly_snapshots[user_id] = self.weekly_snapshots[user_id][-52:]
        return snapshot

    async def monthly_review(
        self,
        user_id: str,
        weekly_snapshots: list,
    ) -> Dict[str, Any]:
        """مراجعة شهرية لاكتشاف الاتجاهات"""
        if not weekly_snapshots or len(weekly_snapshots) < 4:
            return {"summary": "لا توجد بيانات كافية"}
        
        recent = weekly_snapshots[-4:]
        avg_harmony = sum(s["harmony"] for s in recent) / len(recent)
        total_interactions = sum(s["interaction_count"] for s in recent)
        
        review = {
            "month": datetime.now(timezone.utc).strftime("%Y-%m"),
            "avg_harmony": round(avg_harmony, 2),
            "total_interactions": total_interactions,
            "trend": "growing" if avg_harmony > 0.6 else "stable",
            "recommendation": self._monthly_recommendation(avg_harmony),
        }
        return review

    async def yearly_review(
        self,
        user_id: str,
        monthly_reviews: list,
    ) -> Dict[str, Any]:
        """مراجعة سنوية عميقة"""
        if not monthly_reviews:
            return {"summary": "لم يكتمل عام بعد"}
        
        avg_harmony = sum(r.get("avg_harmony", 0.5) for r in monthly_reviews) / len(monthly_reviews)
        
        return {
            "year": datetime.now(timezone.utc).year,
            "total_months": len(monthly_reviews),
            "avg_harmony": round(avg_harmony, 2),
            "growth_percentage": round(avg_harmony * 100, 1),
            "summary_ar": f"عام من النمو: تناغم {avg_harmony:.0%}",
            "summary_en": f"A year of growth: {avg_harmony:.0%} harmony",
        }

    def _get_week_number(self) -> int:
        return datetime.now(timezone.utc).isocalendar()[1]

    def _monthly_recommendation(self, harmony: float) -> str:
        if harmony < 0.3:
            return "تعزيز التواصل العاطفي"
        if harmony < 0.6:
            return "تعميق الذكريات المشتركة"
        return "الحفاظ على الزخم واستكشاف آفاق جديدة"
