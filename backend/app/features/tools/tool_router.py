import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("tool_router")

class ToolRouter:
    def __init__(self):
        self.keyword_map = {
            "طقس": "weather", "weather": "weather",
            "أخبار": "news", "news": "news",
            "ادرس": "study", "study": "study",
            "كود": "code", "code": "code",
            "حلم": "dream", "dream": "dream",
            "مشروع": "business", "business": "business",
        }

    async def route(self, message: str, user_id: str, tier: str = "free", ai_route=None) -> Optional[str]:
        if not message: return None

        # 1. استخدام Intent Engine (AI) - مع حقن ai_route
        try:
            from app.features.tools.capability_intent_engine import capability_intent_engine
            from app.features.tools.capability_planner import capability_planner
            
            # حقن ai_route إذا كان متاحاً
            if ai_route:
                capability_intent_engine.ai_route = ai_route
                capability_planner.ai_route = ai_route
            
            intent = await capability_intent_engine.analyze(message, None, "ar")
            capabilities = intent.get("capabilities", [])
            
            if capabilities:
                plan = await capability_planner.plan(intent["intent"], capabilities)
                if plan["capabilities_to_execute"]:
                    from app.features.tools.tool_executor import tool_executor
                    return await tool_executor.execute(plan["capabilities_to_execute"][0], message, user_id, tier)
        except Exception as e:
            logger.warning(f"Intent Engine fallback: {e}")

        # 2. احتياطي: الكلمات المفتاحية
        tool_name = self._detect(message)
        if tool_name:
            from app.features.tools.tool_executor import tool_executor
            return await tool_executor.execute(tool_name, message, user_id, tier)

        return None

    def _detect(self, message: str) -> Optional[str]:
        msg_lower = message.lower()
        for keyword, tool_name in self.keyword_map.items():
            if keyword in msg_lower:
                return tool_name
        return None


tool_router = ToolRouter()
