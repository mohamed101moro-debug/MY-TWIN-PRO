"""
ARCHITECT BRAIN v3.0 – المعماري (Code Lab)
=============================================
- تصميم هيكل المشروع
- اختيار التقنية مع تبرير
- تعريف Layers & Patterns
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class ArchitectBrain:
    def __init__(self):
        self.ai_route = None

    async def design_architecture(self, idea: str, stack: Dict, lang: str = "ar") -> Dict[str, Any]:
        if not self.ai_route:
            return {"recommendation": "استخدم Clean Architecture"}
        
        prompt = f"""صمم معمارية لمشروع: "{idea}" باستخدام:
- Frontend: {stack.get('frontend', 'react')}
- Backend: {stack.get('backend', 'fastapi')}
- Database: {stack.get('database', 'postgresql')}
حدد: هيكل المجلدات، الطبقات، الأنماط، ونمط API. اللغة: {lang}."""
        try:
            text, _ = await self.ai_route(prompt, task="architecture")
            return {"architecture_design": text}
        except Exception as e:
            return {"error": str(e)}

    async def justify_technology(self, tech: str, context: Dict, lang: str = "ar") -> Dict[str, Any]:
        if not self.ai_route:
            return {"justification": f"{tech} خيار مناسب"}
        prompt = f"""برر استخدام {tech} في مشروع: {context.get('idea', '')}. اذكر الإيجابيات والسلبيات. اللغة: {lang}."""
        try:
            text, _ = await self.ai_route(prompt, task="architecture")
            return {"justification": text}
        except:
            return {}


architect_brain = ArchitectBrain()
