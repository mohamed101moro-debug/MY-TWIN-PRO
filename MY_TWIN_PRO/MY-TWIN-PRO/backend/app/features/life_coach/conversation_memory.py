"""
CONVERSATION MEMORY v1.0 – ذاكرة المحادثات طويلة المدى
=========================================================
- استدعاء المحادثات القديمة ذات الصلة
- بناء سياق طويل المدى
- إشارات إلى ذكريات سابقة بشكل طبيعي
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

class ConversationMemory:
    def __init__(self):
        self.memory_thresholds = {
            "recent": 7,      # أيام
            "medium": 30,     # أيام
            "long": 90,       # أيام
            "very_long": 365, # أيام
        }

    def build_context(self, history: List[Dict], current_topic: str, lang: str = "ar") -> Dict[str, Any]:
        """بناء سياق من المحادثات السابقة"""
        
        if not history:
            return {"has_context": False, "memories": [], "contextual_greeting": ""}
        
        # تصنيف الذكريات حسب الفترة
        categorized = self._categorize_by_time(history)
        
        # البحث عن ذكريات ذات صلة
        relevant = self._find_relevant_memories(history, current_topic)
        
        # بناء تذكير سياقي
        contextual_note = self._build_contextual_note(relevant, categorized, lang)
        
        return {
            "has_context": len(relevant) > 0,
            "memories": relevant[:3],
            "contextual_greeting": contextual_note,
            "total_memories": len(history),
            "oldest_memory_date": history[0].get("date") if history else None,
            "categories": {
                "recent": len(categorized["recent"]),
                "medium": len(categorized["medium"]),
                "long": len(categorized["long"]),
            },
        }

    def _categorize_by_time(self, history: List[Dict]) -> Dict[str, List[Dict]]:
        """تصنيف الذكريات حسب الفترة الزمنية"""
        now = datetime.now(timezone.utc)
        categorized = {"recent": [], "medium": [], "long": [], "very_long": []}
        
        for memory in history:
            try:
                memory_date = datetime.fromisoformat(memory.get("date", ""))
                days_ago = (now - memory_date).days
                
                if days_ago <= self.memory_thresholds["recent"]:
                    categorized["recent"].append(memory)
                elif days_ago <= self.memory_thresholds["medium"]:
                    categorized["medium"].append(memory)
                elif days_ago <= self.memory_thresholds["long"]:
                    categorized["long"].append(memory)
                else:
                    categorized["very_long"].append(memory)
            except:
                pass
        
        return categorized

    def _find_relevant_memories(self, history: List[Dict], topic: str) -> List[Dict]:
        """البحث عن ذكريات ذات صلة بالموضوع الحالي"""
        topic_keywords = set(topic.lower().split())
        relevant = []
        
        for memory in history[-30:]:  # آخر 30 محادثة
            memory_text = str(memory.get("input", "")) + " " + str(memory.get("content", ""))
            memory_keywords = set(memory_text.lower().split())
            overlap = topic_keywords & memory_keywords
            
            if len(overlap) >= 2:  # كلمتان مشتركتان على الأقل
                relevant.append(memory)
        
        return relevant

    def _build_contextual_note(self, relevant: List[Dict], categorized: Dict, lang: str) -> str:
        """بناء ملاحظة سياقية"""
        if not relevant:
            return ""
        
        if lang == "ar":
            if categorized["recent"]:
                return f"أتذكر أننا تحدثنا مؤخراً عن هذا الموضوع."
            elif categorized["medium"]:
                return f"منذ حوالي شهر، تحدثنا عن شيء مشابه."
            elif categorized["long"]:
                return f"قبل بضعة أشهر، ناقشنا هذا الأمر."
        else:
            if categorized["recent"]:
                return f"I remember we talked about this recently."
            elif categorized["medium"]:
                return f"About a month ago, we discussed something similar."
            elif categorized["long"]:
                return f"A few months ago, we discussed this."
        
        return ""

    def get_memory_by_date(self, history: List[Dict], target_date: str) -> Optional[Dict]:
        """استرجاع ذكرى بتاريخ محدد"""
        for memory in history:
            if memory.get("date", "").startswith(target_date):
                return memory
        return None

    def get_emotional_timeline(self, history: List[Dict]) -> List[Dict]:
        """استخراج الخط الزمني العاطفي"""
        timeline = []
        for memory in history[-20:]:
            emotion = memory.get("emotion", "neutral")
            date = memory.get("date", "")
            timeline.append({"date": date, "emotion": emotion})
        return timeline


conversation_memory = ConversationMemory()
