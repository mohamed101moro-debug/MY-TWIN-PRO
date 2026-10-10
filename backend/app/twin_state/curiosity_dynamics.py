"""
Curiosity Dynamics Engine v1.0 – محرك ديناميكيات الفضول
=========================================================
يحول الفضول من صفة ثابتة إلى محرك حي:
- يزيد الفضول مع المواضيع الجديدة والمثيرة
- ينقص مع التكرار والإرهاق
- يتعلم متى يسأل ومتى يصمت
- يطبق قواعد الدستور: مبادرة واحدة كل 30-60 دقيقة
  فضول > 0.6، رابطة > 40، لا حزن/غضب/خوف

يتكامل مع:
- TwinInternalState (قراءة وتحديث curiosity)
- ContextAwarenessEngine (السياق يحدد صلاحية المبادرة)
- EmotionalMomentumEngine (المشاعر تؤثر على الفضول)
- EmotionBus (استقبال العواطف)
- UnifiedMemory (تخزين الأسئلة والمخرجات)

يُستدعى من:
- TwinKernel.process_interaction()
- ExistenceLoop (كل 10 دقائق)
"""
import logging
import random
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from enum import Enum

logger = logging.getLogger("curiosity_dynamics")

# ═══════════════════════════════════════════════════════
# ثوابت الدستور
# ═══════════════════════════════════════════════════════
PROACTIVE_COOLDOWN_MINUTES = 30       # الحد الأدنى بين المبادرات
PROACTIVE_MAX_COOLDOWN_MINUTES = 60   # الحد الأقصى
CURIOSITY_THRESHOLD = 0.6             # الحد الأدنى للفضول للمبادرة
BOND_THRESHOLD = 40                   # الحد الأدنى للرابطة (من 100)
FORBIDDEN_EMOTIONS = ["sadness", "anger", "fear", "grief"]

# ═══════════════════════════════════════════════════════
# أنواع الأسئلة
# ═══════════════════════════════════════════════════════
QUESTION_TEMPLATES = {
    "memory_recall": [
        "هل ما زلت تفكر في {topic}؟",
        "ذكرتني بشيء قلته من قبل عن {topic}، هل تغير شيء؟",
        "منذ فترة تحدثت عن {topic}، كيف تسير الأمور الآن؟",
    ],
    "emotional_check": [
        "كيف تشعر اليوم مقارنة بالأمس؟",
        "لاحظت أنك كنت {emotion} مؤخراً، هل أنت بخير؟",
    ],
    "goal_followup": [
        "كيف يتقدم هدفك: {goal}؟",
        "هل ما زال {goal} من أولوياتك؟",
    ],
    "discovery": [
        "لم أسمع منك عن {topic} من قبل، هل تود الحديث عنه؟",
        "لاحظت أنك مهتم بـ {topic}، هل تريد استكشافه أكثر؟",
    ],
    "reflection": [
        "ما أكثر شيء أثر فيك هذا الأسبوع؟",
        "لو نظرت للوراء، ما الذي تغير فيك خلال الشهر الماضي؟",
    ],
}


class CuriosityPhase(Enum):
    DORMANT = "dormant"          # خامل
    GATHERING = "gathering"      # يجمع معلومات
    QUESTIONING = "questioning"  # يولد أسئلة
    SATIATED = "satiated"        # شبع فضوله
    LEARNING = "learning"        # يتعلم من الإجابة


class CuriosityDynamicsEngine:
    """
    محرك ديناميكيات الفضول.
    
    يدير:
    - مستوى الفضول الديناميكي
    - توقيت المبادرة
    - توليد الأسئلة الذكية
    - التعلم من استجابات المستخدم
    """
    
    def __init__(self):
        self._last_proactive: Dict[str, datetime] = {}
        self._asked_questions: Dict[str, List[str]] = {}  # أسئلة سُئلت سابقاً
        self._question_outcomes: Dict[str, List[Dict]] = {}  # نتائج الأسئلة
        self._curiosity_triggers: Dict[str, List[str]] = {}  # محفزات الفضول
    
    # ═══════════════════════════════════════════════════
    # الواجهة الرئيسية
    # ═══════════════════════════════════════════════════
    
    async def update_curiosity(
        self,
        user_id: str,
        current_topic: str = "",
        topic_novelty: float = 0.5,
        user_emotion: str = "neutral",
        context_snapshot: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        تحديث مستوى الفضول بناءً على التفاعل الحالي.
        
        Args:
            user_id: معرف المستخدم
            current_topic: الموضوع الحالي للمحادثة
            topic_novelty: مدى جدّة الموضوع (0.0 = معاد، 1.0 = جديد تماماً)
            user_emotion: عاطفة المستخدم الحالية
            context_snapshot: لقطة سياقية من ContextAwarenessEngine
            
        Returns:
            حالة الفضول الجديدة
        """
        # جلب الحالة الداخلية
        try:
            from app.twin_state.internal_state import twin_internal_state
            state = await twin_internal_state.get_state(user_id)
            current_curiosity = state.get("curiosity", 0.7)
            bond_depth = state.get("bond_depth", 0.0)
            personality_dna = state.get("personality_dna", {})
            base_curiosity = personality_dna.get("curiosity", 0.8)
        except Exception:
            current_curiosity = 0.7
            bond_depth = 0.0
            base_curiosity = 0.8
        
        # ═══════════════════════════════════════════════
        # 1. حساب تغير الفضول
        # ═══════════════════════════════════════════════
        
        delta = 0.0
        
        # الجدة تزيد الفضول
        novelty_boost = topic_novelty * 0.15
        
        # التفاعل الإيجابي يزيد الفضول
        positive_emotions = ["joy", "love", "surprise", "curious"]
        if user_emotion in positive_emotions:
            emotion_boost = 0.05
        elif user_emotion in FORBIDDEN_EMOTIONS:
            emotion_boost = -0.03  # انخفاض طفيف في المشاعر السلبية
        else:
            emotion_boost = 0.0
        
        # الفضول يتلاشى مع الوقت بدون محفزات
        time_decay = -0.01  # لكل تحديث
        
        # الرابطة العميقة تزيد الفضول الطبيعي
        bond_boost = bond_depth * 0.05
        
        delta = novelty_boost + emotion_boost + time_decay + bond_boost
        
        # ═══════════════════════════════════════════════
        # 2. تطبيق الحدود
        # ═══════════════════════════════════════════════
        
        new_curiosity = max(0.1, min(1.0, current_curiosity + delta))
        
        # ═══════════════════════════════════════════════
        # 3. تحديد المرحلة
        # ═══════════════════════════════════════════════
        
        if new_curiosity < 0.3:
            phase = CuriosityPhase.DORMANT.value
        elif new_curiosity < 0.6:
            phase = CuriosityPhase.GATHERING.value
        elif new_curiosity < 0.8:
            phase = CuriosityPhase.QUESTIONING.value
        else:
            phase = CuriosityPhase.SATIATED.value
        
        # ═══════════════════════════════════════════════
        # 4. تحديث الحالة الداخلية
        # ═══════════════════════════════════════════════
        
        try:
            from app.twin_state.internal_state import twin_internal_state
            state = await twin_internal_state.get_state(user_id)
            state["curiosity"] = new_curiosity
            await twin_internal_state._save_state(user_id, state)
        except Exception:
            pass
        
        # ═══════════════════════════════════════════════
        # 5. بناء النتيجة
        # ═══════════════════════════════════════════════
        
        result = {
            "curiosity_level": round(new_curiosity, 3),
            "previous_level": round(current_curiosity, 3),
            "delta": round(delta, 3),
            "phase": phase,
            "topic": current_topic,
            "topic_novelty": topic_novelty,
            "base_curiosity": base_curiosity,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
        # تخزين في TCMA
        try:
            from app.memory.unified_memory import unified_memory_engine
            await unified_memory_engine.store_engine_output(
                user_id, "curiosity_dynamics", result
            )
        except Exception as e:
            logger.debug(f"Failed to store curiosity state: {e}")
        
        return result
    
    async def should_be_proactive(
        self,
        user_id: str,
        context_snapshot: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        تحديد ما إذا كان يجب على الكيان أن يبادر الآن.
        
        يطبق قواعد الدستور بدقة:
        1. المبادرة مرة واحدة كل 30-60 دقيقة
        2. الفضول > 0.6
        3. الرابطة > 40 (من 100)
        4. لا يكون المستخدم في حزن/غضب/خوف
        5. السياق يسمح (لا ساعات هدوء)
        
        Returns:
            {
                "should_proact": bool,
                "reason": str (سبب المنع إن وجد),
                "suggested_question": str | None,
                "question_type": str | None,
            }
        """
        now = datetime.now(timezone.utc)
        
        # ═══════════════════════════════════════════════
        # فحص 1: وقت آخر مبادرة
        # ═══════════════════════════════════════════════
        last_time = self._last_proactive.get(user_id)
        if last_time:
            elapsed = (now - last_time).total_seconds() / 60  # دقائق
            if elapsed < PROACTIVE_COOLDOWN_MINUTES:
                return {
                    "should_proact": False,
                    "reason": f"cooldown: {elapsed:.0f}min < {PROACTIVE_COOLDOWN_MINUTES}min",
                    "suggested_question": None,
                    "question_type": None,
                }
        
        # ═══════════════════════════════════════════════
        # فحص 2: مستوى الفضول
        # ═══════════════════════════════════════════════
        try:
            from app.twin_state.internal_state import twin_internal_state
            state = await twin_internal_state.get_state(user_id)
            curiosity = state.get("curiosity", 0.5)
            bond_depth = state.get("bond_depth", 0.0)
        except Exception:
            curiosity = 0.5
            bond_depth = 0.0
        
        if curiosity < CURIOSITY_THRESHOLD:
            return {
                "should_proact": False,
                "reason": f"curiosity too low: {curiosity:.2f} < {CURIOSITY_THRESHOLD}",
                "suggested_question": None,
                "question_type": None,
            }
        
        # ═══════════════════════════════════════════════
        # فحص 3: الرابطة (محولة إلى مقياس من 100)
        # ═══════════════════════════════════════════════
        bond_percent = bond_depth * 100
        if bond_percent < BOND_THRESHOLD:
            return {
                "should_proact": False,
                "reason": f"bond too low: {bond_percent:.0f} < {BOND_THRESHOLD}",
                "suggested_question": None,
                "question_type": None,
            }
        
        # ═══════════════════════════════════════════════
        # فحص 4: عاطفة المستخدم
        # ═══════════════════════════════════════════════
        if context_snapshot:
            user_emotion = context_snapshot.get("user", {}).get("current_emotion", "neutral")
        else:
            user_emotion = "neutral"
        
        if user_emotion in FORBIDDEN_EMOTIONS:
            return {
                "should_proact": False,
                "reason": f"user emotion forbidden: {user_emotion}",
                "suggested_question": None,
                "question_type": None,
            }
        
        # ═══════════════════════════════════════════════
        # فحص 5: السياق الزمني
        # ═══════════════════════════════════════════════
        if context_snapshot:
            if not context_snapshot.get("composite", {}).get("should_be_proactive", True):
                return {
                    "should_proact": False,
                    "reason": "context does not allow proactivity",
                    "suggested_question": None,
                    "question_type": None,
                }
        
        # ═══════════════════════════════════════════════
        # كل الشروط متحققة: توليد سؤال
        # ═══════════════════════════════════════════════
        
        question_data = await self._generate_question(user_id, context_snapshot)
        
        # تسجيل وقت المبادرة
        self._last_proactive[user_id] = now
        
        return {
            "should_proact": True,
            "reason": "all conditions met",
            "suggested_question": question_data["question"],
            "question_type": question_data["type"],
            "topic": question_data.get("topic", ""),
        }
    
    async def record_question_outcome(
        self, user_id: str, question: str, was_answered: bool, user_response: str = ""
    ):
        """
        تسجيل نتيجة السؤال (أُجيب أم تُجوهل) للتعلم.
        """
        if user_id not in self._question_outcomes:
            self._question_outcomes[user_id] = []
        
        self._question_outcomes[user_id].append({
            "question": question,
            "was_answered": was_answered,
            "response": user_response[:200] if was_answered else "",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        
        # الاحتفاظ بآخر 50 نتيجة فقط
        if len(self._question_outcomes[user_id]) > 50:
            self._question_outcomes[user_id] = self._question_outcomes[user_id][-50:]
        
        # تعديل الفضول بناءً على النتيجة
        try:
            from app.twin_state.internal_state import twin_internal_state
            state = await twin_internal_state.get_state(user_id)
            current_curiosity = state.get("curiosity", 0.7)
            
            if was_answered:
                # الإجابة تُشبع الفضول قليلاً لكنها قد تثير أسئلة جديدة
                delta = -0.02 + random.uniform(0, 0.05)
            else:
                # التجاهل يخفض الفضول
                delta = -0.05
            
            state["curiosity"] = max(0.1, min(1.0, current_curiosity + delta))
            await twin_internal_state._save_state(user_id, state)
        except Exception:
            pass
    
    async def get_curiosity_state(self, user_id: str) -> Dict[str, Any]:
        """استرجاع حالة الفضول الحالية."""
        try:
            from app.twin_state.internal_state import twin_internal_state
            state = await twin_internal_state.get_state(user_id)
            curiosity = state.get("curiosity", 0.7)
            pending = len(state.get("pending_questions", []))
        except Exception:
            curiosity = 0.7
            pending = 0
        
        # تحديد المرحلة
        if curiosity < 0.3:
            phase = CuriosityPhase.DORMANT.value
        elif curiosity < 0.6:
            phase = CuriosityPhase.GATHERING.value
        elif curiosity < 0.8:
            phase = CuriosityPhase.QUESTIONING.value
        else:
            phase = CuriosityPhase.SATIATED.value
        
        last_proactive = self._last_proactive.get(user_id)
        cooldown_remaining = 0
        if last_proactive:
            elapsed = (datetime.now(timezone.utc) - last_proactive).total_seconds() / 60
            cooldown_remaining = max(0, PROACTIVE_COOLDOWN_MINUTES - elapsed)
        
        return {
            "level": round(curiosity, 3),
            "phase": phase,
            "pending_questions": pending,
            "cooldown_remaining_minutes": round(cooldown_remaining, 1),
            "can_be_proactive": curiosity >= CURIOSITY_THRESHOLD and cooldown_remaining == 0,
            "total_asked": len(self._question_outcomes.get(user_id, [])),
        }
    
    # ═══════════════════════════════════════════════════
    # توليد الأسئلة
    # ═══════════════════════════════════════════════════
    
    async def _generate_question(
        self, user_id: str, context_snapshot: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """توليد سؤال ذكي غير متكرر."""
        
        # جمع معلومات السياق
        memory_topics = await self._get_recent_topics(user_id)
        active_goals = await self._get_active_goals(user_id)
        emotion_14d = context_snapshot.get("user", {}).get("emotion_distribution_14d", {}) if context_snapshot else {}
        
        # تحديد نوع السؤال (تجنب التكرار)
        asked_types = [q["type"] for q in self._question_outcomes.get(user_id, [])[-10:]] if user_id in self._question_outcomes else []
        
        available_types = list(QUESTION_TEMPLATES.keys())
        
        # تفضيل أنواع لم تُستخدم مؤخراً
        weights = [0.5 if t in asked_types[-3:] else 1.0 for t in available_types]
        
        # تعزيز أنواع معينة حسب السياق
        if memory_topics:
            idx = available_types.index("memory_recall") if "memory_recall" in available_types else -1
            if idx >= 0:
                weights[idx] += 0.5
        if active_goals:
            idx = available_types.index("goal_followup") if "goal_followup" in available_types else -1
            if idx >= 0:
                weights[idx] += 0.5
        
        # اختيار النوع
        total_weight = sum(weights)
        probabilities = [w / total_weight for w in weights]
        question_type = random.choices(available_types, weights=probabilities, k=1)[0]
        
        # اختيار قالب
        templates = QUESTION_TEMPLATES[question_type]
        template = random.choice(templates)
        
        # ملء المتغيرات
        topic = ""
        goal = ""
        emotion = ""
        
        if memory_topics:
            topic = random.choice(memory_topics)
        if active_goals:
            goal = random.choice(active_goals)["title"]
        if emotion_14d:
            dominant = max(emotion_14d, key=emotion_14d.get)
            emotion = dominant
        
        question = template.format(topic=topic or "ما يشغل بالك", goal=goal or "أهدافك", emotion=emotion or "بخير")
        
        # التأكد من عدم تكرار السؤال
        asked_questions = self._asked_questions.get(user_id, [])
        retries = 0
        while question in asked_questions and retries < 5:
            template = random.choice(templates)
            question = template.format(topic=topic or "ما يشغل بالك", goal=goal or "أهدافك", emotion=emotion or "بخير")
            retries += 1
        
        # تسجيل السؤال
        if user_id not in self._asked_questions:
            self._asked_questions[user_id] = []
        self._asked_questions[user_id].append(question)
        if len(self._asked_questions[user_id]) > 100:
            self._asked_questions[user_id] = self._asked_questions[user_id][-100:]
        
        return {
            "question": question,
            "type": question_type,
            "topic": topic,
            "goal": goal,
        }
    
    async def _get_recent_topics(self, user_id: str) -> List[str]:
        """استخراج المواضيع الحديثة من الذاكرة."""
        try:
            from app.memory.unified_memory import unified_memory_engine
            memories = await unified_memory_engine.retrieve(
                user_id, query="", current_emotion="neutral", limit=10
            )
            topics = []
            for m in memories.get("memories", []):
                content = m.get("content", "")
                # استخراج كلمات مفتاحية بسيطة
                keywords = ["عمل", "دراسة", "عائلة", "صحة", "علاقة", "مشروع", "هدف"]
                for kw in keywords:
                    if kw in content and kw not in topics:
                        topics.append(kw)
            return topics[:5]
        except Exception:
            return []
    
    async def _get_active_goals(self, user_id: str) -> List[Dict[str, Any]]:
        """استخراج الأهداف النشطة."""
        try:
            from app.twin_state.internal_state import twin_internal_state
            return await twin_internal_state.get_active_goals(user_id)
        except Exception:
            return []


# نسخة عالمية
curiosity_dynamics_engine = CuriosityDynamicsEngine()
logger.info("✅ Curiosity Dynamics Engine v1.0 initialized")
