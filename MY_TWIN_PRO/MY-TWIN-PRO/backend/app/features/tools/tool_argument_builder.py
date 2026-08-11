"""
Tool Argument Builder v3.0 – بناء سياق غني للأدوات
=====================================================
يبني Tool Context كامل (وليس query فقط):
- الهوية، المشاعر، الذاكرة، الحالة، العلاقة، الموقع، الجهاز
"""
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("tool_argument_builder")

class ArgumentBuilder:
    async def build(self, tool_name: str, message: str, user_id: str, tier: str = "free") -> Dict[str, Any]:
        """بناء سياق غني للأداة"""
        context = {"user_id": user_id, "query": message, "tier": tier}

        # إثراء بالذاكرة
        try:
            from app.features.tools.tool_registry import ToolRegistry
            if tool_name in ["emotional_state", "reflections", "life_coach"]:
                from app.memory.emotional.emotional_memory import get_emotional_state_for_response
                state = await get_emotional_state_for_response(user_id, "")
                context["emotion"] = state.get("current_emotion", "neutral")
            
            if tool_name in ["user_identity", "life_coach", "business"]:
                from app.memory.identity.identity_model import get_identity
                identity = await get_identity(user_id)
                context["identity"] = identity.get("self_view", "")
        except Exception as e:
            logger.debug(f"Context enrichment skipped: {e}")

        return context


argument_builder = ArgumentBuilder()
