"""
ENVIRONMENT MEMORY v1.0 – ذاكرة البيئة (TCMA)
================================================
يخزن تاريخ البيئة: الطقس، الإضاءة، العاطفة، الموسيقى، الموقع.
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger("environment_memory")

class EnvironmentMemory:
    def __init__(self):
        self.memory_client = None

    async def save_state(self, user_id: str, state: Dict):
        """حفظ حالة البيئة في TCMA"""
        if self.memory_client:
            try:
                await self.memory_client.store_entity("environment_state", user_id, {
                    "state": state,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "user_id": user_id,
                })
            except Exception as e:
                logger.warning(f"Environment memory save failed: {e}")

    async def get_recent_states(self, user_id: str, limit: int = 10) -> List[Dict]:
        """استرجاع آخر حالات البيئة"""
        if self.memory_client:
            try:
                states = await self.memory_client.get_entity_list("environment_state", user_id) or []
                return sorted(states, key=lambda x: x.get("timestamp", ""), reverse=True)[:limit]
            except: pass
        return []

    async def find_similar_context(self, user_id: str, current: Dict) -> Optional[Dict]:
        """البحث عن سياق مشابه في الماضي"""
        recent = await self.get_recent_states(user_id, 50)
        current_hour = current.get("outdoor", {}).get("hour", 0)
        
        for state in recent:
            s = state.get("state", {})
            past_hour = s.get("outdoor", {}).get("hour", -1)
            if abs(past_hour - current_hour) <= 1:
                return s
        return None


environment_memory = EnvironmentMemory()
