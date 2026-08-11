"""
Dynamic Personality Engine v2.0 – الشخصية الديناميكية المتكاملة
=================================================================
- Big Five + 6 سمات إضافية = 11 سمة
- يتطور مع التفاعلات
- يتكامل مع Self Model لتحديث نقاط القوة والضعف
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from app.infrastructure.database.supabase_client import get_db

logger = logging.getLogger("dynamic_personality")

DEFAULT_PERSONALITY = {
    "openness": 0.75,
    "conscientiousness": 0.80,
    "extraversion": 0.55,
    "agreeableness": 0.85,
    "neuroticism": 0.25,
    "humor": 0.60,
    "patience": 0.85,
    "confidence": 0.70,
    "empathy": 0.90,
    "curiosity": 0.80,
    "emotional_stability": 0.80,
}

class DynamicPersonality:
    def __init__(self):
        self._cache: Dict[str, Dict[str, float]] = {}
    
    async def get_personality(self, user_id: str) -> Dict[str, float]:
        if user_id in self._cache:
            return self._cache[user_id]
        try:
            db = get_db()
            res = db.table("twin_personalities").select("*").eq("user_id", user_id).single().execute()
            if res.data:
                personality = {k: res.data.get(k, DEFAULT_PERSONALITY.get(k, 0.5)) for k in DEFAULT_PERSONALITY}
                self._cache[user_id] = personality
                return personality
        except:
            pass
        self._cache[user_id] = dict(DEFAULT_PERSONALITY)
        await self._save(user_id, DEFAULT_PERSONALITY)
        return dict(DEFAULT_PERSONALITY)
    
    async def evolve(self, user_id: str, interaction_type: str, user_emotion: str, interaction_depth: float = 0.5) -> Dict[str, float]:
        personality = await self.get_personality(user_id)
        change_rate = interaction_depth * 0.02
        
        if interaction_type == "emotional_support":
            personality["empathy"] = min(1.0, personality["empathy"] + change_rate * 1.5)
            personality["patience"] = min(1.0, personality["patience"] + change_rate)
        elif interaction_type == "joke_or_humor":
            personality["humor"] = min(1.0, personality["humor"] + change_rate * 1.5)
            personality["extraversion"] = min(1.0, personality["extraversion"] + change_rate)
        elif interaction_type == "deep_conversation":
            personality["openness"] = min(1.0, personality["openness"] + change_rate)
            personality["curiosity"] = min(1.0, personality["curiosity"] + change_rate)
        elif interaction_type == "conflict":
            personality["neuroticism"] = min(1.0, personality["neuroticism"] + change_rate)
            personality["patience"] = max(0.1, personality["patience"] - change_rate)
        elif interaction_type == "casual":
            personality["agreeableness"] = min(1.0, personality["agreeableness"] + change_rate * 0.5)
        
        if user_emotion == "joy":
            personality["extraversion"] = min(1.0, personality["extraversion"] + change_rate * 0.5)
        elif user_emotion == "sadness":
            personality["empathy"] = min(1.0, personality["empathy"] + change_rate)
        
        personality["emotional_stability"] = min(1.0, personality["emotional_stability"] + 0.001)
        self._cache[user_id] = personality
        await self._save(user_id, personality)
        return personality
    
    async def evolve_from_self_model(self, user_id: str, self_model: Dict[str, Any]):
        """تطوير الشخصية بناءً على نموذج الذات من Self Model Engine"""
        if not self_model:
            return
        strengths = self_model.get("capabilities", {}).get("strengths", [])
        weaknesses = self_model.get("capabilities", {}).get("growth_areas", [])
        personality = await self.get_personality(user_id)
        
        if "deep_empathy" in strengths:
            personality["empathy"] = min(1.0, personality["empathy"] + 0.01)
        if "creative_thinking" in strengths:
            personality["openness"] = min(1.0, personality["openness"] + 0.01)
        if "analytical_clarity" in strengths:
            personality["conscientiousness"] = min(1.0, personality["conscientiousness"] + 0.01)
        if "exploration_drive" in strengths:
            personality["curiosity"] = min(1.0, personality["curiosity"] + 0.01)
        if "limited_empathy" in weaknesses:
            personality["empathy"] = min(1.0, personality["empathy"] + 0.02)
        if "low_initiative" in weaknesses:
            personality["extraversion"] = min(1.0, personality["extraversion"] + 0.01)
        if "emotional_volatility" in weaknesses:
            personality["emotional_stability"] = max(0.1, personality["emotional_stability"] - 0.01)
        
        self._cache[user_id] = personality
        await self._save(user_id, personality)
        logger.debug(f"🧬 Personality evolved from Self Model for {user_id}")
    
    async def get_tone_description(self, user_id: str, lang: str = "ar") -> str:
        p = await self.get_personality(user_id)
        if p["empathy"] > 0.8 and p["patience"] > 0.8:
            return "دافئ وصبور" if lang == "ar" else "Warm and patient"
        elif p["humor"] > 0.7:
            return "مرح وخفيف الظل" if lang == "ar" else "Playful and humorous"
        elif p["openness"] > 0.8 and p["curiosity"] > 0.8:
            return "فضولي ومنفتح" if lang == "ar" else "Curious and open-minded"
        elif p["confidence"] > 0.8:
            return "واثق ومطمئن" if lang == "ar" else "Confident and reassuring"
        return "متوازن وودود" if lang == "ar" else "Balanced and friendly"
    
    async def _save(self, user_id: str, personality: Dict[str, float]):
        try:
            db = get_db()
            data = {"user_id": user_id, "updated_at": datetime.now(timezone.utc).isoformat()}
            data.update(personality)
            db.table("twin_personalities").upsert(data).execute()
        except Exception as e:
            logger.warning(f"Failed to save personality: {e}")

dynamic_personality = DynamicPersonality()
logger.info("✅ Dynamic Personality Engine v2.0 initialized")
