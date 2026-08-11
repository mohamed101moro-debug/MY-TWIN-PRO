"""
CODE LAB ORCHESTRATOR v3.1 – مع حفظ المشاريع والربط بالدردشة
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.features.base_plugin import BasePlugin
from app.features.code_lab.product_brain import product_brain
from app.features.code_lab.architect_brain import architect_brain
from app.features.code_lab.project_brain import project_brain
from app.features.code_lab.tech_decision_engine import tech_decision_engine
from app.features.code_lab.security_brain import security_brain
from app.features.code_lab.performance_brain import performance_brain
from app.features.code_lab.devops_brain import devops_brain
from app.features.code_lab.code_quality_brain import code_quality_brain
from app.features.code_lab.mentor_brain import mentor_brain
from app.features.code_lab.evolution_brain import evolution_brain
from app.features.code_lab.project_health import project_health

logger = logging.getLogger(__name__)

class CodeLabOrchestrator(BasePlugin):
    def __init__(self):
        super().__init__(name="CodeLab", version="3.1.0")
        self.product = product_brain
        self.architect = architect_brain
        self.project = project_brain
        self.decision = tech_decision_engine
        self.security = security_brain
        self.performance = performance_brain
        self.devops = devops_brain
        self.quality = code_quality_brain
        self.mentor = mentor_brain
        self.evolution = evolution_brain
        self.health = project_health

    async def _inject_dependencies(self):
        ai = self.ai.route if hasattr(self, 'ai') and self.ai else None
        mem = self._memory_client
        engines_with_ai = [self.product, self.architect, self.decision, self.security,
                          self.performance, self.devops, self.quality, self.mentor,
                          self.evolution, self.health]
        for e in engines_with_ai: e.ai_route = ai
        engines_with_mem = [self.project, self.mentor]
        for e in engines_with_mem: e.memory_client = mem

    @property
    def plugin_id(self) -> str: return "code_lab"
    @property
    def plugin_name_ar(self) -> str: return "مختبر البرمجة"
    @property
    def plugin_name_en(self) -> str: return "Code Lab"

    async def _save_project_to_history(self, user_id: str, title: str, data: Dict, project_type: str = "code_lab"):
        """حفظ المشروع في جدول projects لظهوره في History"""
        try:
            if self._memory_client:
                await self._memory_client.store_entity("project", user_id, {
                    "title": title,
                    "type": project_type,
                    "data": data,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "user_id": user_id
                })
        except Exception as e:
            logger.warning(f"Failed to save project to history: {e}")

    async def analyze_idea(self, user_id: str, idea: str, lang: str = "ar") -> Dict:
        await self._inject_dependencies()
        result = await self.product.analyze_idea(idea, lang)
        # حفظ التحليل كمشروع
        await self._save_project_to_history(user_id, f"تحليل: {idea[:50]}", result, "code_lab")
        return result

    async def start_project(self, user_id: str, idea: str, stack: Dict = None, lang: str = "ar") -> Dict:
        await self._inject_dependencies()
        if not stack: stack = {"frontend": "react", "backend": "fastapi", "database": "postgresql"}
        analysis = await self.product.analyze_idea(idea, lang)
        architecture = await self.architect.design_architecture(idea, stack, lang)
        project_id = f"{user_id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        await self.project.initialize_project(project_id, idea, stack, user_id)
        await self._save_project_to_history(user_id, f"مشروع: {idea[:50]}", {
            "idea": idea, "stack": stack, "analysis": analysis, "architecture": architecture, "project_id": project_id
        }, "code_lab")
        await self._notify_consciousness(user_id, {"action": "project_started", "idea": idea})
        return {"project_id": project_id, "analysis": analysis, "architecture": architecture}

    async def review_code(self, user_id: str, code: str, lang: str = "Python") -> Dict:
        await self._inject_dependencies()
        quality = await self.quality.full_review(code, lang)
        security = await self.security.review(code, lang)
        mentoring = await self.mentor.analyze_user_code(user_id, code, lang)
        result = {"quality": quality, "security": security, "mentoring": mentoring}
        # حفظ المراجعة كمشروع
        await self._save_project_to_history(user_id, f"مراجعة كود ({lang})", {"code_snippet": code[:200], "review": result}, "code_lab")
        return result

    async def make_decision(self, question: str, options: List[str], context: Dict = None, lang: str = "ar") -> Dict:
        await self._inject_dependencies()
        result = await self.decision.decide(question, options, context or {}, lang)
        return result

    async def get_cto_dashboard(self, user_id: str, lang: str = "ar") -> Dict:
        await self._inject_dependencies()
        projects = []
        if self._memory_client:
            try:
                projects = await self._memory_client.get_entity_list("code_project", user_id) or []
            except: pass
        recommendations = []
        if projects and self.ai and hasattr(self, 'ai'):
            try:
                prompt = f"""بناءً على مشاريع المستخدم، اقترح 3 توصيات تقنية. اللغة: {lang}."""
                text, _ = await self.ai.route(prompt, task="cto_recommendations")
                recommendations = [line.strip("- ") for line in text.split("\n") if line.strip().startswith("-")]
            except: pass
        insights = ["راجع الكود دورياً", "اختبر قبل النشر", "حدث المكتبات"]
        return {
            "greeting": "مرحباً بك في مكتبك الهندسي" if lang == "ar" else "Welcome to your Engineering Office",
            "stats": {"total_projects": len(projects)},
            "recommendations": [{"recommendation": r} for r in recommendations[:3]],
            "insights": insights,
            "recent_projects": projects[-3:] if projects else [],
        }

    async def startup_mode(self, user_id: str, idea: str, lang: str = "ar") -> Dict:
        await self._inject_dependencies()
        result = await self.product.startup_mode(idea, lang)
        await self._save_project_to_history(user_id, f"Startup: {idea[:50]}", result, "code_lab")
        return result

    async def get_project_health(self, project_id: str, lang: str = "ar") -> Dict:
        await self._inject_dependencies()
        context = await self.project.get_project_context(project_id)
        health = await self.health.calculate(context, lang)
        return {"project": context, "health": health}

    async def _notify_consciousness(self, user_id: str, data: Dict):
        try:
            from app.core.consciousness_bridge import consciousness_bridge
            await consciousness_bridge.on_feature_used(user_id, "code_lab", data)
        except: pass

    def register_routes(self, app: Any) -> bool:
        try:
            from app.api.routes.code_lab_routes import router
            app.include_router(router)
            return True
        except Exception as e:
            logger.warning(f"Routes not registered: {e}")
            return False


code_lab = CodeLabOrchestrator()
