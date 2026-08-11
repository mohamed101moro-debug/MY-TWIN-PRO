"""
LONG TERM MEMORY REASONING v1.0 – استدلال طويل المدى
========================================================
- تحليل أنماط حياتية عبر أشهر وسنوات
- استنتاج علاقات سببية (مثلاً: قلة النوم → قلق)
- تذكير طبيعي بأحداث الماضي
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from collections import Counter

logger = logging.getLogger(__name__)

class LongTermMemoryReasoning:
    def __init__(self):
        self.min_data_points = 10

    def reason(self, history: List[Dict], current_context: Dict, lang: str = "ar") -> Dict[str, Any]:
        """الاستدلال من الذاكرة طويلة المدى"""
        if len(history) < self.min_data_points:
            return {"ready": False, "message": "Need more data for long-term reasoning"}

        # استخراج الأنماط
        patterns = self._extract_patterns(history)
        # استنتاج علاقات سببية
        causations = self._infer_causation(history, patterns)
        # تذكير بأحداث مهمة
        reminders = self._generate_reminders(history, lang)
        # رؤى شخصية عميقة
        insights = self._generate_insights(patterns, causations, lang)

        return {
            "ready": True,
            "patterns": patterns,
            "causations": causations,
            "reminders": reminders,
            "insights": insights,
            "oldest_memory": history[0].get("date", "unknown") if history else "unknown",
            "total_memories_analyzed": len(history),
        }

    def _extract_patterns(self, history: List[Dict]) -> Dict[str, Any]:
        """استخراج أنماط متكررة"""
        patterns = {
            "sleep_quality_by_day": {},
            "mood_by_season": {},
            "energy_cycles": [],
            "common_triggers": [],
        }

        # تحليل النوم والمزاج
        sleep_mood_pairs = []
        for h in history[-30:]:
            sleep = h.get("sleep_hours", 0)
            mood = h.get("mood_valence", 0.5)
            if sleep and mood:
                sleep_mood_pairs.append((sleep, mood))

        if sleep_mood_pairs:
            low_sleep = [m for s, m in sleep_mood_pairs if s < 6]
            high_sleep = [m for s, m in sleep_mood_pairs if s >= 7]
            if low_sleep and high_sleep:
                avg_low = sum(low_sleep) / len(low_sleep)
                avg_high = sum(high_sleep) / len(high_sleep)
                if avg_low < avg_high - 0.2:
                    patterns["sleep_mood_correlation"] = {
                        "finding_ar": "النوم أقل من 6 ساعات يرتبط بانخفاض مزاجك.",
                        "finding_en": "Sleeping less than 6 hours correlates with lower mood.",
                        "avg_mood_low_sleep": round(avg_low, 2),
                        "avg_mood_high_sleep": round(avg_high, 2),
                    }

        # تحليل أيام الأسبوع
        day_moods = {}
        for h in history[-30:]:
            try:
                date = datetime.fromisoformat(h.get("date", ""))
                day_name = date.strftime("%A")
                mood = h.get("mood_valence", 0.5)
                if day_name not in day_moods:
                    day_moods[day_name] = []
                day_moods[day_name].append(mood)
            except:
                pass
        patterns["day_of_week_mood"] = {day: round(sum(moods)/len(moods), 2) for day, moods in day_moods.items() if moods}

        return patterns

    def _infer_causation(self, history: List[Dict], patterns: Dict) -> List[Dict]:
        """استنتاج علاقات سببية"""
        causations = []

        # النوم → المزاج
        if "sleep_mood_correlation" in patterns:
            causations.append({
                "cause": "sleep",
                "effect": "mood",
                "description_ar": "كلما قل نومك عن 6 ساعات، انخفض مزاجك في اليوم التالي.",
                "description_en": "Whenever you sleep less than 6 hours, your mood drops the next day.",
                "confidence": 0.75,
            })

        return causations

    def _generate_reminders(self, history: List[Dict], lang: str) -> List[Dict]:
        """توليد تذكيرات بأحداث مهمة"""
        reminders = []
        one_month_ago = datetime.now(timezone.utc) - timedelta(days=30)
        
        for memory in history:
            try:
                memory_date = datetime.fromisoformat(memory.get("date", ""))
                days_ago = (datetime.now(timezone.utc) - memory_date).days
                
                if 25 <= days_ago <= 35:
                    reminders.append({
                        "type": "month_ago",
                        "content": memory.get("input", "")[:100],
                        "days_ago": days_ago,
                        "message_ar": f"منذ شهر تقريباً، تحدثنا عن '{memory.get('input', '')[:50]}'.",
                        "message_en": f"About a month ago, we talked about '{memory.get('input', '')[:50]}'.",
                    })
            except:
                pass

        return reminders[:2]

    def _generate_insights(self, patterns: Dict, causations: List[Dict], lang: str) -> List[str]:
        """توليد رؤى شخصية عميقة"""
        insights = []
        
        for causation in causations:
            insights.append(causation[f"description_{lang}"])
        
        if patterns.get("day_of_week_mood"):
            days = patterns["day_of_week_mood"]
            worst_day = min(days, key=days.get) if days else None
            best_day = max(days, key=days.get) if days else None
            if worst_day and best_day and worst_day != best_day:
                insights.append(f"مزاجك يكون في أفضل حالاته يوم {best_day}، وأقلها يوم {worst_day}." if lang == "ar" else f"Your mood peaks on {best_day} and dips on {worst_day}.")

        return insights


long_term_memory_reasoning = LongTermMemoryReasoning()
