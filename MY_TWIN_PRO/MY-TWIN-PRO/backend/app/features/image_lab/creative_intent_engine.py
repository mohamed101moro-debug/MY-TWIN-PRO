"""
CREATIVE INTENT ENGINE v2.0 – فهم نية المستخدم (100%)
========================================================
- Avatar, Marketing, Poster, Book Cover, Logo, Icon, Wallpaper...
- متصل بـ TCMA لتذكر تفضيلات المستخدم
- يستخدم AI لتحليل النية
"""
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

INTENT_PROFILES = {
    "avatar": {"style": "portrait", "lighting": "studio", "aspect": "1:1"},
    "marketing": {"style": "product", "lighting": "studio", "aspect": "4:5"},
    "poster": {"style": "cinematic", "lighting": "dramatic", "aspect": "2:3"},
    "book_cover": {"style": "digital_art", "lighting": "dramatic", "aspect": "2:3"},
    "logo": {"style": "logo", "lighting": "", "aspect": "1:1"},
    "icon": {"style": "logo", "lighting": "", "aspect": "1:1"},
    "wallpaper": {"style": "digital_art", "lighting": "golden_hour", "aspect": "16:9"},
    "thumbnail": {"style": "digital_art", "lighting": "neon", "aspect": "16:9"},
    "product": {"style": "product", "lighting": "studio", "aspect": "1:1"},
    "fashion": {"style": "realistic", "lighting": "studio", "aspect": "2:3"},
    "food": {"style": "realistic", "lighting": "soft", "aspect": "4:5"},
    "architecture": {"style": "realistic", "lighting": "golden_hour", "aspect": "16:9"},
}

class CreativeIntentEngine:
    def __init__(self):
        self.ai_route = None
        self.memory_client = None

    async def detect_intent(self, user_id: str, prompt: str, language: str = "ar") -> Dict[str, Any]:
        """اكتشاف نية المستخدم مع تذكر تفضيلاته"""
        # استرجاع آخر Intent من TCMA
        if self.memory_client:
            try:
                last = await self.memory_client.get_entity("visual_last_intent", user_id)
                if last and last.get("intent"):
                    intent = last["intent"]
                    if intent in INTENT_PROFILES:
                        return INTENT_PROFILES[intent]
            except: pass

        # استخدام AI لتحليل النية
        if self.ai_route:
            try:
                text, _ = await self.ai_route(
                    f"Classify this image prompt into one intent: {', '.join(INTENT_PROFILES.keys())}. Prompt: '{prompt}'. Reply with intent only.",
                    task="creative"
                )
                intent = text.strip().lower() if text else "avatar"
                if intent in INTENT_PROFILES:
                    # حفظ النية في TCMA
                    if self.memory_client:
                        await self.memory_client.store_entity("visual_last_intent", user_id, {"intent": intent})
                    return INTENT_PROFILES[intent]
            except: pass

        return INTENT_PROFILES.get("avatar", {})

    async def get_aspect_ratio(self, intent: str) -> str:
        profile = INTENT_PROFILES.get(intent, INTENT_PROFILES["avatar"])
        return profile.get("aspect", "1:1")


creative_intent_engine = CreativeIntentEngine()
