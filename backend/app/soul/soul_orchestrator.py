"""
SoulOrchestrator v5.0 – منسق الروح الكامل مع Digital Fingerprint
"""
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("soul_orchestrator")

from app.soul.soul_core import SoulCore
from app.soul.soul_values import SoulValues
from app.soul.soul_resonance import SoulResonance
from app.soul.soul_signature import SoulSignature
from app.soul.soul_traits import SoulTraits
from app.soul.soul_timeline import SoulTimeline
from app.soul.soul_evolution import SoulEvolution
from app.soul.soul_bonds import SoulBonds


class SoulOrchestrator:
    """المنسق الرئيسي للروح الرقمية."""
    
    def __init__(self):
        self.soul_core = SoulCore()
        self.soul_values = SoulValues()
        self.soul_resonance = SoulResonance()
        self.soul_signature = SoulSignature()
        self.soul_traits = SoulTraits()
        self.soul_timeline = SoulTimeline()
        self.soul_evolution = SoulEvolution()
        self.soul_bonds = SoulBonds()

    async def get_soul_state(
        self,
        user_id: str,
        relationship_stage: str,
        bond_level: int,
        interaction_count: int,
        personality_dna: Dict[str, float],
        dominant_emotion: str,
        recent_emotions: list,
        memory_count: int,
        core_memory_count: int,
        memory_patterns: Dict[str, float],
        evolution_count: int,
        lang: str = "ar",
    ) -> Dict[str, Any]:
        role = await self.soul_core.get_role(relationship_stage)
        labels = self.soul_core.get_labels(role)
        phase = await self.soul_core.evolve_phase(role, bond_level, interaction_count)
        values = await self.soul_values.update_values(
            ["التعاطف", "الفضول", "الصدق"], recent_emotions, memory_patterns
        )
        traits = await self.soul_traits.derive(personality_dna, dominant_emotion)
        resonance = await self.soul_resonance.calculate(
            bond_level, memory_count, core_memory_count,
            dominant_emotion, personality_dna, interaction_count,
        )
        signature = await self.soul_signature.generate(
            user_id, values, traits, role, resonance["harmony"], evolution_count
        )
        timeline = await self.soul_timeline.get_life_story()

        # دمج P1
        context_state = curiosity_state = momentum_state = recent_experiences = None
        self_model = world_snapshot = fingerprint = None

        try:
            from app.twin_state.context_awareness_engine import context_awareness_engine
            context_state = await context_awareness_engine.get_current_context(user_id)
        except Exception:
            pass
        try:
            from app.twin_state.curiosity_dynamics import curiosity_dynamics_engine
            curiosity_state = await curiosity_dynamics_engine.get_curiosity_state(user_id)
        except Exception:
            pass
        try:
            from app.twin_state.emotional_momentum import emotional_momentum_engine
            momentum_state = await emotional_momentum_engine.get_momentum_state(user_id)
        except Exception:
            pass
        try:
            from app.twin_state.experience_engine import experience_engine
            recent_experiences = await experience_engine.get_recent_experiences(user_id, limit=5)
        except Exception:
            pass
        try:
            from app.twin_state.self_model import self_model_engine
            self_model = await self_model_engine.get_current_self(user_id)
        except Exception:
            pass
        try:
            from app.twin_state.world_model import world_model_engine
            world_snapshot = await world_model_engine.get_world_snapshot(user_id)
        except Exception:
            pass
        try:
            from app.features.digital_fingerprint import fingerprint_engine
            fingerprint = await fingerprint_engine.get_fingerprint(user_id)
        except Exception:
            pass

        result: Dict[str, Any] = {
            "core": {"role": role, "phase": phase, "labels": labels},
            "values": {"values": values, "conflicts": await self.soul_values.get_value_conflicts(values)},
            "traits": {"traits": traits},
            "resonance": resonance,
            "signature": {
                "fingerprint": signature,
                "uniqueness": await self.soul_signature.get_uniqueness_score(signature),
            },
            "timeline": timeline,
        }
        if context_state:
            result["context"] = {"time_of_day": context_state.get("time", {}).get("time_of_day")}
        if curiosity_state:
            result["curiosity"] = curiosity_state
        if momentum_state:
            result["emotional_momentum"] = {"current_emotion": momentum_state.get("current_emotion")}
        if recent_experiences:
            result["recent_experiences"] = [{"type": e["type"]} for e in recent_experiences[:3]]
        if self_model:
            result["self_model"] = {"role": self_model["identity"]["role"]}
        if world_snapshot:
            result["world_model"] = {"entities": world_snapshot["entities"]}
        if fingerprint:
            result["fingerprint"] = {"hash": fingerprint.get("fingerprint_hash", "")}

        return result

    async def evolve_soul(
        self,
        user_id: str,
        interaction_quality: str,
        new_emotion: str,
        new_dna: Dict[str, float],
        evolution_count: int,
    ) -> Dict[str, Any]:
        new_milestones = await self.soul_timeline.record_evolution(evolution_count + 1)
        return {"evolution_count": evolution_count + 1, "new_milestones": new_milestones}


# نسخة عالمية للاستخدام المباشر (للتوافق مع الملفات التي تستخدم الدوال مباشرة)
_orchestrator = SoulOrchestrator()

async def get_soul_state(*args, **kwargs):
    return await _orchestrator.get_soul_state(*args, **kwargs)

async def evolve_soul(*args, **kwargs):
    return await _orchestrator.evolve_soul(*args, **kwargs)

logger.info("✅ Soul Orchestrator v5.0 ready")
