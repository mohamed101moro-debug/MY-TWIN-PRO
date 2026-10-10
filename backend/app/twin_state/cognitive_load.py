"""
Cognitive Load Engine v1.2 – محرك العبء المعرفي مع tier ديناميكي
==================================================================
يراقب العبء المعرفي للكيان ويستخدم tier الحقيقي لحساب التراكم اليومي.
"""
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from enum import Enum

logger = logging.getLogger("cognitive_load")

class LoadLevel(Enum):
    OPTIMAL = "optimal"
    NORMAL = "normal"
    ELEVATED = "elevated"
    HIGH = "high"
    OVERLOADED = "overloaded"
    CRITICAL = "critical"

class CognitiveLoadEngine:
    def __init__(self):
        self._load_states: Dict[str, Dict[str, Any]] = {}
        self._rest_periods: Dict[str, List[Dict]] = {}
        self._interaction_complexity: Dict[str, List[float]] = {}

    async def evaluate_load(
        self,
        user_id: str,
        current_task: str = "conversation",
        task_complexity: float = 0.5,
        context_snapshot: Optional[Dict[str, Any]] = None,
        tier: str = "free",
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        base_load = task_complexity * 0.4
        emotional_factor = await self._get_emotional_factor(user_id, context_snapshot)
        time_factor = await self._get_time_factor(user_id, now)
        accumulation_factor = await self._get_accumulation_factor(user_id, task_complexity, tier)
        energy_factor = await self._get_energy_factor(user_id)
        context_factor = self._get_context_factor(context_snapshot)

        weights = {"base": 0.30, "emotional": 0.20, "time": 0.15, "accumulation": 0.15, "energy": 0.10, "context": 0.10}
        load_value = (
            base_load * weights["base"] +
            emotional_factor * weights["emotional"] +
            time_factor * weights["time"] +
            accumulation_factor * weights["accumulation"] +
            energy_factor * weights["energy"] +
            context_factor * weights["context"]
        )
        load_value = min(1.0, max(0.0, load_value))
        level = self._determine_level(load_value)
        needs_rest = load_value > 0.75
        recommendation = self._generate_recommendation(level, load_value)

        result = {
            "load_value": round(load_value, 3),
            "level": level,
            "needs_rest": needs_rest,
            "factors": {
                "base_load": round(base_load, 3),
                "emotional": round(emotional_factor, 3),
                "time_since_rest": round(time_factor, 3),
                "accumulation": round(accumulation_factor, 3),
                "energy": round(energy_factor, 3),
                "context": round(context_factor, 3),
            },
            "recommendation": recommendation,
            "performance_impact": self._estimate_performance_impact(load_value),
            "timestamp": now.isoformat(),
        }

        try:
            from app.twin_state.internal_state import twin_internal_state
            state = await twin_internal_state.get_state(user_id)
            state["cognitive_load"] = load_value
            await twin_internal_state._save_state(user_id, state)
        except: pass

        self._load_states[user_id] = result
        if user_id not in self._interaction_complexity:
            self._interaction_complexity[user_id] = []
        self._interaction_complexity[user_id].append(task_complexity)
        if len(self._interaction_complexity[user_id]) > 50:
            self._interaction_complexity[user_id] = self._interaction_complexity[user_id][-50:]

        if load_value > 0.6:
            try:
                from app.memory.unified_memory import unified_memory_engine
                await unified_memory_engine.store_engine_output(user_id, "cognitive_load", {"load": load_value, "level": level, "needs_rest": needs_rest})
            except: pass

        if needs_rest:
            logger.info(f"🧠 عبء معرفي مرتفع: {load_value:.2f} | {recommendation}")
        return result

    async def get_current_load(self, user_id: str) -> Optional[Dict[str, Any]]:
        return self._load_states.get(user_id)

    async def rest(self, user_id: str, duration_minutes: float = 5.0):
        now = datetime.now(timezone.utc)
        if user_id not in self._rest_periods:
            self._rest_periods[user_id] = []
        self._rest_periods[user_id].append({"start": now.isoformat(), "duration_minutes": duration_minutes, "load_before_rest": self._load_states.get(user_id, {}).get("load_value", 0.0)})
        if user_id in self._load_states:
            reduction = min(0.4, duration_minutes * 0.05)
            new_load = max(0.05, self._load_states[user_id]["load_value"] - reduction)
            self._load_states[user_id]["load_value"] = round(new_load, 3)
            self._load_states[user_id]["level"] = self._determine_level(new_load)
            self._load_states[user_id]["needs_rest"] = new_load > 0.75
        try:
            from app.twin_state.internal_state import twin_internal_state
            state = await twin_internal_state.get_state(user_id)
            state["energy_level"] = min(1.0, state.get("energy_level", 0.7) + duration_minutes * 0.02)
            state["cognitive_load"] = self._load_states.get(user_id, {}).get("load_value", 0.0)
            await twin_internal_state._save_state(user_id, state)
        except: pass
        logger.info(f"😴 استراحة: {duration_minutes}min | عبء جديد: {self._load_states.get(user_id, {}).get('load_value', 0.0):.2f}")

    async def should_simplify_response(self, user_id: str) -> bool:
        load = self._load_states.get(user_id, {}).get("load_value", 0.3)
        return load > 0.7

    async def get_recommended_response_depth(self, user_id: str) -> str:
        load = self._load_states.get(user_id, {}).get("load_value", 0.3)
        if load < 0.3: return "deep"
        elif load < 0.6: return "normal"
        elif load < 0.8: return "simple"
        else: return "minimal"

    async def _get_emotional_factor(self, user_id: str, context: Optional[Dict]) -> float:
        try:
            from app.twin_state.emotional_momentum import emotional_momentum_engine
            state = await emotional_momentum_engine.get_momentum_state(user_id)
            momentum = state.get("momentum_value", 0.0)
            phase = state.get("phase", "stable")
            if phase == "transitioning": return 0.8
            elif momentum > 0.5: return 0.6
            elif momentum > 0.2: return 0.4
            else: return 0.2
        except: pass
        if context:
            emotion = context.get("user", {}).get("current_emotion", "neutral")
            if emotion in ["grief", "fear", "anger", "sadness"]: return 0.7
            elif emotion in ["joy", "love"]: return 0.4
        return 0.3

    async def _get_time_factor(self, user_id: str, now: datetime) -> float:
        rests = self._rest_periods.get(user_id, [])
        if not rests: return 0.6
        try:
            last_rest = datetime.fromisoformat(rests[-1].get("start", ""))
            hours_since = (now - last_rest).total_seconds() / 3600
            if hours_since < 0.5: return 0.1
            elif hours_since < 2: return 0.3
            elif hours_since < 6: return 0.5
            else: return 0.8
        except: return 0.5

    async def _get_accumulation_factor(self, user_id: str, current_complexity: float, tier: str = "free") -> float:
        complexities = self._interaction_complexity.get(user_id, [])
        avg_recent = sum(complexities[-5:]) / len(complexities[-5:]) if complexities else 0.1
        daily_count = await self._get_daily_interaction_count(user_id, tier)
        try:
            from app.domain.services.tier_service import get_daily_messages
            daily_limit = get_daily_messages(tier)
        except:
            daily_limit = 15
        daily_factor = min(1.0, daily_count / max(daily_limit, 1))
        trend_factor = 0.0
        if len(complexities) >= 3 and complexities[-1] > complexities[-2] > complexities[-3]:
            trend_factor = 0.3
        return min(1.0, (avg_recent * 0.4) + (daily_factor * 0.4) + (trend_factor * 0.2))

    async def _get_daily_interaction_count(self, user_id: str, tier: str = "free") -> int:
        try:
            from app.domain.services.limits_service import get_usage_summary
            summary = get_usage_summary(user_id, tier)
            return summary.get("messages", {}).get("used", 0)
        except: return 0

    async def _get_energy_factor(self, user_id: str) -> float:
        try:
            from app.twin_state.internal_state import twin_internal_state
            state = await twin_internal_state.get_state(user_id)
            return 1.0 - state.get("energy_level", 0.7)
        except: return 0.3

    def _get_context_factor(self, context: Optional[Dict]) -> float:
        if not context: return 0.3
        session_type = context.get("session", {}).get("session_type", "returning")
        time_of_day = context.get("time", {}).get("time_of_day", "morning")
        factor = 0.3
        if session_type in ["long_absence", "very_long_absence"]: factor += 0.3
        elif session_type == "new": factor += 0.2
        if time_of_day == "night": factor += 0.1
        return min(1.0, factor)

    def _determine_level(self, load: float) -> str:
        if load < 0.25: return LoadLevel.OPTIMAL.value
        elif load < 0.45: return LoadLevel.NORMAL.value
        elif load < 0.65: return LoadLevel.ELEVATED.value
        elif load < 0.80: return LoadLevel.HIGH.value
        elif load < 0.95: return LoadLevel.OVERLOADED.value
        else: return LoadLevel.CRITICAL.value

    def _generate_recommendation(self, level: str, load: float) -> str:
        recs = {
            "optimal": "الأداء مثالي. يمكن تقديم ردود عميقة ومعقدة.",
            "normal": "العبء طبيعي. الردود متوازنة.",
            "elevated": "العبء مرتفع قليلاً. يُفضل تبسيط الردود قليلاً.",
            "high": "العبء مرتفع. يُنصح بتبسيط الردود وتجنب التحليلات العميقة.",
            "overloaded": "العبء زائد. يُنصح بردود مختصرة جداً وطلب استراحة قريبة.",
            "critical": "عبء حرج. يجب أخذ استراحة فورية. الردود: كلمات قليلة فقط.",
        }
        return recs.get(level, "حالة غير معروفة.")

    def _estimate_performance_impact(self, load: float) -> Dict[str, Any]:
        if load < 0.3: return {"response_quality": "excellent", "reasoning_depth": "deep", "empathy_level": "high", "suggested_max_response_length": 500}
        elif load < 0.6: return {"response_quality": "good", "reasoning_depth": "normal", "empathy_level": "moderate", "suggested_max_response_length": 300}
        elif load < 0.8: return {"response_quality": "adequate", "reasoning_depth": "shallow", "empathy_level": "basic", "suggested_max_response_length": 150}
        else: return {"response_quality": "limited", "reasoning_depth": "minimal", "empathy_level": "minimal", "suggested_max_response_length": 80}

cognitive_load_engine = CognitiveLoadEngine()
logger.info("✅ Cognitive Load Engine v1.2 initialized with dynamic tier support")
