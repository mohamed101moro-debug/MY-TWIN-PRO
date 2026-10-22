"""
CREATIVE ADVISOR v2.0 – مستشار إبداعي (100%)
================================================
- يقترح تحسينات قبل وبعد التوليد
- يتذكر الاقتراحات السابقة (TCMA)
- يتعلم من تفضيلات المستخدم
"""
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class CreativeAdvisor:
    def __init__(self):
        self.ai_route = None
        self.memory_client = None

    async def suggest_improvements(self, user_id: str, prompt: str, language: str = "ar") -> List[str]:
        """اقتراح تحسينات مع تذكر الاقتراحات السابقة"""
        # استرجاع الاقتراحات السابقة من TCMA
        previous_suggestions = []
        if self.memory_client:
            try:
                history = await self.memory_client.get_entity("advisor_history", user_id)
                if history:
                    previous_suggestions = history.get("suggestions", [])[-5:]
            except: pass

        if not self.ai_route:
            return previous_suggestions[:3] if previous_suggestions else ["جرب إضاءة مختلفة", "غير زاوية الكاميرا"]

        try:
            context = f"Previous suggestions: {', '.join(previous_suggestions[-3:])}" if previous_suggestions else ""
            ai_prompt = f"Suggest 3 creative improvements for image prompt: '{prompt}'. {context} Language: {language}. Reply as bullet points."
            text, _ = await self.ai_route(ai_prompt, task="creative")
            suggestions = [line.strip("- ").strip() for line in text.split("\n") if line.strip().startswith("-")]

            # حفظ الاقتراحات في TCMA
            if self.memory_client and suggestions:
                all_suggestions = previous_suggestions + suggestions
                await self.memory_client.store_entity("advisor_history", user_id, {"suggestions": all_suggestions[-10:]})

            return suggestions[:3] if suggestions else ["جرب إضاءة مختلفة"]
        except:
            return ["جرب إضاءة مختلفة", "غير زاوية الكاميرا", "أضف عنصراً في الخلفية"]


creative_advisor = CreativeAdvisor()
