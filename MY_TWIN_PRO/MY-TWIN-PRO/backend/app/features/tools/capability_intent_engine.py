"""
CAPABILITY INTENT ENGINE v1.0 – محلل النية الذكي
=====================================================
يستبدل ToolRouter القديم. يحلل نية المستخدم باستخدام AI
(وليس الكلمات المفتاحية) ويحدد القدرات المطلوبة.
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("capability_intent_engine")

CAPABILITY_MAP = {
    "weather": "understand_environment",
    "news": "understand_world",
    "memory": "remember_past",
    "emotion": "understand_emotion",
    "study": "learn_topic",
    "business": "business_planning",
    "code": "generate_code",
    "life_coach": "life_guidance",
    "dream": "interpret_dream",
    "recommendation": "proactive_guidance",
}

class CapabilityIntentEngine:
    def __init__(self):
        self.ai_route = None

    async def analyze(self, message: str, user_context: Dict = None, language: str = "ar") -> Dict[str, Any]:
        """تحليل نية المستخدم باستخدام AI"""
        if not self.ai_route:
            return self._keyword_fallback(message)

        prompt = f"""حلل نية المستخدم من هذه الرسالة: "{message}".
حدد:
1. الهدف الرئيسي (intent)
2. القدرات المطلوبة من هذه القائمة: {', '.join(CAPABILITY_MAP.keys())}
3. مستوى الثقة (0-100)
4. الأولوية (1-10)
اللغة: {language}. أجب بتنسيق JSON: {{"intent": "...", "capabilities": [...], "confidence": 0-100, "priority": 1-10}}"""
        try:
            text, _ = await self.ai_route(prompt, task="general")
            import json
            result = json.loads(text)
            return {
                "intent": result.get("intent", "general"),
                "capabilities": result.get("capabilities", []),
                "confidence": result.get("confidence", 70),
                "priority": result.get("priority", 5),
            }
        except:
            return self._keyword_fallback(message)

    def _keyword_fallback(self, message: str) -> Dict[str, Any]:
        """احتياطي: تحليل بالكلمات المفتاحية (متوافق مع القديم)"""
        keyword_map = {
            "طقس": ["weather"], "weather": ["weather"],
            "أخبار": ["news"], "news": ["news"],
            "ادرس": ["study"], "study": ["study"],
            "كود": ["code"], "code": ["code"],
            "حلم": ["dream"], "dream": ["dream"],
            "مشروع": ["business"], "business": ["business"],
        }
        msg_lower = message.lower()
        for keyword, capabilities in keyword_map.items():
            if keyword in msg_lower:
                return {"intent": keyword, "capabilities": capabilities, "confidence": 60, "priority": 5}
        return {"intent": "general", "capabilities": [], "confidence": 30, "priority": 3}


capability_intent_engine = CapabilityIntentEngine()
