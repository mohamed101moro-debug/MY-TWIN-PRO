"""
PROGRESS ENGINE – الطبقة السادسة من Life Coach
=================================================
- حساب نسبة التقدم
- منحنى النمو
- مقارنة الأهداف
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class ProgressEngine:
    def calculate_progress(self, goal: Dict, history: List[Dict]) -> Dict[str, Any]:
        """حساب التقدم نحو هدف"""
        start_date = datetime.fromisoformat(goal.get("start_date", datetime.now(timezone.utc).isoformat()))
        days_elapsed = (datetime.now(timezone.utc) - start_date).days or 1
        target_days = goal.get("target_days", 30)
        current_value = goal.get("current_value", 0)
        target_value = goal.get("target_value", 100)
        
        progress = min((current_value / target_value) * 100, 100) if target_value else 0
        timeline_progress = min((days_elapsed / target_days) * 100, 100)
        
        on_track = progress >= timeline_progress

        return {
            "progress_percent": round(progress, 1),
            "days_elapsed": days_elapsed,
            "days_remaining": max(target_days - days_elapsed, 0),
            "on_track": on_track,
            "projected_completion": self._project_completion(progress, days_elapsed, target_days),
            "milestones": self._get_milestones(progress, target_days),
        }

    def _project_completion(self, progress: float, days_elapsed: int, target_days: int) -> str:
        if progress == 0:
            return "غير محدد"
        daily_rate = progress / days_elapsed
        remaining_days = (100 - progress) / daily_rate
        projected_date = datetime.now(timezone.utc) + datetime.timedelta(days=remaining_days)
        return projected_date.strftime("%Y-%m-%d")

    def _get_milestones(self, progress: float, target_days: int) -> List[Dict]:
        milestones = []
        if progress >= 25:
            milestones.append({"milestone": "25%", "message": "ربع الطريق! استمر."})
        if progress >= 50:
            milestones.append({"milestone": "50%", "message": "منتصف الطريق! أنت رائع."})
        if progress >= 75:
            milestones.append({"milestone": "75%", "message": "قريب من الهدف! لا تتوقف."})
        if progress >= 100:
            milestones.append({"milestone": "100%", "message": "أحسنت! لقد حققت هدفك."})
        return milestones

    def generate_progress_report(self, goals: List[Dict], history: List[Dict]) -> Dict[str, Any]:
        """تقرير تقدم شامل"""
        reports = []
        for goal in goals:
            reports.append(self.calculate_progress(goal, history))
        
        overall = sum(r["progress_percent"] for r in reports) / len(reports) if reports else 0
        on_track_count = sum(1 for r in reports if r["on_track"])
        
        return {
            "overall_progress": round(overall, 1),
            "goals_on_track": on_track_count,
            "total_goals": len(goals),
            "goal_reports": reports,
        }


progress_engine = ProgressEngine()
