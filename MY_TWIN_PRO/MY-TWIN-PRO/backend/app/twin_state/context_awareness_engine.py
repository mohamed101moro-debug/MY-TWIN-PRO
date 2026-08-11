"""
Context Awareness Engine v1.0 – محرك الوعي السياقي (الجزء الأول)
==================================================================
الاستيرادات، تعريف الفئة، الدوال الرئيسية.
الجزء الثاني يحتوي الدوال المساعدة والتقييمات المركبة.
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from enum import Enum

logger = logging.getLogger("context_awareness_engine")

# ═══════════════════════════════════════════════════════
# أنواع السياق
# ═══════════════════════════════════════════════════════

class TimeOfDay(Enum):
    DAWN = "dawn"
    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"
    NIGHT = "night"

class SessionType(Enum):
    NEW = "new"
    RETURNING = "returning"
    LONG_ABSENCE = "long_absence"
    VERY_LONG_ABSENCE = "very_long_absence"
    RESUME_MID_TASK = "resume_mid_task"

class UserActivity(Enum):
    ACTIVE = "active"
    IDLE = "idle"
    AWAY = "away"
    TYPING = "typing"
    SPEAKING = "speaking"

class EnvironmentalState(Enum):
    INDOOR = "indoor"
    OUTDOOR = "outdoor"
    MOVING = "moving"
    STATIONARY = "stationary"
    LOW_BATTERY = "low_battery"
    CHARGING = "charging"
    UNKNOWN = "unknown"


class ContextAwarenessEngine:
    """
    محرك الوعي السياقي.
    يُنتج ContextSnapshot متكاملاً يُستخدم من جميع المحركات الأخرى.
    """
    
    def __init__(self):
        self._last_context: Dict[str, Dict[str, Any]] = {}
        self._context_history: Dict[str, list] = {}
    
    # ═══════════════════════════════════════════════════
    # الواجهة الرئيسية
    # ═══════════════════════════════════════════════════
    
    async def get_full_context(
        self,
        user_id: str,
        current_emotion: str = "neutral",
        user_activity: str = "active",
        device_info: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """بناء لقطة سياقية كاملة."""
        now = datetime.now(timezone.utc)
        
        # 1. السياق الزمني
        time_context = self._build_time_context(now)
        
        # 2. سياق المستخدم والعلاقة
        user_context = await self._build_user_context(user_id, current_emotion, user_activity)
        
        # 3. سياق الجلسة
        session_context = await self._build_session_context(user_id, now)
        
        # 4. سياق البيئة
        environment_context = self._build_environment_context(device_info)
        
        # 5. السياق المعرفي
        cognitive_context = await self._build_cognitive_context(user_id)
        
        # 6. تجميع اللقطة
        snapshot = {
            "timestamp": now.isoformat(),
            "time": time_context,
            "user": user_context,
            "session": session_context,
            "environment": environment_context,
            "cognitive": cognitive_context,
            "composite": {
                "urgency": self._assess_urgency(time_context, user_context, session_context),
                "privacy_level": self._assess_privacy(environment_context, user_context),
                "interaction_quality": self._assess_interaction_quality(session_context, user_context),
                "recommended_tone": self._recommend_tone(time_context, user_context, cognitive_context),
                "should_be_proactive": self._should_be_proactive(time_context, user_context, session_context),
            },
        }
        
        # حفظ التاريخ
        if user_id not in self._context_history:
            self._context_history[user_id] = []
        self._context_history[user_id].append(snapshot)
        if len(self._context_history[user_id]) > 50:
            self._context_history[user_id] = self._context_history[user_id][-50:]
        
        self._last_context[user_id] = snapshot
        
        # تخزين في TCMA
        try:
            from app.memory.unified_memory import unified_memory_engine
            await unified_memory_engine.store_engine_output(
                user_id, "context_awareness", {
                    "time_of_day": time_context["time_of_day"],
                    "session_type": session_context["session_type"],
                    "dominant_emotion": user_context.get("dominant_emotion", "neutral"),
                    "relationship_stage": user_context.get("relationship_stage", "unknown"),
                    "cognitive_load": cognitive_context.get("load_level", 0.0),
                    "composite": snapshot["composite"],
                }
            )
        except Exception as e:
            logger.debug(f"Failed to store context snapshot: {e}")
        
        logger.info(
            f"🌍 سياق {user_id}: {time_context['time_of_day']} | "
            f"{session_context['session_type']} | {user_context.get('dominant_emotion')}"
        )
        return snapshot
    
    async def get_current_context(self, user_id: str) -> Optional[Dict[str, Any]]:
        """استرجاع آخر لقطة سياقية."""
        return self._last_context.get(user_id)
    
    async def detect_context_shift(
        self, user_id: str, new_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """كشف التحولات السياقية الهامة."""
        old = self._last_context.get(user_id)
        if not old:
            return {
                "shift_detected": True,
                "shifts": ["initial_context"],
                "requires_adaptation": True,
            }
        
        shifts = []
        
        if old["time"]["time_of_day"] != new_context["time"]["time_of_day"]:
            shifts.append(
                f"time_shift:{old['time']['time_of_day']}->{new_context['time']['time_of_day']}"
            )
        
        old_emotion = old["user"].get("dominant_emotion", "neutral")
        new_emotion = new_context["user"].get("dominant_emotion", "neutral")
        if old_emotion != new_emotion:
            shifts.append(f"emotion_shift:{old_emotion}->{new_emotion}")
        
        if old["session"]["session_type"] != new_context["session"]["session_type"]:
            shifts.append(
                f"session_shift:{old['session']['session_type']}->"
                f"{new_context['session']['session_type']}"
            )
        
        old_load = old["cognitive"].get("load_level", 0.0)
        new_load = new_context["cognitive"].get("load_level", 0.0)
        if abs(new_load - old_load) > 0.3:
            shifts.append(f"cognitive_load_shift:{old_load:.2f}->{new_load:.2f}")
        
        requires_adaptation = len(shifts) > 0
        return {
            "shift_detected": requires_adaptation,
            "shifts": shifts,
            "requires_adaptation": requires_adaptation,
        }


    # ═══════════════════════════════════════════════════
    # بناة السياق الفرعي
    # ═══════════════════════════════════════════════════
    
    def _build_time_context(self, now: datetime) -> Dict[str, Any]:
        """بناء السياق الزمني."""
        hour = now.hour
        
        if 4 <= hour < 7:
            time_of_day = TimeOfDay.DAWN.value
        elif 7 <= hour < 12:
            time_of_day = TimeOfDay.MORNING.value
        elif 12 <= hour < 17:
            time_of_day = TimeOfDay.AFTERNOON.value
        elif 17 <= hour < 21:
            time_of_day = TimeOfDay.EVENING.value
        else:
            time_of_day = TimeOfDay.NIGHT.value
        
        weekday = now.weekday()
        is_weekend = weekday >= 5
        
        month = now.month
        if month in [12, 1, 2]:
            season = "winter"
        elif month in [3, 4, 5]:
            season = "spring"
        elif month in [6, 7, 8]:
            season = "summer"
        else:
            season = "autumn"
        
        return {
            "time_of_day": time_of_day,
            "hour": hour,
            "minute": now.minute,
            "weekday": weekday,
            "is_weekend": is_weekend,
            "season": season,
            "month": month,
            "iso_timestamp": now.isoformat(),
            "is_quiet_hours": hour < 7 or hour >= 22,
            "is_working_hours": 9 <= hour < 17 and not is_weekend,
            "is_peak_activity": 7 <= hour < 9 or 17 <= hour < 20,
        }
    
    async def _build_user_context(
        self, user_id: str, current_emotion: str, user_activity: str
    ) -> Dict[str, Any]:
        """بناء سياق المستخدم والعلاقة."""
        try:
            from app.twin_state.internal_state import twin_internal_state
            twin_state = await twin_internal_state.get_state(user_id)
            bond_depth = twin_state.get("bond_depth", 0.0)
            mood = twin_state.get("mood", "calm")
            personality_dna = twin_state.get("personality_dna", {})
            maturity = twin_state.get("maturity_level", "newborn")
            emotions_toward_user = twin_state.get("emotions_toward_user", {})
        except Exception:
            bond_depth = 0.0
            mood = "calm"
            personality_dna = {}
            maturity = "newborn"
            emotions_toward_user = {}
        
        if bond_depth < 0.2:
            relationship_stage = "stranger"
        elif bond_depth < 0.4:
            relationship_stage = "acquaintance"
        elif bond_depth < 0.6:
            relationship_stage = "friend"
        elif bond_depth < 0.8:
            relationship_stage = "close_friend"
        else:
            relationship_stage = "soul_twin"
        
        try:
            activity = UserActivity(user_activity)
        except ValueError:
            activity = UserActivity.ACTIVE
        
        try:
            from app.memory.unified_memory import unified_memory_engine
            patterns = await unified_memory_engine.get_patterns(user_id, days=14)
            dominant_emotion_pattern = patterns.get("dominant_emotion", "neutral")
            emotion_distribution = patterns.get("distribution", {})
        except Exception:
            dominant_emotion_pattern = "neutral"
            emotion_distribution = {}
        
        return {
            "current_emotion": current_emotion,
            "dominant_emotion": current_emotion or dominant_emotion_pattern,
            "emotion_distribution_14d": emotion_distribution,
            "activity": activity.value,
            "relationship_stage": relationship_stage,
            "bond_depth": round(bond_depth, 3),
            "maturity": maturity,
            "twin_mood": mood,
            "personality_dna": personality_dna,
            "emotions_toward_user": emotions_toward_user,
        }
    
    async def _build_session_context(self, user_id: str, now: datetime) -> Dict[str, Any]:
        """بناء سياق الجلسة الحالية."""
        try:
            from app.infrastructure.database.supabase_client import get_db
            db = get_db()
            result = db.table("profiles").select("last_active").eq("id", user_id).single().execute()
            last_active_str = result.data.get("last_active") if result.data else None
        except Exception:
            last_active_str = None
        
        session_type = SessionType.RETURNING.value
        hours_since_last = None
        days_since_last = None
        
        if last_active_str:
            try:
                last_active = datetime.fromisoformat(last_active_str)
                delta = now - last_active
                hours_since_last = delta.total_seconds() / 3600
                days_since_last = delta.days
                
                if days_since_last > 30:
                    session_type = SessionType.VERY_LONG_ABSENCE.value
                elif days_since_last > 7:
                    session_type = SessionType.LONG_ABSENCE.value
                elif hours_since_last > 24:
                    session_type = SessionType.RETURNING.value
                else:
                    session_type = SessionType.RETURNING.value
            except Exception:
                pass
        else:
            session_type = SessionType.NEW.value
        
        try:
            from app.twin_state.working_memory import working_memory
            recent = await working_memory.get_recent_context(user_id, limit=3)
            has_pending_task = len(recent) > 0 and any(
                "مهمة" in r.get("message", "") or "task" in r.get("message", "").lower()
                for r in recent
            )
        except Exception:
            has_pending_task = False
        
        if has_pending_task and session_type == SessionType.RETURNING.value:
            session_type = SessionType.RESUME_MID_TASK.value
        
        return {
            "session_type": session_type,
            "hours_since_last_interaction": round(hours_since_last, 1) if hours_since_last else None,
            "days_since_last_interaction": days_since_last,
            "is_new_user": session_type == SessionType.NEW.value,
            "is_returning_after_absence": session_type in [
                SessionType.LONG_ABSENCE.value,
                SessionType.VERY_LONG_ABSENCE.value,
            ],
            "has_pending_task": has_pending_task,
        }
    
    def _build_environment_context(
        self, device_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """بناء سياق البيئة والجهاز."""
        if not device_info:
            device_info = {}
        
        battery_level = device_info.get("battery_level", 100)
        is_charging = device_info.get("is_charging", False)
        is_low_power = device_info.get("is_low_power_mode", False) or battery_level < 20
        
        network_type = device_info.get("network_type", "wifi")
        is_offline = network_type == "none"
        
        env_state = EnvironmentalState.UNKNOWN.value
        if is_low_power:
            env_state = EnvironmentalState.LOW_BATTERY.value
        elif is_charging:
            env_state = EnvironmentalState.CHARGING.value
        
        return {
            "battery_level": battery_level,
            "is_charging": is_charging,
            "is_low_power": is_low_power,
            "network_type": network_type,
            "is_offline": is_offline,
            "environmental_state": env_state,
            "device_type": device_info.get("device_type", "unknown"),
            "os": device_info.get("os", "unknown"),
            "notifications_allowed": not is_low_power and not is_offline,
        }
    
    async def _build_cognitive_context(self, user_id: str) -> Dict[str, Any]:
        """بناء السياق المعرفي للكيان."""
        try:
            from app.twin_state.internal_state import twin_internal_state
            state = await twin_internal_state.get_state(user_id)
            energy = state.get("energy_level", 0.7)
            curiosity = state.get("curiosity", 0.7)
            pending_questions = len(state.get("pending_questions", []))
        except Exception:
            energy = 0.7
            curiosity = 0.7
            pending_questions = 0
        
        base_load = 0.3
        pending_factor = min(pending_questions / 10, 1.0) * 0.3
        energy_factor = (1.0 - energy) * 0.4
        cognitive_load = min(base_load + pending_factor + energy_factor, 1.0)
        
        if cognitive_load < 0.3:
            focus_level = "high"
        elif cognitive_load < 0.6:
            focus_level = "moderate"
        else:
            focus_level = "low"
        
        return {
            "load_level": round(cognitive_load, 3),
            "focus_level": focus_level,
            "energy_level": round(energy, 3),
            "curiosity_level": round(curiosity, 3),
            "pending_questions": pending_questions,
            "is_overloaded": cognitive_load > 0.8,
            "needs_rest": energy < 0.2,
        }
    
    # ═══════════════════════════════════════════════════
    # التقييمات المركبة
    # ═══════════════════════════════════════════════════
    
    def _assess_urgency(
        self,
        time_context: Dict[str, Any],
        user_context: Dict[str, Any],
        session_context: Dict[str, Any],
    ) -> str:
        """تقييم مدى الإلحاح."""
        emotion = user_context.get("current_emotion", "neutral")
        if emotion in ["fear", "anger", "sadness"]:
            return "high"
        if session_context.get("has_pending_task"):
            return "moderate"
        if time_context.get("is_quiet_hours"):
            return "low"
        return "normal"
    
    def _assess_privacy(
        self,
        environment_context: Dict[str, Any],
        user_context: Dict[str, Any],
    ) -> str:
        """تقييم مستوى الخصوصية المطلوب."""
        if environment_context.get("environmental_state") == "outdoor":
            return "high"
        if user_context.get("current_emotion") in ["sadness", "fear", "shame"]:
            return "high"
        return "normal"
    
    def _assess_interaction_quality(
        self,
        session_context: Dict[str, Any],
        user_context: Dict[str, Any],
    ) -> str:
        """تقييم جودة التفاعل المتوقعة."""
        if session_context.get("is_new_user"):
            return "exploratory"
        if session_context.get("is_returning_after_absence"):
            return "reconnection"
        bond = user_context.get("bond_depth", 0)
        if bond > 0.7:
            return "deep"
        elif bond > 0.3:
            return "meaningful"
        else:
            return "casual"
    
    def _recommend_tone(
        self,
        time_context: Dict[str, Any],
        user_context: Dict[str, Any],
        cognitive_context: Dict[str, Any],
    ) -> str:
        """التوصية بالنبرة المناسبة."""
        emotion = user_context.get("current_emotion", "neutral")
        time_of_day = time_context.get("time_of_day", "morning")
        
        emotion_tones = {
            "joy": "warm_energetic",
            "sadness": "gentle_supportive",
            "fear": "calm_reassuring",
            "anger": "calm_listening",
            "love": "warm_affectionate",
            "neutral": "conversational",
        }
        base_tone = emotion_tones.get(emotion, "conversational")
        
        if time_of_day == "night" and "energetic" in base_tone:
            base_tone = "calm_warm"
        elif time_of_day == "morning" and emotion == "neutral":
            base_tone = "gentle_inviting"
        
        if cognitive_context.get("is_overloaded"):
            base_tone = "simple_calm"
        
        return base_tone
    
    def _should_be_proactive(
        self,
        time_context: Dict[str, Any],
        user_context: Dict[str, Any],
        session_context: Dict[str, Any],
    ) -> bool:
        """
        هل يجب أن يكون الكيان استباقياً الآن؟
        يطبق قواعد الدستور:
        - لا مبادرة أثناء الحزن/الغضب/الخوف
        - لا مبادرة في ساعات الهدوء
        - لا مبادرة للمستخدمين الجدد جداً
        """
        emotion = user_context.get("current_emotion", "neutral")
        if emotion in ["sadness", "anger", "fear"]:
            return False
        if time_context.get("is_quiet_hours"):
            return False
        if session_context.get("is_new_user"):
            return False
        bond = user_context.get("bond_depth", 0)
        if bond < 0.15:
            return False
        return True


# نسخة عالمية
context_awareness_engine = ContextAwarenessEngine()
logger.info("✅ Context Awareness Engine v1.0 initialized")
