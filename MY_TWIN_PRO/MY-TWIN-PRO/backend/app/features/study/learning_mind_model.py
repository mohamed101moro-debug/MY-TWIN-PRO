"""
LEARNING MIND MODEL v1.0 – نموذج العقل التعليمي
==================================================
- LearningIdentity: كيف يرى الطالب نفسه كمتعلم
- LearningConfidence: ثقة الطالب في كل مادة
- LearningFear: المخاوف المرتبطة بالتعلم
- LearningSpeed: سرعة التعلم لكل نوع من المواد
- KnowledgeMap: خريطة معرفية ديناميكية خاصة بالطالب
- WeakPatterns: أنماط الضعف المتكررة
- StrongPatterns: أنماط القوة
- CuriosityProfile: ملف الفضول والاهتمامات
- MemoryType: نوع الذاكرة المفضل (بصري، سمعي، حركي)
- ThinkingStyle: أسلوب التفكير (تحليلي، إبداعي، عملي)
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class LearningMindModel:
    def __init__(self):
        self.memory_client = None

    async def get_full_profile(self, user_id: str) -> Dict[str, Any]:
        """استرجاع الملف التعليمي الكامل للطالب من TCMA"""
        profile = await self._load_from_memory(user_id)
        if not profile:
            profile = self._create_default_profile(user_id)
            await self._save_to_memory(user_id, profile)
        return profile

    async def update_after_session(self, user_id: str, subject: str, performance: Dict) -> Dict[str, Any]:
        """تحديث العقل التعليمي بعد كل جلسة"""
        profile = await self.get_full_profile(user_id)
        
        # تحديث الثقة
        accuracy = performance.get("accuracy", 0.5)
        prev_confidence = profile.get("learning_confidence", {}).get(subject, 0.5)
        profile["learning_confidence"][subject] = round(prev_confidence * 0.7 + accuracy * 0.3, 2)
        
        # تحديث السرعة
        questions_asked = performance.get("questions_asked", 0)
        time_spent = performance.get("time_spent_minutes", 10)
        if time_spent > 0:
            speed = questions_asked / time_spent
            prev_speed = profile.get("learning_speed", {}).get(subject, speed)
            profile["learning_speed"][subject] = round(prev_speed * 0.6 + speed * 0.4, 2)
        
        # اكتشاف نقاط الضعف
        if accuracy < 0.5:
            if subject not in profile["weak_patterns"]:
                profile["weak_patterns"][subject] = []
            profile["weak_patterns"][subject].append({
                "date": datetime.now(timezone.utc).isoformat(),
                "accuracy": accuracy,
                "depth": performance.get("depth", 1)
            })
        
        # اكتشاف نقاط القوة
        if accuracy > 0.8:
            if subject not in profile["strong_patterns"]:
                profile["strong_patterns"][subject] = 0
            profile["strong_patterns"][subject] += 1
        
        await self._save_to_memory(user_id, profile)
        return profile

    async def get_learning_style(self, user_id: str) -> Dict[str, str]:
        """استخراج أسلوب التعلم المفضل"""
        profile = await self.get_full_profile(user_id)
        return {
            "memory_type": profile.get("memory_type", "visual"),
            "thinking_style": profile.get("thinking_style", "analytical"),
            "preferred_explanation_type": profile.get("preferred_explanation_type", "analogy")
        }

    async def get_subject_confidence(self, user_id: str, subject: str) -> float:
        """معرفة ثقة الطالب في مادة معينة"""
        profile = await self.get_full_profile(user_id)
        return profile.get("learning_confidence", {}).get(subject, 0.5)

    async def get_weak_areas(self, user_id: str) -> List[str]:
        """استخراج المواد التي يعاني فيها الطالب"""
        profile = await self.get_full_profile(user_id)
        weak = []
        for subject, patterns in profile.get("weak_patterns", {}).items():
            if len(patterns) >= 3:
                weak.append(subject)
        return weak

    async def get_curiosity_profile(self, user_id: str) -> Dict[str, Any]:
        """استخراج ملف الفضول والاهتمامات"""
        profile = await self.get_full_profile(user_id)
        return profile.get("curiosity_profile", {"interests": [], "favorite_subjects": []})

    def _create_default_profile(self, user_id: str) -> Dict[str, Any]:
        return {
            "user_id": user_id,
            "learning_identity": "متعلم متحمس" if "ar" else "Enthusiastic learner",
            "learning_confidence": {},
            "learning_fear": {},
            "learning_speed": {},
            "knowledge_map": {},
            "weak_patterns": {},
            "strong_patterns": {},
            "curiosity_profile": {"interests": [], "favorite_subjects": []},
            "memory_type": "visual",
            "thinking_style": "analytical",
            "preferred_explanation_type": "analogy",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

    async def _load_from_memory(self, user_id: str) -> Optional[Dict]:
        if self.memory_client:
            try:
                return await self.memory_client.get_entity("learning_mind", user_id)
            except: pass
        return None

    async def _save_to_memory(self, user_id: str, profile: Dict):
        if self.memory_client:
            try:
                await self.memory_client.store_entity("learning_mind", user_id, profile)
            except Exception as e:
                logger.warning(f"Failed to save learning mind: {e}")


learning_mind = LearningMindModel()
