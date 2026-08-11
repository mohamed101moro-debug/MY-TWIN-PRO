"""
PROVIDER ROUTER v2.0 – توجيه ذكي للمزودين (100%)
====================================================
- يحلل الأداء السابق لكل مزود من TCMA
- يختار أفضل مزود حسب نوع الصورة
- يدعم Auto Retry Intelligence
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

PROVIDER_MAP = {
    "portrait": ["flux", "gemini", "pollinations"],
    "logo": ["ideogram", "flux", "pollinations"],
    "anime": ["sdxl_anime", "flux", "pollinations"],
    "realistic": ["gemini", "flux", "pollinations"],
    "product": ["flux", "gemini", "pollinations"],
    "cinematic": ["gemini", "flux", "pollinations"],
    "digital_art": ["flux", "gemini", "pollinations"],
    "default": ["gemini", "flux", "pollinations"],
}

class ProviderRouter:
    def __init__(self):
        self.memory_client = None

    async def route(self, user_id: str, style: str, intent: str) -> List[str]:
        """اختيار أفضل مزود بناءً على الأداء السابق"""
        providers = PROVIDER_MAP.get(style, PROVIDER_MAP.get(intent, PROVIDER_MAP["default"]))
        
        # تحليل الأداء السابق من TCMA
        if self.memory_client:
            try:
                stats = await self.memory_client.get_entity("provider_stats", user_id)
                if stats:
                    # إعادة ترتيب المزودين حسب نسبة النجاح
                    sorted_providers = sorted(providers, key=lambda p: stats.get(p, {}).get("success_rate", 0), reverse=True)
                    return sorted_providers if sorted_providers else providers
            except: pass
        
        return providers

    async def record_result(self, user_id: str, provider: str, success: bool):
        """تسجيل نتيجة المزود في TCMA للتحسين المستقبلي"""
        if self.memory_client:
            try:
                stats = await self.memory_client.get_entity("provider_stats", user_id) or {}
                if provider not in stats:
                    stats[provider] = {"total": 0, "success": 0, "success_rate": 0}
                stats[provider]["total"] += 1
                if success:
                    stats[provider]["success"] += 1
                stats[provider]["success_rate"] = stats[provider]["success"] / stats[provider]["total"]
                await self.memory_client.store_entity("provider_stats", user_id, stats)
            except: pass


provider_router = ProviderRouter()
