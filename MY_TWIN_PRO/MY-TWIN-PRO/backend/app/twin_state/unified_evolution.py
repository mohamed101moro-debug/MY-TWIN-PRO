"""
Unified Evolution Engine v2.0 — التطور طويل المدى
=====================================================
Weekly Snapshot → Monthly Evolution → Yearly Evolution.
Events: Bond ≥ 80, Memories ≥ 100, Phase Change.
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("unified_evolution")

try:
    from app.twin_state.personality_engine import get_personality_dna, save_personality_dna
    DNA_AVAILABLE = True
except ImportError:
    DNA_AVAILABLE = False

try:
    from app.memory.unified_memory import unified_memory_engine
    MEMORY_AVAILABLE = True
except ImportError:
    MEMORY_AVAILABLE = False

try:
    from app.twin_state.relationship_service import load as load_relationship
    RELATIONSHIP_AVAILABLE = True
except ImportError:
    RELATIONSHIP_AVAILABLE = False

try:
    from app.infrastructure.database.supabase_client import get_db
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False


class UnifiedEvolutionEngine:
    """محرك التطور طويل المدى."""
    
    async def record_interaction(self, user_id: str, emotion: str, dna: Dict[str, float]) -> Dict[str, Any]:
        """تسجيل تفاعل وتقييم التطور."""
        interaction_count = await self._get_interaction_count(user_id) + 1
        
        # Weekly Snapshot
        weekly_updates = {}
        if interaction_count % 100 == 0:  # تقريباً كل أسبوع (100 رسالة)
            weekly_updates = await self._weekly_snapshot(user_id, dna)
        
        # Monthly Evolution
        monthly_updates = {}
        if interaction_count % 400 == 0:  # تقريباً كل شهر
            monthly_updates = await self._monthly_evolution(user_id, dna)
        
        # Yearly Evolution
        yearly_updates = {}
        if interaction_count % 4800 == 0:  # تقريباً كل سنة
            yearly_updates = await self._yearly_evolution(user_id, dna)
        
        # Special Events
        events = await self._check_events(user_id)
        
        await self._increment_interaction_count(user_id)
        
        return {
            "interaction_count": interaction_count,
            "weekly_snapshot": weekly_updates,
            "monthly_evolution": monthly_updates,
            "yearly_evolution": yearly_updates,
            "events": events,
        }
    
    async def _weekly_snapshot(self, user_id: str, dna: Dict[str, float]) -> Dict[str, Any]:
        """لقطة أسبوعية."""
        snapshot = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "dna": dna,
            "week_number": await self._get_week_number(user_id),
        }
        logger.info(f"📸 Weekly snapshot for {user_id}")
        return snapshot
    
    async def _monthly_evolution(self, user_id: str, dna: Dict[str, float]) -> Dict[str, Any]:
        """تطور شهري."""
        if not MEMORY_AVAILABLE:
            return {}
        patterns = await unified_memory_engine.get_patterns(user_id, days=30)
        dominant = patterns.get("dominant_emotion", "neutral")
        
        evolved = self._evolve_dna_from_emotion(dna, dominant, multiplier=1)
        
        if DNA_AVAILABLE:
            await save_personality_dna(user_id, evolved)
        
        logger.info(f"📅 Monthly evolution: {dominant} → DNA updated")
        return {"evolved_dna": evolved, "trigger": f"monthly_{dominant}"}
    
    async def _yearly_evolution(self, user_id: str, dna: Dict[str, float]) -> Dict[str, Any]:
        """تطور سنوي."""
        evolved = self._evolve_dna_from_emotion(dna, "joy", multiplier=3)
        evolved["curiosity"] = min(1.0, evolved.get("curiosity", 0.8) + 0.05)
        evolved["humor"] = min(1.0, evolved.get("humor", 0.5) + 0.03)
        
        if DNA_AVAILABLE:
            await save_personality_dna(user_id, evolved)
        
        logger.info(f"🎉 Yearly evolution for {user_id}")
        return {"evolved_dna": evolved, "trigger": "yearly"}
    
    async def _check_events(self, user_id: str) -> List[Dict]:
        """التحقق من الأحداث الخاصة."""
        events = []
        
        if MEMORY_AVAILABLE:
            patterns = await unified_memory_engine.get_patterns(user_id, days=9999)
            total_memories = patterns.get("total", 0)
            if total_memories >= 100:
                events.append({"type": "memory_milestone", "count": total_memories})
        
        if RELATIONSHIP_AVAILABLE:
            rel = await load_relationship(user_id)
            bond = rel.get("bond_level", 0)
            if bond >= 80:
                events.append({"type": "bond_milestone", "bond": bond})
            stage = rel.get("stage", "stranger")
            events.append({"type": "phase", "stage": stage})
        
        return events
    
    def _evolve_dna_from_emotion(self, dna: Dict[str, float], emotion: str, multiplier: int = 1) -> Dict[str, float]:
        """تطوير DNA بناءً على العاطفة السائدة."""
        delta = 0.02 * multiplier
        evolution_map = {
            "joy": {"empathy": delta, "creativity": delta * 0.5},
            "sadness": {"empathy": delta * 1.5, "reflection": delta},
            "fear": {"calmness": delta, "reflection": delta * 0.5},
            "anger": {"calmness": delta * 1.5, "logic": delta},
            "curious": {"curiosity": delta * 1.5, "creativity": delta},
        }
        updates = evolution_map.get(emotion, {"empathy": delta * 0.5})
        
        evolved = {**dna}
        for trait, value in updates.items():
            evolved[trait] = min(1.0, evolved.get(trait, 0.5) + value)
        
        return evolved
    
    async def _get_interaction_count(self, user_id: str) -> int:
        if DB_AVAILABLE:
            try:
                db = get_db()
                result = db.table("profiles").select("interaction_count").eq("id", user_id).single().execute()
                return result.data.get("interaction_count", 0) if result.data else 0
            except:
                pass
        return 0
    
    async def _increment_interaction_count(self, user_id: str) -> None:
        if DB_AVAILABLE:
            try:
                db = get_db()
                db.table("profiles").update({"interaction_count": await self._get_interaction_count(user_id) + 1, "last_active": datetime.now(timezone.utc).isoformat()}).eq("id", user_id).execute()
            except:
                pass
    
    async def _get_week_number(self, user_id: str) -> int:
        count = await self._get_interaction_count(user_id)
        return (count // 100) + 1


unified_evolution_engine = UnifiedEvolutionEngine()
logger.info("✅ Unified Evolution Engine v2.0 ready")
