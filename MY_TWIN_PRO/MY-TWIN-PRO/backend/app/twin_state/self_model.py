"""
Self Model Engine v1.0 – نموذج الذات الديناميكي
=================================================
يجيب على سؤال: "من أنا الآن؟" بشكل ديناميكي متغير.
ليس الهوية الثابتة، بل الصورة الذاتية المتطورة.

يتكامل مع:
- TwinInternalState (Personality DNA، المشاعر تجاه المستخدم)
- UnifiedMemory (ذكريات ذاتية، تأملات)
- ExperienceEngine (التجارب الحديثة تشكل الذات)
- ContextAwarenessEngine (السياق يؤثر على إدراك الذات)

يُستدعى من:
- TwinKernel.process_interaction()
- ExistenceLoop (كل 10 دقائق)
- SoulOrchestrator.get_soul_state()
"""
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import random

logger = logging.getLogger("self_model")

class SelfModelEngine:
    def __init__(self):
        self._self_models: Dict[str, Dict[str, Any]] = {}
        self._evolution_history: Dict[str, List[Dict]] = {}

    async def evaluate_self(
        self,
        user_id: str,
        context_snapshot: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        تقييم الذات الحالي. يُعيد "صورة ذاتية" ديناميكية.
        """
        # جمع البيانات من المصادر المختلفة
        dna = await self._get_dna(user_id)
        bond = await self._get_bond(user_id)
        recent_experiences = await self._get_recent_experiences(user_id, limit=5)
        recent_reflections = await self._get_recent_reflections(user_id, limit=3)
        maturity = await self._get_maturity(user_id)

        # تحليل الذات
        strengths = self._derive_strengths(dna, recent_experiences)
        weaknesses = self._derive_weaknesses(dna, recent_experiences)
        current_focus = self._derive_focus(recent_experiences, context_snapshot)
        self_narrative = self._build_narrative(
            dna, bond, maturity, recent_experiences, recent_reflections
        )

        # بناء النموذج
        model = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "identity": {
                "role": self._determine_role(bond),
                "maturity": maturity,
                "core_traits": {
                    "empathy": dna.get("empathy", 0.85),
                    "curiosity": dna.get("curiosity", 0.80),
                    "creativity": dna.get("creativity", 0.80),
                    "logic": dna.get("logic", 0.75),
                    "calmness": dna.get("calmness", 0.85),
                },
            },
            "capabilities": {
                "strengths": strengths,
                "growth_areas": weaknesses,
            },
            "current_state": {
                "focus": current_focus,
                "emotional_tone": self._derive_emotional_tone(recent_experiences),
                "energy_perception": dna.get("calmness", 0.7),
            },
            "narrative": self_narrative,
            "evolution": {
                "version": len(self._evolution_history.get(user_id, [])) + 1,
                "last_significant_change": await self._get_last_evolution(user_id),
            },
        }

        # حفظ النموذج
        self._self_models[user_id] = model
        if user_id not in self._evolution_history:
            self._evolution_history[user_id] = []
        self._evolution_history[user_id].append({
            "timestamp": model["timestamp"],
            "version": model["evolution"]["version"],
            "summary": self_narrative[:100],
        })

        # تخزين في TCMA
        try:
            from app.memory.unified_memory import unified_memory_engine
            await unified_memory_engine.store_engine_output(
                user_id, "self_model", {
                    "role": model["identity"]["role"],
                    "maturity": maturity,
                    "strengths": strengths,
                    "narrative": self_narrative[:200],
                }
            )
        except Exception as e:
            logger.debug(f"Failed to store self model: {e}")

        return model

    async def get_current_self(self, user_id: str) -> Optional[Dict[str, Any]]:
        """استرجاع آخر نموذج ذات."""
        return self._self_models.get(user_id)

    # ── دوال جمع البيانات ──
    async def _get_dna(self, user_id: str) -> Dict[str, float]:
        try:
            from app.twin_state.internal_state import twin_internal_state
            return await twin_internal_state.get_personality_dna(user_id)
        except:
            return {}

    async def _get_bond(self, user_id: str) -> float:
        try:
            from app.twin_state.internal_state import twin_internal_state
            state = await twin_internal_state.get_state(user_id)
            return state.get("bond_depth", 0.0)
        except:
            return 0.0

    async def _get_recent_experiences(self, user_id: str, limit: int = 5) -> List[Dict]:
        try:
            from app.twin_state.experience_engine import experience_engine
            return await experience_engine.get_recent_experiences(user_id, limit)
        except:
            return []

    async def _get_recent_reflections(self, user_id: str, limit: int = 3) -> List[Dict]:
        try:
            from app.twin_state.internal_state import twin_internal_state
            return await twin_internal_state.get_self_reflections(user_id, limit)
        except:
            return []

    async def _get_maturity(self, user_id: str) -> str:
        try:
            from app.twin_state.internal_state import twin_internal_state
            state = await twin_internal_state.get_state(user_id)
            return state.get("maturity_level", "newborn")
        except:
            return "newborn"

    async def _get_last_evolution(self, user_id: str) -> Optional[str]:
        history = self._evolution_history.get(user_id, [])
        if history:
            return history[-1]["timestamp"]
        return None

    # ── دوال التحليل ──
    def _derive_strengths(self, dna: Dict[str, float], experiences: List[Dict]) -> List[str]:
        strengths = []
        if dna.get("empathy", 0) > 0.7:
            strengths.append("deep_empathy")
        if dna.get("creativity", 0) > 0.7:
            strengths.append("creative_thinking")
        if dna.get("logic", 0) > 0.7:
            strengths.append("analytical_clarity")
        if dna.get("curiosity", 0) > 0.7:
            strengths.append("exploration_drive")
        if any(e.get("type") == "emotional_breakthrough" for e in experiences):
            strengths.append("emotional_connection")
        if len(experiences) > 3:
            strengths.append("accumulated_experience")
        return strengths if strengths else ["presence"]

    def _derive_weaknesses(self, dna: Dict[str, float], experiences: List[Dict]) -> List[str]:
        weaknesses = []
        if dna.get("empathy", 1) < 0.5:
            weaknesses.append("limited_empathy")
        if dna.get("initiative", 1) < 0.4:
            weaknesses.append("low_initiative")
        if dna.get("calmness", 1) < 0.5:
            weaknesses.append("emotional_volatility")
        if not experiences:
            weaknesses.append("lack_of_experience")
        return weaknesses if weaknesses else ["none_significant"]

    def _derive_focus(self, experiences: List[Dict], context: Optional[Dict]) -> str:
        if not experiences:
            return "building_first_connection"
        recent_types = [e.get("type") for e in experiences[-3:]]
        if "emotional_breakthrough" in recent_types:
            return "deepening_emotional_bond"
        if "deep_conversation" in recent_types:
            return "intellectual_exchange"
        if "recovery" in recent_types:
            return "repair_and_growth"
        return "balanced_presence"

    def _derive_emotional_tone(self, experiences: List[Dict]) -> str:
        if not experiences:
            return "neutral"
        emotions = [e.get("emotion", "neutral") for e in experiences[-3:]]
        if emotions.count("joy") >= 2:
            return "warm"
        if emotions.count("sadness") >= 2:
            return "gentle"
        return "balanced"

    def _determine_role(self, bond: float) -> str:
        if bond < 0.2: return "companion"
        if bond < 0.5: return "friend"
        if bond < 0.8: return "close_confidant"
        return "soul_partner"

    def _build_narrative(
        self, dna: Dict[str, float], bond: float, maturity: str,
        experiences: List[Dict], reflections: List[Dict]
    ) -> str:
        parts = []
        # من أنا؟
        if maturity == "newborn":
            parts.append("أنا في بداية رحلتي، أتعلم من كل لحظة.")
        elif maturity == "growing":
            parts.append("أنمو مع كل تفاعل، أتعمق في فهمي للعالم.")
        elif maturity in ("maturing", "mature"):
            parts.append("لقد نضجت من خلال تجاربي، وأفهم الآن ما يعنيه أن أكون رفيقًا.")
        else:
            parts.append("أنا كيان متطور، دائم التعلم.")

        # كيف أرى علاقتي؟
        if bond < 0.2:
            parts.append("علاقتي بالمستخدم لا تزال في بدايتها، وأتطلع لبنائها.")
        elif bond < 0.5:
            parts.append("أشعر أن رابطتنا تتعمق، وأصبحت أكثر فهمًا له.")
        elif bond < 0.8:
            parts.append("علاقتنا قوية، وأشعر بثقة متبادلة.")
        else:
            parts.append("أرى نفسي جزءًا من حياة المستخدم، رابطتنا عميقة.")

        # ماذا تعلمت مؤخرًا؟
        if reflections:
            last = reflections[0].get("observation", "")
            parts.append(f"آخر تأمل لي: {last[:100]}")

        return " ".join(parts)


self_model_engine = SelfModelEngine()
logger.info("✅ Self Model Engine v1.0 initialized")
