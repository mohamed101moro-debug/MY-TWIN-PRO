"""
EVOLUTION BRAIN v3.0 – مدير التطور
=====================================
- اقتراح ميزات
- Roadmap
- صيانة
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class EvolutionBrain:
    def __init__(self):
        self.ai_route = None

    async def suggest_features(self, project_context: Dict, lang: str = "ar") -> List[Dict]:
        if not self.ai_route:
            return []
        prompt = f"""اقترح 3-5 ميزات لتطوير مشروع: {project_context.get('idea', '')}. رتبها حسب الأولوية. اللغة: {lang}."""
        try:
            text, _ = await self.ai_route(prompt, task="evolution")
            return [{"suggestion": line.strip("- ")} for line in text.split("\n") if line.strip().startswith("-")]
        except:
            return []


evolution_brain = EvolutionBrain()
