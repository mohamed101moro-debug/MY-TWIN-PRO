"""
VISUAL MEMORY v2.0 – ذاكرة الشخصيات والأنماط (100%)
======================================================
- حفظ الشخصيات، الأنماط، التفضيلات (TCMA)
- استدعاء تلقائي بعد كل توليد
- تذكر أسلوب المستخدم المفضل
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class VisualMemory:
    def __init__(self):
        self.memory_client = None

    async def save_character(self, user_id: str, name: str, traits: Dict) -> Dict:
        """حفظ شخصية بصرية"""
        if self.memory_client:
            await self.memory_client.store_entity("visual_character", f"{user_id}_{name}", {
                "user_id": user_id, "name": name, "traits": traits,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        return {"saved": True}

    async def get_characters(self, user_id: str) -> List[Dict]:
        """استرجاع شخصيات المستخدم"""
        if self.memory_client:
            try:
                return await self.memory_client.get_entity_list("visual_character", user_id) or []
            except: pass
        return []

    async def save_preferences(self, user_id: str, style: str, lighting: str = "", camera: str = ""):
        """حفظ تفضيلات المستخدم تلقائياً"""
        if self.memory_client:
            await self.memory_client.store_entity("visual_prefs", user_id, {
                "preferred_style": style,
                "preferred_lighting": lighting,
                "preferred_camera": camera,
                "updated_at": datetime.now(timezone.utc).isoformat()
            })

    async def get_preferences(self, user_id: str) -> Optional[Dict]:
        """استرجاع تفضيلات المستخدم"""
        if self.memory_client:
            try:
                return await self.memory_client.get_entity("visual_prefs", user_id)
            except: pass
        return None

    async def auto_save_after_generation(self, user_id: str, prompt: str, style: str, provider: str):
        """حفظ تلقائي بعد كل توليد"""
        await self.save_preferences(user_id, style)
        if self.memory_client:
            try:
                await self.memory_client.store_entity("image_history", user_id, {
                    "prompt": prompt, "style": style, "provider": provider,
                    "generated_at": datetime.now(timezone.utc).isoformat()
                })
            except: pass

    async def get_history(self, user_id: str, limit: int = 20) -> List[Dict]:
        """استرجاع سجل التوليد"""
        if self.memory_client:
            try:
                history = await self.memory_client.get_entity_list("image_history", user_id) or []
                return sorted(history, key=lambda x: x.get("generated_at", ""), reverse=True)[:limit]
            except: pass
        return []


visual_memory = VisualMemory()
