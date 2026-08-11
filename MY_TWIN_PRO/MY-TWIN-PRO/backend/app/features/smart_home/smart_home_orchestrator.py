"""
Smart Home Orchestrator v7.0 – المنزل الواعي (Plugin)
=========================================================
يدمج: Environment, Decision, Automation, Predictive, Personality, Memory
"""
import logging
from typing import Dict, Any, List

from app.features.base_plugin import BasePlugin
from app.features.smart_home.environment_engine import environment_engine
from app.features.smart_home.decision_engine import decision_engine
from app.features.smart_home.automation_learning import automation_learning
from app.features.smart_home.predictive_env import predictive_env
from app.features.smart_home.home_personality import home_personality
from app.features.smart_home.environment_memory import environment_memory

logger = logging.getLogger(__name__)

ROUTINE_ACTIONS = {
    "morning": [("light", "light_on"), ("climate", "ac_heat"), ("routine", "news")],
    "work": [("light", "light_off"), ("climate", "ac_off")],
    "evening": [("light", "light_dim"), ("routine", "music")],
    "night": [("light", "light_off"), ("climate", "ac_off"), ("lock", "lock_doors")],
    "travel": [("light", "all_off"), ("climate", "all_off"), ("camera", "cameras_on")],
    "guests": [("light", "light_welcome"), ("routine", "music"), ("climate", "ac_heat")],
}

class SmartHomeOrchestrator(BasePlugin):
    def __init__(self):
        super().__init__(name="SmartHome", version="7.0.0")
        self.environment = environment_engine
        self.decision = decision_engine
        self.automation = automation_learning
        self.predictive = predictive_env
        self.personality = home_personality
        self.memory = environment_memory

    async def _save_to_history(self, user_id: str, command: str, environment: Dict):
        if self._memory_client:
            try:
                await self._memory_client.store_entity("project", user_id, {
                    "title": f"منزل: {command[:50]}",
                    "type": "smart_home",
                    "data": {"command": command, "environment": environment},
                    "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
                    "user_id": user_id
                })
            except: pass
    async def _inject_dependencies(self):
        ai = self.ai.route if hasattr(self, 'ai') and self.ai else None
        mem = self._memory_client
        self.decision.ai_route = ai
        self.automation.ai_route = ai
        self.predictive.ai_route = ai
        self.memory.memory_client = mem

    @property
    def plugin_id(self) -> str: return "smart_home"
    @property
    def plugin_name_ar(self) -> str: return "البيت الواعي"
    @property
    def plugin_name_en(self) -> str: return "Conscious Home"

    async def process_command(self, user_id: str, command: str, lang: str = "ar") -> Dict:
        await self._inject_dependencies()
        environment = await self.environment.build_world_model(user_id, lang)
        context = {"emotion": "neutral"}
        try:
            from app.memory.emotional.emotional_memory import get_emotional_state_for_response
            state = await get_emotional_state_for_response(user_id, "")
            context["emotion"] = state.get("current_emotion", "neutral") if state else "neutral"
        except: pass

        decisions = await self.decision.decide(environment, context, command, lang)
        predictions = await self.predictive.predict(environment, lang)
        personality = self.personality.get_environment_for_emotion(context["emotion"])
        await self.automation.log_action(user_id, command, "device_control")
        await self.memory.save_state(user_id, environment)
        await self._save_to_history(user_id, command, environment)

        return {
            "command": command,
            "environment": environment,
            "decisions": decisions,
            "predictions": predictions,
            "personality": personality,
            "executed": decisions["should_act"],
        }

    async def get_status(self, user_id: str) -> Dict:
        await self._inject_dependencies()
        environment = await self.environment.build_world_model(user_id)
        patterns = await self.automation.learn_patterns(user_id)
        predictions = await self.predictive.predict(environment)
        return {
            "environment": environment,
            "patterns": patterns,
            "predictions": predictions,
        }

    def register_routes(self, app: Any) -> bool:
        try:
            from app.api.routes.smart_home_routes import router
            app.include_router(router)
            return True
        except: return False


smart_home = SmartHomeOrchestrator()
