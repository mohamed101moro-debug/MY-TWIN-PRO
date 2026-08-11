"""
CROSS FEATURE MEMORY v1.0 – التعلم المتبادل بين القدرات
===========================================================
يربط جميع القدرات ببعضها.
مثال: حالة Life Coach تؤثر على Smart Home.
"""
import logging
from typing import Dict, Any

logger = logging.getLogger("cross_feature")

class CrossFeatureMemory:
    def __init__(self):
        self.memory_client = None

    async def share_context(self, from_feature: str, user_id: str, context: Dict):
        """مشاركة سياق من قدرة إلى أخرى"""
        if self.memory_client:
            try:
                await self.memory_client.store_entity("cross_feature", f"{user_id}_{from_feature}", {
                    "feature": from_feature,
                    "context": context,
                    "user_id": user_id,
                })
            except: pass

    async def get_context(self, for_feature: str, user_id: str) -> Dict:
        """الحصول على سياق من قدرات أخرى"""
        if self.memory_client:
            try:
                all_contexts = await self.memory_client.get_entity_list("cross_feature", user_id) or []
                relevant = {}
                for ctx in all_contexts:
                    relevant[ctx.get("feature", "unknown")] = ctx.get("context", {})
                return relevant
            except: pass
        return {}


cross_feature_memory = CrossFeatureMemory()
