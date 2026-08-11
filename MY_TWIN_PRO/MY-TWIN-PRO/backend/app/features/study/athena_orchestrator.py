"""
ATHENA Orchestrator v6.0 – عقل التعليم الواعي (Plugin)
==========================================================
يدمج: Learning Mind Model + Learning Memory + Learning Personality
مع: SCAFFOLD + Bloom + SM-2 + Knowledge Graph
"""
import logging, json
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from dataclasses import dataclass, field

from app.features.base_plugin import BasePlugin
from app.features.study.learning_mind_model import learning_mind
from app.features.study.learning_memory import learning_memory
from app.features.study.learning_personality import learning_personality

logger = logging.getLogger(__name__)

@dataclass
class SessionState:
    concept: str
    age_group: str
    current_depth: int = 0
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    questions_asked: int = 0
    correct_answers: int = 0
    scaffold_level: int = 0
    time_started: float = 0.0
    explanation_type_used: str = "scaffold"
    emotion_before: str = "neutral"

class ATHENAOrchestrator(BasePlugin):
    def __init__(self):
        super().__init__(name="ATHENA", version="6.0.0")
        self.active_sessions: Dict[str, SessionState] = {}
        self._scaffold = None
        self._bloom_gen = None
        self._knowledge_graph = None
        self._scheduler = None
        self.mind = learning_mind
        self.memory = learning_memory
        self.personality = learning_personality

    async def _inject_dependencies(self):
        """حقن AI و TCMA في العقول الجديدة"""
        ai = self.ai.route if hasattr(self, 'ai') and self.ai else None
        mem = self._memory_client
        self.personality.ai_route = ai
        self.personality.memory_client = mem
        self.mind.memory_client = mem
        self.memory.memory_client = mem

    @property
    def plugin_id(self) -> str: return "study"
    @property
    def plugin_name_ar(self) -> str: return "المذاكرة الذكية"
    @property
    def plugin_name_en(self) -> str: return "Smart Study"

    async def _on_initialize(self):
        try:
            from app.features.study.scaffold_explainer import scaffold
            from app.features.study.bloom_question_generator import bloom_gen
            from app.features.study.study_knowledge_graph import knowledge_graph
            from app.features.study.spaced_repetition_sm2 import scheduler
            self._scaffold = scaffold
            self._bloom_gen = bloom_gen
            self._knowledge_graph = knowledge_graph
            self._scheduler = scheduler
            logger.info("✅ ATHENA local services loaded")
        except ImportError:
            logger.warning("⚠️ ATHENA local services unavailable")

    async def _get_emotion(self, user_id: str) -> str:
        try:
            if self._memory_client:
                return await self._memory_client.get_emotional_state(user_id)
        except: pass
        return "neutral"

    async def _get_identity_traits(self, user_id: str) -> List[str]:
        try:
            if self._memory_client:
                return await self._memory_client.get_identity_traits(user_id) or []
        except: pass
        return []

    async def start_study_session(self, user_id: str, concept: str, age_group: str = "teen", language: str = "ar") -> Dict[str, Any]:
        await self._inject_dependencies()
        emotion = await self._get_emotion(user_id)
        
        import time
        session = SessionState(concept=concept, age_group=age_group, time_started=time.time(), emotion_before=emotion)
        self.active_sessions[user_id] = session

        # استخدام Learning Personality للتحية
        greeting = await self.personality.get_greeting(user_id, self.mind, self.memory, language)
        
        # توليد الشرح
        explanation = await self._generate_explanation(concept, age_group, language, emotion, user_id)
        
        # Dynamic Knowledge Graph خاص بالطالب
        learning_path = []
        if self._knowledge_graph:
            try:
                learning_path = await self._knowledge_graph.get_user_learning_path(user_id, concept)
            except: pass

        return {
            "session_id": f"{user_id}_{concept}",
            "concept": concept,
            "greeting": greeting,
            "explanation": explanation,
            "learning_path": learning_path,
            "student_emotion": emotion,
            "next_step": "ask_understanding",
        }

    async def process_answer(self, user_id: str, answer: str) -> Dict[str, Any]:
        await self._inject_dependencies()
        if user_id not in self.active_sessions:
            return {"error": "لا توجد جلسة نشطة"}
        
        session = self.active_sessions[user_id]
        session.questions_asked += 1
        
        # ── كشف مستوى الثقة من الإجابة ──
        confidence_weight = 1.0
        uncertainty_markers = ["مش متأكد", "أظن", "ربما", "ليس متأكداً", "لا أعرف", "not sure", "maybe", "think", "guess"]
        if any(marker in answer.lower() for marker in uncertainty_markers):
            confidence_weight = 0.5
        
        is_correct = False
        feedback = ""
        
        try:
            prompt = f"""قيم إجابة الطالب عن مفهوم '{session.concept}':
الإجابة: {answer}
هل هي صحيحة؟ أجب بـ 'نعم' أو 'لا' متبوعة بملاحظة قصيرة."""
            result, _ = await self.ai.route(prompt, task="study", user_id=user_id)
            is_correct = "نعم" in result
            feedback = result
        except:
            is_correct = len(answer.split()) > 3
            feedback = "إجابة مقبولة" if is_correct else "حاول مرة أخرى"

        if is_correct:
            session.correct_answers += 1
            session.current_depth = min(session.current_depth + 1, 6)
            next_action = "deepen"
        else:
            session.scaffold_level += 1
            next_action = "scaffold"

        accuracy = session.correct_answers / max(session.questions_asked, 1)
        
        # ── استخدام Confidence Weight مع SM-2 ──
        if self._scheduler:
            quality = 4 if is_correct else 1
            review_result = self._scheduler.calculate_next_review(
                concept=session.concept,
                quality=quality,
                confidence_weight=confidence_weight,
                emotional_state="joy" if is_correct else "frustration"
            )
        
        # تحديث Learning Mind Model
        await self.mind.update_after_session(user_id, session.concept, {
            "accuracy": accuracy,
            "questions_asked": session.questions_asked,
            "depth": session.current_depth,
            "time_spent_minutes": 0
        })
        
        # تخزين في Learning Memory
        await self.memory.store_session(user_id, {
            "concept": session.concept,
            "accuracy": accuracy,
            "questions_asked": session.questions_asked,
            "correct_answers": session.correct_answers,
            "depth_reached": session.current_depth,
            "emotion_before": session.emotion_before,
            "emotion_after": "joy" if is_correct else "frustration",
            "explanation_type": session.explanation_type_used
        })
        
        # تشجيع شخصي
        encouragement = await self.personality.get_encouragement(user_id, self.mind, {"accuracy": accuracy}, language="ar")
        
        return {
            "is_correct": is_correct,
            "confidence_weight": confidence_weight,
            "confidence_adjusted": confidence_weight < 0.6,
            "feedback": feedback,
            "encouragement": encouragement,
            "next_action": next_action,
            "current_depth": session.current_depth,
            "correct_count": session.correct_answers,
            "total_asked": session.questions_asked,
            "accuracy": f"{accuracy * 100:.0f}%",
        }

    async def end_session(self, user_id: str) -> Dict[str, Any]:
        if user_id not in self.active_sessions:
            return {"error": "لا توجد جلسة نشطة"}
        
        session = self.active_sessions.pop(user_id)
        accuracy = session.correct_answers / max(session.questions_asked, 1)
        
        # حفظ الجلسة في History
        await self._save_to_history(user_id, session, accuracy)
        
        return {
            "concept": session.concept,
            "questions_asked": session.questions_asked,
            "correct_answers": session.correct_answers,
            "accuracy": f"{accuracy * 100:.0f}%",
            "depth_reached": session.current_depth,
        }

    async def _save_to_history(self, user_id: str, session: SessionState, accuracy: float):
        try:
            if self._memory_client:
                await self._memory_client.store_entity("project", user_id, {
                    "title": f"جلسة دراسة: {session.concept}",
                    "type": "study",
                    "data": {
                        "concept": session.concept,
                        "accuracy": f"{accuracy * 100:.0f}%",
                        "questions_asked": session.questions_asked,
                        "correct_answers": session.correct_answers,
                        "depth_reached": session.current_depth
                    },
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "user_id": user_id
                })
        except Exception as e:
            logger.warning(f"Failed to save study session: {e}")

    async def _generate_explanation(self, concept: str, age_group: str, language: str, emotion: str, user_id: str) -> Dict[str, Any]:
        # استخدام Scaffold مع Long Context
        if self._scaffold:
            try:
                student_dict = {"important_people": [], "identity_traits": await self._get_identity_traits(user_id)}
                return await self._scaffold.explain(
                    concept=concept, student_profile=student_dict,
                    age_group=age_group, language=language,
                    current_emotion=emotion, depth=1,
                    user_id=user_id, memory_client=self._memory_client
                )
            except Exception as e:
                logger.warning(f"SCAFFOLD failed: {e}")
        
        try:
            prompt = f"""أنت معلم خبير. اشرح مفهوم '{concept}' لطالب عمره {age_group}.
استخدم لغة {language}. قدم: 1. شرح مبسط 2. تشبيه 3. مثال عملي"""
            text, provider = await self.ai.route(prompt, task="study", user_id=user_id)
            return {"simplified": text, "generated_by": provider}
        except:
            return {"simplified": f"شرح مبسط لـ {concept}"}

    async def get_learning_dashboard(self, user_id: str, lang: str = "ar") -> Dict[str, Any]:
        await self._inject_dependencies()
        profile = await self.mind.get_full_profile(user_id)
        fav_subject = await self.memory.get_favorite_subject(user_id)
        feared_subject = await self.memory.get_feared_subject(user_id)
        best_time = await self.memory.get_best_learning_time(user_id)
        streak = await self.memory.get_longest_streak(user_id)
        reminder = await self.personality.get_study_reminder(user_id, self.mind, self.memory, lang)
        weak_areas = await self.mind.get_weak_areas(user_id)
        
        return {
            "greeting": await self.personality.get_greeting(user_id, self.mind, self.memory, lang),
            "learning_identity": profile.get("learning_identity", ""),
            "favorite_subject": fav_subject,
            "feared_subject": feared_subject,
            "best_learning_time": best_time,
            "longest_streak": streak,
            "weak_areas": weak_areas,
            "reminder": reminder,
            "confidence": profile.get("learning_confidence", {}),
        }

    def register_routes(self, app: Any) -> bool:
        try:
            from app.api.routes.study_routes import router
            app.include_router(router)
            return True
        except Exception as e:
            logger.warning(f"Study routes not registered: {e}")
            return False


athena = ATHENAOrchestrator()
logger.info("✅ ATHENA v6.0 – عقل التعليم الواعي جاهز")
