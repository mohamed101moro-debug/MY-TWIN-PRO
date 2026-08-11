"""
LEARNING PERSONALITY v1.0 – شخصية المعلم (Mentor)
====================================================
- تقدم نصائح مخصصة بناءً على معرفتها بالطالب
- تتذكر التفاعلات السابقة
- تتكيف مع مشاعر الطالب
- تشجع وتحفز بأسلوب شخصي
"""
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class LearningPersonality:
    def __init__(self):
        self.ai_route = None
        self.memory_client = None

    async def get_greeting(self, user_id: str, mind_model, learning_memory, lang: str = "ar") -> str:
        """تحية مخصصة بناءً على معرفة عميقة بالطالب"""
        profile = await mind_model.get_full_profile(user_id) if mind_model else {}
        fav_subject = await learning_memory.get_favorite_subject(user_id) if learning_memory else None
        feared_subject = await learning_memory.get_feared_subject(user_id) if learning_memory else None
        
        if lang == "ar":
            greeting = "مرحباً بك! "
            if fav_subject:
                greeting += f"أعرف أنك تحب {fav_subject}. "
            if feared_subject:
                greeting += f"اليوم لن نقترب من {feared_subject}، أعدك. "
            greeting += "هل أنت مستعد لجلسة رائعة؟"
        else:
            greeting = "Welcome! "
            if fav_subject:
                greeting += f"I know you love {fav_subject}. "
            greeting += "Ready for a great session?"
        return greeting

    async def get_encouragement(self, user_id: str, mind_model, performance: Dict, lang: str = "ar") -> str:
        """تشجيع مخصص بعد الإجابة"""
        accuracy = performance.get("accuracy", 0.5)
        weak_areas = await mind_model.get_weak_areas(user_id) if mind_model else []
        
        if lang == "ar":
            if accuracy > 0.8:
                return "ممتاز! أنت تتقدم بسرعة. استمر."
            elif accuracy > 0.5:
                return "جيد! خطوة بخطوة. أنا معك."
            elif weak_areas:
                return f"لا بأس. أعرف أن {weak_areas[0]} صعب. دعنا نأخذها ببطء."
            return "لا تقلق. كل متعلم يمر بهذا. أنا هنا."
        else:
            if accuracy > 0.8:
                return "Excellent! You're improving fast. Keep going."
            elif accuracy > 0.5:
                return "Good! Step by step. I'm with you."
            return "Don't worry. Every learner goes through this. I'm here."

    async def get_study_reminder(self, user_id: str, mind_model, learning_memory, lang: str = "ar") -> Optional[str]:
        """تذكير ذكي بالدراسة بناءً على معرفتها بالطالب"""
        if not mind_model or not learning_memory:
            return None
        
        weak_areas = await mind_model.get_weak_areas(user_id)
        best_time = await learning_memory.get_best_learning_time(user_id)
        feared_subject = await learning_memory.get_feared_subject(user_id)
        
        if not weak_areas:
            return None
        
        subject_to_review = [s for s in weak_areas if s != feared_subject] or weak_areas
        
        if lang == "ar":
            msg = f"أرى أنك لم تراجع {subject_to_review[0]} منذ فترة. "
            if best_time:
                msg += f"أفضل وقت لك للدراسة هو حوالي {best_time}. "
            msg += "هل تريد أن نبدأ الآن؟"
        else:
            msg = f"I see you haven't reviewed {subject_to_review[0]} in a while. "
            if best_time:
                msg += f"Your best learning time is around {best_time}. "
            msg += "Want to start now?"
        return msg

    async def get_personalized_response(self, user_id: str, mind_model, context: Dict, lang: str = "ar") -> str:
        """رد شخصي عميق بناءً على معرفة الطالب"""
        if not self.ai_route:
            return "أنا هنا لمساعدتك."
        
        profile = await mind_model.get_full_profile(user_id) if mind_model else {}
        thinking_style = profile.get("thinking_style", "analytical")
        memory_type = profile.get("memory_type", "visual")
        
        prompt = f"""أنت معلم خبير تعرف طالبك جيداً.
الطالب: أسلوب تفكيره {thinking_style}، يفضل التعلم {memory_type}.
السياق: {context}
قدم رداً شخصياً موجزاً (جملتين) يشعر الطالب أنك تفهمه حقاً. اللغة: {lang}."""
        try:
            text, _ = await self.ai_route(prompt, task="study")
            return text.strip()
        except:
            return "أفهم ما تمر به. دعنا نعمل معاً."


learning_personality = LearningPersonality()
