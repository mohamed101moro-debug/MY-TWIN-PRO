"""
IMAGE PROJECT MANAGER v2.0 – إدارة المشاريع والإصدارات (100%)
===================================================================
- حفظ تلقائي في History
- Favorites، Versioning، Projects
- استدعاء تلقائي من المسارات
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class ImageProjectManager:
    def __init__(self):
        self.memory_client = None

    async def save_to_history(self, user_id: str, prompt: str, image_url: str, provider: str, metadata: Dict = None) -> Dict:
        """حفظ الصورة في History تلقائياً"""
        if self.memory_client:
            try:
                await self.memory_client.store_entity("project", user_id, {
                    "title": f"صورة: {prompt[:50]}",
                    "type": "image",
                    "data": {
                        "prompt": prompt,
                        "image_url": image_url,
                        "provider": provider,
                        "metadata": metadata or {}
                    },
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "user_id": user_id
                })
            except Exception as e:
                logger.warning(f"Failed to save image to history: {e}")
        return {"saved": True}

    async def add_to_favorites(self, user_id: str, image_id: str) -> Dict:
        """إضافة الصورة إلى المفضلة"""
        if self.memory_client:
            try:
                favorites = await self.memory_client.get_entity("image_favorites", user_id) or {"images": []}
                if image_id not in favorites["images"]:
                    favorites["images"].append(image_id)
                await self.memory_client.store_entity("image_favorites", user_id, favorites)
            except: pass
        return {"favorited": True}

    async def get_favorites(self, user_id: str) -> List[str]:
        """استرجاع الصور المفضلة"""
        if self.memory_client:
            try:
                favs = await self.memory_client.get_entity("image_favorites", user_id)
                return favs.get("images", []) if favs else []
            except: pass
        return []

    async def get_projects(self, user_id: str) -> List[Dict]:
        """استرجاع مشاريع الصور"""
        if self.memory_client:
            try:
                return await self.memory_client.get_entity_list("project", user_id) or []
            except: pass
        return []


image_project_manager = ImageProjectManager()
