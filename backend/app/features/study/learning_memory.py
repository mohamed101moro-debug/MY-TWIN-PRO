"""
LEARNING MEMORY v1.0 – ذاكرة التعلم طويلة المدى
==================================================
- تخزين تاريخ الجلسات في TCMA
- تذكر: أكثر مادة يحبها، أكثر مادة يخاف منها
- تذكر: أفضل وقت للتعلم، أفضل نوع شرح
- تذكر: أطول سلسلة نجاح، سبب الانسحاب
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

class LearningMemory:
    def __init__(self):
        self.memory_client = None

    async def store_session(self, user_id: str, session_data: Dict) -> Dict:
        """تخزين جلسة دراسة في الذاكرة طويلة المدى"""
        entry = {
            "user_id": user_id,
            "subject": session_data.get("concept", ""),
            "accuracy": session_data.get("accuracy", 0),
            "questions_asked": session_data.get("questions_asked", 0),
            "correct_answers": session_data.get("correct_answers", 0),
            "depth_reached": session_data.get("depth_reached", 0),
            "time_spent_minutes": session_data.get("time_spent_minutes", 0),
            "emotion_before": session_data.get("emotion_before", "neutral"),
            "emotion_after": session_data.get("emotion_after", "neutral"),
            "explanation_type_used": session_data.get("explanation_type", "scaffold"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        if self.memory_client:
            try:
                await self.memory_client.append_to_list("learning_history", user_id, entry)
            except: pass
        return entry

    async def get_learning_history(self, user_id: str, limit: int = 20) -> List[Dict]:
        """استرجاع آخر جلسات التعلم"""
        if self.memory_client:
            try:
                history = await self.memory_client.get_entity_list("learning_history", user_id)
                if history:
                    return sorted(history, key=lambda x: x.get("timestamp", ""), reverse=True)[:limit]
            except: pass
        return []

    async def get_favorite_subject(self, user_id: str) -> Optional[str]:
        """معرفة أكثر مادة يحبها الطالب (بناءً على الدقة العالية والمشاعر الإيجابية)"""
        history = await self.get_learning_history(user_id, 50)
        if not history:
            return None
        subject_scores = {}
        for session in history:
            subject = session.get("subject", "")
            accuracy = session.get("accuracy", 0)
            emotion = session.get("emotion_after", "neutral")
            score = accuracy * (1.5 if emotion in ["joy", "confident"] else 1.0)
            if subject not in subject_scores:
                subject_scores[subject] = {"total_score": 0, "count": 0}
            subject_scores[subject]["total_score"] += score
            subject_scores[subject]["count"] += 1
        if not subject_scores:
            return None
        best = max(subject_scores.items(), key=lambda x: x[1]["total_score"] / x[1]["count"])
        return best[0]

    async def get_feared_subject(self, user_id: str) -> Optional[str]:
        """معرفة أكثر مادة يخاف منها الطالب"""
        history = await self.get_learning_history(user_id, 50)
        if not history:
            return None
        subject_scores = {}
        for session in history:
            subject = session.get("subject", "")
            accuracy = session.get("accuracy", 0)
            emotion = session.get("emotion_before", "neutral")
            if emotion in ["fear", "anxiety", "frustration"]:
                if subject not in subject_scores:
                    subject_scores[subject] = 0
                subject_scores[subject] += 1
        if not subject_scores:
            return None
        return max(subject_scores.items(), key=lambda x: x[1])[0]

    async def get_best_learning_time(self, user_id: str) -> Optional[str]:
        """معرفة أفضل وقت للتعلم"""
        history = await self.get_learning_history(user_id, 50)
        if not history:
            return None
        hour_scores = {}
        for session in history:
            try:
                ts = datetime.fromisoformat(session.get("timestamp", ""))
                hour = ts.hour
                accuracy = session.get("accuracy", 0)
                if hour not in hour_scores:
                    hour_scores[hour] = {"total_score": 0, "count": 0}
                hour_scores[hour]["total_score"] += accuracy
                hour_scores[hour]["count"] += 1
            except: pass
        if not hour_scores:
            return None
        best_hour = max(hour_scores.items(), key=lambda x: x[1]["total_score"] / x[1]["count"])
        return f"{best_hour[0]}:00"

    async def get_best_explanation_type(self, user_id: str) -> Optional[str]:
        """معرفة أفضل نوع شرح يفهمه الطالب"""
        history = await self.get_learning_history(user_id, 30)
        if not history:
            return None
        type_scores = {}
        for session in history:
            expl_type = session.get("explanation_type_used", "scaffold")
            accuracy = session.get("accuracy", 0)
            if expl_type not in type_scores:
                type_scores[expl_type] = {"total_score": 0, "count": 0}
            type_scores[expl_type]["total_score"] += accuracy
            type_scores[expl_type]["count"] += 1
        if not type_scores:
            return None
        return max(type_scores.items(), key=lambda x: x[1]["total_score"] / x[1]["count"])[0]

    async def get_longest_streak(self, user_id: str) -> int:
        """معرفة أطول سلسلة نجاح"""
        history = await self.get_learning_history(user_id, 100)
        if not history:
            return 0
        sorted_history = sorted(history, key=lambda x: x.get("timestamp", ""))
        max_streak = 0
        current_streak = 0
        for session in sorted_history:
            if session.get("accuracy", 0) >= 0.7:
                current_streak += 1
                max_streak = max(max_streak, current_streak)
            else:
                current_streak = 0
        return max_streak


learning_memory = LearningMemory()
