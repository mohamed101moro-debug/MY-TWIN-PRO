"""
SPACED REPETITION SM-2 v2.0 – مع وزن الثقة
"""
import logging
from typing import Dict, Any, List
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("spaced_repetition_sm2")

class SpacedRepetitionScheduler:
    def __init__(self):
        self.default_ease = 2.5
        self.min_ease = 1.3

    def calculate_next_review(self, concept: str, quality: int, current_ease: float = None, current_interval: int = 0, repetition_count: int = 0, emotional_state: str = "neutral", confidence_weight: float = 1.0) -> Dict[str, Any]:
        """حساب موعد المراجعة مع وزن الثقة"""
        if current_ease is None:
            current_ease = self.default_ease
        
        # تعديل الجودة حسب وزن الثقة
        adjusted_quality = min(quality * confidence_weight, 5.0)
        
        if adjusted_quality >= 3:
            if repetition_count == 0: interval = 1
            elif repetition_count == 1: interval = 3
            else: interval = round(current_interval * current_ease)
            repetition_count += 1
            ease = current_ease + (0.1 - (5 - adjusted_quality) * (0.08 + (5 - adjusted_quality) * 0.02))
        else:
            interval = 1
            repetition_count = 0
            ease = current_ease - 0.20
        
        ease = max(ease, self.min_ease)
        
        emotional_modifier = self._emotional_modifier(emotional_state)
        interval = round(interval * emotional_modifier * (1.2 if confidence_weight < 0.6 else 1.0))
        interval = max(interval, 1)
        
        next_review_date = datetime.now(timezone.utc) + timedelta(days=interval)
        
        return {
            "concept": concept, "quality": quality, "confidence_weight": confidence_weight,
            "ease_factor": round(ease, 2), "interval_days": interval,
            "repetition_count": repetition_count,
            "next_review_date": next_review_date.isoformat(), "emotional_state": emotional_state,
        }

    def _emotional_modifier(self, emotion: str) -> float:
        modifiers = {"joy": 1.1, "confident": 1.2, "neutral": 1.0, "frustration": 0.8, "anxiety": 0.7, "sadness": 0.8, "fear": 0.6}
        return modifiers.get(emotion, 1.0)


scheduler = SpacedRepetitionScheduler()
