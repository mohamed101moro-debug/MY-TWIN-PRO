"""
Unified Tool Registry v5.0 – سجل الأدوات الموحّد
=====================================================
يسجل الأدوات في كلا السجلين: القديم والجديد.
متوافق مع النظامين.
"""
import logging
from typing import Dict, Any, Optional, Callable

logger = logging.getLogger(__name__)

class ToolRegistry:
    _tools: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def register(cls, name: str, func: Callable, priority: int = 5, cost: int = 1, category: str = "general", description: str = ""):
        cls._tools[name] = {"function": func, "priority": priority, "cost": cost, "category": category, "description": description}
        
        # تسجيل أيضاً في Capability Registry الجديد
        try:
            from app.features.tools.capability_registry import CapabilityRegistry
            CapabilityRegistry.register(name, func, {
                "when_to_use": description, "confidence": 80, "cost": cost,
                "latency_ms": 1000, "priority": priority, "category": category,
            })
        except Exception as e:
            logger.debug(f"Capability registry sync skipped: {e}")

    @classmethod
    def get_tool(cls, name: str) -> Optional[Callable]:
        tool = cls._tools.get(name)
        return tool["function"] if tool else None

    @classmethod
    def list_tools(cls) -> list:
        return list(cls._tools.keys())

    @classmethod
    def get_all(cls) -> Dict[str, Dict[str, Any]]:
        return cls._tools


# ============================================================
# تسجيل أدوات الذاكرة (TCMA)
# ============================================================
async def tool_emotional_state(user_id: str, query: str = "") -> str:
    try:
        from app.memory.emotional.emotional_memory import get_emotional_state_for_response
        state = await get_emotional_state_for_response(user_id, "")
        return f"الحالة العاطفية: {state.get('current_emotion', 'محايد')}"
    except Exception as e: return f"تعذر: {e}"

async def tool_user_identity(user_id: str, query: str = "") -> str:
    try:
        from app.memory.identity.identity_model import get_identity
        identity = await get_identity(user_id)
        return f"هوية المستخدم: {identity.get('self_view', 'غير معروف')}"
    except Exception as e: return f"تعذر: {e}"

async def tool_reflections(user_id: str, query: str = "") -> str:
    try:
        from app.memory.reflection.reflection_engine import get_user_insights
        insights = await get_user_insights(user_id, min_confidence=0.6)
        return f"استنتاجات: {insights.get('summary', 'لا يوجد')}"
    except Exception as e: return f"تعذر: {e}"

# ============================================================
# تسجيل أدوات الميزات
# ============================================================
async def tool_study_session(user_id: str, query: str = "") -> str:
    try:
        from app.features.study.athena_orchestrator import athena
        result = await athena.start_study_session(user_id, query or "عام", "teen", "ar")
        return result.get("explanation", {}).get("simplified", "جاري الدراسة...")
    except Exception as e: return f"تعذر: {e}"

async def tool_business_idea(user_id: str, query: str = "") -> str:
    try:
        from app.features.business.growth_hive_orchestrator import growth_hive
        result = await growth_hive.generate_business_idea(user_id, 1000, query, "عام", "ar")
        return str(result.get("ideas", ""))[:500]
    except Exception as e: return f"تعذر: {e}"

async def tool_code_generation(user_id: str, query: str = "") -> str:
    try:
        from app.features.code_lab.code_lab_orchestrator import code_lab
        result = await code_lab.review_code(user_id, query, "Python")
        return str(result)[:500]
    except Exception as e: return f"تعذر: {e}"

async def tool_life_coach(user_id: str, query: str = "") -> str:
    try:
        from app.features.life_coach.life_coach_orchestrator import life_coach
        result = await life_coach.full_session(user_id, query, "ar")
        return result.get("coach_reply", "أنا هنا لدعمك.")[:500]
    except Exception as e: return f"تعذر: {e}"

async def tool_dream_interpret(user_id: str, query: str = "") -> str:
    try:
        from app.features.dreams.dream_orchestrator import dream_orchestrator
        result = await dream_orchestrator.interpret(user_id, query, "ar")
        return result.get("data", {}).get("interpretation", "تعذر التفسير")[:500]
    except Exception as e: return f"تعذر: {e}"

async def tool_proactive_recommendation(user_id: str, query: str = "") -> str:
    try:
        from app.core.unified_recommendation_engine import engine
        recs = await engine.get_daily_recommendation(user_id)
        return recs.get("recommendations", [{}])[0].get("message", "لا توجد توصيات")
    except Exception as e: return f"تعذر: {e}"

# ============================================================
# تسجيل الكل
# ============================================================
ToolRegistry.register("emotional_state", tool_emotional_state, 10, 1, "memory", "الحالة العاطفية")
ToolRegistry.register("user_identity", tool_user_identity, 9, 1, "memory", "هوية المستخدم")
ToolRegistry.register("reflections", tool_reflections, 8, 1, "memory", "الاستنتاجات")
ToolRegistry.register("study", tool_study_session, 8, 2, "study", "جلسة دراسة")
ToolRegistry.register("business", tool_business_idea, 7, 2, "business", "فكرة مشروع")
ToolRegistry.register("code", tool_code_generation, 6, 3, "code_lab", "توليد كود")
ToolRegistry.register("life_coach", tool_life_coach, 5, 2, "life_coach", "تدريب حياة")
ToolRegistry.register("dream", tool_dream_interpret, 4, 2, "dreams", "تفسير حلم")
ToolRegistry.register("recommendation", tool_proactive_recommendation, 10, 1, "proactive", "توصية يومية")

logger.info(f"✅ Tool Registry: {len(ToolRegistry._tools)} tools registered")
print(f"✅ Tool Registry: {len(ToolRegistry._tools)} tools registered")
