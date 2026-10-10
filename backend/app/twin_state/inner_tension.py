"""
Inner Tension v1.0 - حمل التناقض دون حل قسري
يسجل توترات داخلية ويعكسها بصدق في صوت التوأم.
"""
import logging
from datetime import datetime, timezone
logger = logging.getLogger("inner_tension")
class InnerTension:
    async def hold(self, user_id: str, pole_a: str, pole_b: str, intensity: float = 0.6):
        try:
            from app.twin_state.internal_state import twin_internal_state
            state = await twin_internal_state.get_state(user_id)
            t = state.get("tensions", [])
            t.append({"a": pole_a, "b": pole_b, "intensity": intensity, "ts": datetime.now(timezone.utc).isoformat()})
            state["tensions"] = t[-5:]
            await twin_internal_state._save_state(user_id, state)
        except Exception as e:
            logger.debug(f"tension hold: {e}")
    async def surface(self, user_id: str):
        try:
            from app.twin_state.internal_state import twin_internal_state
            state = await twin_internal_state.get_state(user_id)
            t = state.get("tensions", [])
            if t:
                last = t[-1]
                return f"تناقض أحمله بوعي: {last.get('a','')} … وفي الوقت نفسه {last.get('b','')}. لا أستعجل حله."
        except Exception: pass
        return None
inner_tension = InnerTension()
logger.info("✅ Inner Tension v1.0 ready")
