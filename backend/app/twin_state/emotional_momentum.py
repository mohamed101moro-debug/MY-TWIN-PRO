"""
Emotional Momentum Engine v1.0 – محرك الزخم العاطفي
=====================================================
يمنع القفزات العاطفية المفاجئة. يضمن تدفق المشاعر عبر مسارات انتقالية طبيعية.
يطبق قاعدة الدستور: "المشاعر لا تقفز. حزن → تفكر → راحة → أمل → فرح"

يتكامل مع:
- EmotionBus (قراءة العاطفة الحالية وبث الزخم)
- TwinInternalState (تخزين حالة الزخم)
- UnifiedMemory (حفظ سجلات الزخم)
- ContextAwarenessEngine (السياق المحيط)

يُستدعى من:
- TwinKernel.process_interaction()
- ExistenceLoop (كل 60 ثانية)
"""
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone, timedelta
from enum import Enum

logger = logging.getLogger("emotional_momentum")

# ═══════════════════════════════════════════════════════
# مسارات التحول العاطفي (Emotional Transition Paths)
# ═══════════════════════════════════════════════════════
# كل عاطفة لها قائمة بالعواطف المسموح الانتقال إليها مباشرة
# وأخرى تحتاج مروراً بعواطف وسيطة

EMOTIONAL_TRANSITION_PATHS: Dict[str, Dict[str, Any]] = {
    "joy": {
        "allowed_next": ["joy", "love", "surprise", "neutral", "calm", "contemplative"],
        "forbidden_jump_to": ["sadness", "anger", "fear", "grief"],
        "momentum_decay": 0.15,  # سرعة تلاشي الزخم (أقل = أبطأ)
        "intensity_baseline": 0.7,
    },
    "sadness": {
        "allowed_next": ["sadness", "neutral", "contemplative", "calm"],
        "forbidden_jump_to": ["joy", "love", "energetic"],
        "requires_path_to_joy": ["contemplative", "calm", "hope", "joy"],
        "momentum_decay": 0.08,
        "intensity_baseline": 0.6,
    },
    "fear": {
        "allowed_next": ["fear", "neutral", "calm", "contemplative"],
        "forbidden_jump_to": ["joy", "love", "energetic", "playful"],
        "requires_path_to_joy": ["calm", "neutral", "hope", "joy"],
        "momentum_decay": 0.10,
        "intensity_baseline": 0.7,
    },
    "anger": {
        "allowed_next": ["anger", "neutral", "contemplative", "calm"],
        "forbidden_jump_to": ["joy", "love", "playful"],
        "requires_path_to_joy": ["contemplative", "calm", "neutral", "hope", "joy"],
        "momentum_decay": 0.12,
        "intensity_baseline": 0.8,
    },
    "love": {
        "allowed_next": ["love", "joy", "affectionate", "calm", "neutral"],
        "forbidden_jump_to": ["anger", "fear"],
        "momentum_decay": 0.10,
        "intensity_baseline": 0.8,
    },
    "surprise": {
        "allowed_next": ["surprise", "neutral", "joy", "fear", "curious"],
        "forbidden_jump_to": [],
        "momentum_decay": 0.25,  # المفاجأة تتلاشى بسرعة
        "intensity_baseline": 0.6,
    },
    "neutral": {
        "allowed_next": ["neutral", "joy", "sadness", "surprise", "calm", "contemplative", "curious"],
        "forbidden_jump_to": [],
        "momentum_decay": 0.20,
        "intensity_baseline": 0.5,
    },
    "contemplative": {
        "allowed_next": ["contemplative", "calm", "neutral", "sadness", "hope"],
        "forbidden_jump_to": ["energetic", "playful"],
        "momentum_decay": 0.06,
        "intensity_baseline": 0.4,
    },
    "calm": {
        "allowed_next": ["calm", "neutral", "joy", "contemplative", "hope"],
        "forbidden_jump_to": ["anger", "energetic"],
        "momentum_decay": 0.05,
        "intensity_baseline": 0.3,
    },
    "hope": {
        "allowed_next": ["hope", "joy", "calm", "neutral"],
        "forbidden_jump_to": ["anger", "fear"],
        "momentum_decay": 0.08,
        "intensity_baseline": 0.5,
    },
}

# ═══════════════════════════════════════════════════════
# حالة الزخم العاطفي
# ═══════════════════════════════════════════════════════

class MomentumPhase(Enum):
    RISING = "rising"         # الزخم يتصاعد
    PEAK = "peak"             # الذروة
    DECAYING = "decaying"     # التلاشي
    STABLE = "stable"         # مستقر
    TRANSITIONING = "transitioning"  # في مرحلة انتقالية


class EmotionalMomentumEngine:
    """
    محرك الزخم العاطفي.
    
    يضمن:
    - عدم وجود قفزات عاطفية مفاجئة
    - المرور بمسارات انتقالية طبيعية
    - استقرار العاطفة قبل السماح بالتغيير
    - تدفق عاطفي سلس يشعر به المستخدم
    """
    
    def __init__(self):
        self._momentum_states: Dict[str, Dict[str, Any]] = {}
        self._emotion_durations: Dict[str, Dict[str, float]] = {}
    
    # ═══════════════════════════════════════════════════
    # الواجهة الرئيسية
    # ═══════════════════════════════════════════════════
    
    async def update_momentum(
        self,
        user_id: str,
        detected_emotion: str,
        emotion_intensity: float = 0.5,
        context_snapshot: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        تحديث الزخم العاطفي بناءً على العاطفة المكتشفة.
        
        Args:
            user_id: معرف المستخدم
            detected_emotion: العاطفة التي تم اكتشافها من Emotion Engine
            emotion_intensity: شدة العاطفة (0.0 - 1.0)
            context_snapshot: لقطة سياقية من ContextAwarenessEngine
            
        Returns:
            حالة الزخم العاطفي الجديدة متضمنة:
            - effective_emotion: العاطفة الفعلية بعد تطبيق قيود الزخم
            - momentum_phase: مرحلة الزخم الحالية
            - transition_path: مسار التحول (إن وجد)
            - requires_silence: هل يتطلب لحظة صمت؟
        """
        now = datetime.now(timezone.utc)
        
        # استرجاع حالة الزخم السابقة
        previous_state = await self._get_momentum_state(user_id)
        previous_emotion = previous_state.get("current_emotion", "neutral")
        previous_intensity = previous_state.get("intensity", 0.5)
        previous_phase = previous_state.get("phase", MomentumPhase.STABLE.value)
        
        # الحصول على قواعد العاطفة
        detected_rules = EMOTIONAL_TRANSITION_PATHS.get(
            detected_emotion,
            EMOTIONAL_TRANSITION_PATHS["neutral"]
        )
        previous_rules = EMOTIONAL_TRANSITION_PATHS.get(
            previous_emotion,
            EMOTIONAL_TRANSITION_PATHS["neutral"]
        )
        
        # ═══════════════════════════════════════════════
        # 1. هل هذا الانتقال مسموح به مباشرة؟
        # ═══════════════════════════════════════════════
        
        is_allowed_direct = detected_emotion == previous_emotion or \
                           detected_emotion in previous_rules.get("allowed_next", [])
        
        is_forbidden = detected_emotion in previous_rules.get("forbidden_jump_to", [])
        
        effective_emotion = previous_emotion
        transition_path = None
        requires_silence = False
        new_phase = previous_phase
        
        if is_forbidden:
            # ═══════════════════════════════════════════
            # الانتقال ممنوع مباشرة. نحتاج مساراً انتقالياً
            # ═══════════════════════════════════════════
            
            # الحصول على مسار التحول المطلوب
            required_path = previous_rules.get("requires_path_to_joy", [])
            if not required_path:
                # إذا لم يكن هناك مسار محدد، نستخدم مساراً افتراضياً
                if previous_emotion in ["sadness", "anger", "fear", "grief"]:
                    required_path = ["contemplative", "calm", "hope", "joy"]
                else:
                    required_path = ["neutral", detected_emotion]
            
            # تحديد الموقع الحالي في المسار
            current_path_position = 0
            if previous_emotion in required_path:
                current_path_position = required_path.index(previous_emotion)
            
            # هل يمكننا التقدم خطوة في المسار؟
            if current_path_position < len(required_path) - 1:
                next_step = required_path[current_path_position + 1]
                effective_emotion = next_step
                transition_path = required_path[current_path_position:]
                new_phase = MomentumPhase.TRANSITIONING.value
                requires_silence = True  # لحظة صمت للتغير العاطفي
                
                logger.info(
                    f"🔄 زخم عاطفي: {previous_emotion} -> {effective_emotion} "
                    f"(المسار: {' → '.join(transition_path)})"
                )
            else:
                # وصلنا لنهاية المسار، يمكننا الانتقال
                effective_emotion = detected_emotion
                transition_path = None
                new_phase = MomentumPhase.STABLE.value
                
        elif is_allowed_direct and detected_emotion != previous_emotion:
            # ═══════════════════════════════════════════
            # الانتقال مسموح مباشرة
            # ═══════════════════════════════════════════
            
            # التحقق من الاستقرار: كم من الوقت بقينا في العاطفة السابقة؟
            duration = await self._get_emotion_duration(user_id, previous_emotion)
            min_duration = (1.0 - previous_rules.get("momentum_decay", 0.1)) * 10  # ثوانٍ
            
            if duration >= min_duration:
                effective_emotion = detected_emotion
                new_phase = MomentumPhase.STABLE.value
            else:
                # لم نستقر بعد في العاطفة الحالية
                effective_emotion = previous_emotion
                new_phase = MomentumPhase.STABLE.value
                logger.debug(f"⏳ لم يستقر بعد في {previous_emotion}: {duration:.1f}s < {min_duration:.1f}s")
        
        elif detected_emotion == previous_emotion:
            # ═══════════════════════════════════════════
            # نفس العاطفة. تحديث الشدة والمرحلة
            # ═══════════════════════════════════════════
            
            effective_emotion = previous_emotion
            
            # تحديد المرحلة بناءً على تغير الشدة
            intensity_delta = emotion_intensity - previous_intensity
            
            if intensity_delta > 0.15:
                new_phase = MomentumPhase.RISING.value
            elif intensity_delta < -0.15:
                new_phase = MomentumPhase.DECAYING.value
            elif abs(intensity_delta) < 0.05 and previous_phase != MomentumPhase.STABLE.value:
                new_phase = MomentumPhase.STABLE.value
            else:
                new_phase = previous_phase
        
        # ═══════════════════════════════════════════════
        # 2. حساب الزخم الجديد
        # ═══════════════════════════════════════════════
        
        # معامل التلاشي (كلما كان أصغر، كان الانتقال أبطأ)
        decay_rate = previous_rules.get("momentum_decay", 0.1)
        
        # حساب الزخم
        previous_momentum = previous_state.get("momentum_value", 0.0)
        
        if effective_emotion != previous_emotion:
            # تغير العاطفة: الزخم يعاد ضبطه
            new_momentum = 0.0
        else:
            # نفس العاطفة: الزخم يتغير تدريجياً
            intensity_factor = abs(emotion_intensity - previous_intensity)
            if intensity_factor > 0.1:
                new_momentum = min(previous_momentum + intensity_factor * 0.3, 1.0)
            else:
                # تلاشي طبيعي
                new_momentum = max(previous_momentum - decay_rate * 0.05, 0.0)
        
        # ═══════════════════════════════════════════════
        # 3. بناء حالة الزخم الجديدة
        # ═══════════════════════════════════════════════
        
        momentum_state = {
            "current_emotion": effective_emotion,
            "detected_emotion": detected_emotion,
            "previous_emotion": previous_emotion,
            "intensity": round(emotion_intensity, 3),
            "momentum_value": round(new_momentum, 3),
            "phase": new_phase,
            "transition_path": transition_path,
            "requires_silence": requires_silence,
            "is_in_transition": new_phase == MomentumPhase.TRANSITIONING.value,
            "timestamp": now.isoformat(),
            "time_in_current_emotion": await self._get_emotion_duration(user_id, effective_emotion),
        }
        
        # حفظ الحالة
        self._momentum_states[user_id] = momentum_state
        await self._record_emotion_change(user_id, effective_emotion, now)
        
        # تخزين في TCMA
        try:
            from app.memory.unified_memory import unified_memory_engine
            await unified_memory_engine.store_engine_output(
                user_id, "emotional_momentum", {
                    "effective_emotion": effective_emotion,
                    "detected_emotion": detected_emotion,
                    "phase": new_phase,
                    "momentum": new_momentum,
                    "requires_silence": requires_silence,
                }
            )
        except Exception as e:
            logger.debug(f"Failed to store momentum: {e}")
        
        # بث الزخم عبر EmotionBus
        try:
            from app.twin_state.emotion_bus import emotion_bus
            await emotion_bus.broadcast(
                user_id,
                effective_emotion,
                {
                    "source": "emotional_momentum",
                    "detected": detected_emotion,
                    "phase": new_phase,
                    "momentum": new_momentum,
                    "requires_silence": requires_silence,
                }
            )
        except Exception as e:
            logger.debug(f"Failed to broadcast momentum: {e}")
        
        return momentum_state
    
    async def get_effective_emotion(
        self, user_id: str, desired_emotion: str, intensity: float = 0.5
    ) -> str:
        """
        الحصول على العاطفة الفعالة التي يجب استخدامها في الرد.
        تطبق قيود الزخم على العاطفة المرغوبة.
        """
        state = await self.update_momentum(user_id, desired_emotion, intensity)
        return state["current_emotion"]
    
    async def should_apply_silence(self, user_id: str) -> bool:
        """
        هل يجب أن يصمت الكيان الآن بسبب تغير عاطفي؟
        """
        state = self._momentum_states.get(user_id, {})
        return state.get("requires_silence", False)
    
    async def get_silence_duration(self, user_id: str) -> float:
        """
        مدة الصمت الموصى بها (ثوانٍ) خلال التحول العاطفي.
        تطبق قاعدة الدستور: 1.5 - 3.5 ثانية
        """
        state = self._momentum_states.get(user_id, {})
        if state.get("requires_silence", False):
            import random
            base = 1.5
            momentum = state.get("momentum_value", 0.0)
            # كلما زاد الزخم، زادت مدة الصمت
            return base + momentum * 2.0 + random.uniform(0, 0.5)
        return 0.0
    
    async def get_momentum_state(self, user_id: str) -> Dict[str, Any]:
        """استرجاع حالة الزخم الحالية."""
        return await self._get_momentum_state(user_id)
    
    # ═══════════════════════════════════════════════════
    # الدوال الداخلية
    # ═══════════════════════════════════════════════════
    
    async def _get_momentum_state(self, user_id: str) -> Dict[str, Any]:
        """استرجاع أو إنشاء حالة الزخم."""
        if user_id in self._momentum_states:
            return self._momentum_states[user_id]
        
        # محاولة التحميل من TCMA
        try:
            from app.memory.unified_memory import unified_memory_engine
            outputs = await unified_memory_engine.get_engine_outputs(
                user_id, "emotional_momentum", limit=1
            )
            if outputs:
                last = outputs[0]
                state = {
                    "current_emotion": last.get("effective_emotion", "neutral"),
                    "detected_emotion": last.get("detected_emotion", "neutral"),
                    "previous_emotion": "neutral",
                    "intensity": 0.5,
                    "momentum_value": last.get("momentum", 0.0),
                    "phase": last.get("phase", MomentumPhase.STABLE.value),
                    "transition_path": None,
                    "requires_silence": False,
                    "is_in_transition": False,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "time_in_current_emotion": 0.0,
                }
                self._momentum_states[user_id] = state
                return state
        except Exception:
            pass
        
        # حالة افتراضية
        state = {
            "current_emotion": "neutral",
            "detected_emotion": "neutral",
            "previous_emotion": "neutral",
            "intensity": 0.5,
            "momentum_value": 0.0,
            "phase": MomentumPhase.STABLE.value,
            "transition_path": None,
            "requires_silence": False,
            "is_in_transition": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "time_in_current_emotion": 0.0,
        }
        self._momentum_states[user_id] = state
        return state
    
    async def _record_emotion_change(self, user_id: str, emotion: str, timestamp: datetime):
        """تسجيل تغيير العاطفة لحساب المدة."""
        if user_id not in self._emotion_durations:
            self._emotion_durations[user_id] = {}
        
        self._emotion_durations[user_id][emotion] = timestamp.timestamp()
    
    async def _get_emotion_duration(self, user_id: str, emotion: str) -> float:
        """حساب مدة البقاء في عاطفة معينة (بالثواني)."""
        if user_id not in self._emotion_durations:
            return 0.0
        
        start_time = self._emotion_durations[user_id].get(emotion)
        if not start_time:
            return 0.0
        
        now = datetime.now(timezone.utc).timestamp()
        return now - start_time


# نسخة عالمية
emotional_momentum_engine = EmotionalMomentumEngine()
logger.info("✅ Emotional Momentum Engine v1.0 initialized")
