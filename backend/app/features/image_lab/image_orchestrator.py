"""
IMAGE ORCHESTRATOR v8.0 – منسق منصة الإبداع البصري
=====================================================
- يدمج جميع المحركات العشرة
- يحقن AI و TCMA في كل محرك تلقائياً
- يدعم التوليد، التحسين، التقييم، التحرير، والتحليل
- يحفظ تلقائياً في History و Visual Memory
"""
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from app.features.image_lab.prompt_composer import prompt_composer
from app.features.image_lab.creative_intent_engine import creative_intent_engine
from app.features.image_lab.provider_router import provider_router
from app.features.image_lab.image_critic import image_critic
from app.features.image_lab.image_editor import image_editor
from app.features.image_lab.visual_memory import visual_memory
from app.features.image_lab.creative_advisor import creative_advisor
from app.features.image_lab.image_project_manager import image_project_manager
from app.features.image_lab.image_safety import image_safety
from app.features.image_lab.image_analyzer import image_analyzer

logger = logging.getLogger(__name__)

class ImageOrchestrator:
    def __init__(self):
        self.composer = prompt_composer
        self.intent = creative_intent_engine
        self.router = provider_router
        self.critic = image_critic
        self.editor = image_editor
        self.memory = visual_memory
        self.advisor = creative_advisor
        self.projects = image_project_manager
        self.safety = image_safety
        self.analyzer = image_analyzer

    async def _inject_dependencies(self):
        """حقن AI و TCMA في جميع المحركات"""
        # سيتم استدعاؤها من BasePlugin أو مباشرة
        pass

    def set_ai_route(self, ai_route):
        """حقن AI Gateway"""
        for engine in [self.composer, self.intent, self.critic, self.editor,
                       self.advisor, self.safety, self.analyzer]:
            engine.ai_route = ai_route

    def set_memory_client(self, memory_client):
        """حقن TCMA"""
        for engine in [self.composer, self.intent, self.router, self.memory,
                       self.advisor, self.projects]:
            engine.memory_client = memory_client

    async def generate(self, user_id: str, prompt: str, style: str = "realistic",
                       lighting: str = "", camera: str = "", negative: str = "",
                       language: str = "ar") -> Dict[str, Any]:
        """التوليد الذكي مع كامل المراحل"""

        # 1. فحص السلامة
        safety_check = await self.safety.check_prompt(prompt, language)
        if not safety_check.get("safe", True):
            return {"status": "blocked", "reason": safety_check.get("reason", "محتوى غير آمن")}

        # 2. اكتشاف النية
        intent_profile = await self.intent.detect_intent(user_id, prompt, language)

        # 3. بناء Prompt احترافي
        composed = await self.composer.compose(user_id, prompt, style, lighting, camera, negative)

        # 4. اختيار أفضل مزود
        providers = await self.router.route(user_id, style, intent_profile.get("style", "realistic"))

        # 5. محاولة التوليد عبر المزودين
        result = None
        used_provider = "none"
        for provider in providers:
            result = await self._try_provider(user_id, composed["positive"], composed["negative"], provider)
            if result and result.get("status") == "success":
                used_provider = provider
                break

        if not result or result.get("status") != "success":
            return {"status": "failed", "message": "فشل توليد الصورة عبر جميع المزودين"}

        # 6. تقييم الجودة
        image_base64 = result.get("image_base64", "")
        evaluation = await self.critic.evaluate(prompt, image_base64, used_provider, language)

        # 7. إذا الجودة منخفضة، إعادة المحاولة مرة واحدة
        if evaluation.get("needs_retry"):
            for provider in providers:
                retry_result = await self._try_provider(user_id, composed["positive"], composed["negative"], provider)
                if retry_result and retry_result.get("status") == "success":
                    result = retry_result
                    used_provider = provider
                    break

        # 8. تسجيل النتيجة
        await self.router.record_result(user_id, used_provider, True)

        # 9. حفظ في الذاكرة البصرية
        await self.memory.auto_save_after_generation(user_id, prompt, style, used_provider)

        # 10. حفظ في History
        await self.projects.save_to_history(user_id, prompt, result.get("image_url", ""), used_provider, {
            "style": style, "lighting": lighting, "camera": camera, "evaluation": evaluation
        })

        # 11. اقتراحات إبداعية
        suggestions = await self.advisor.suggest_improvements(user_id, prompt, language)

        return {
            "status": "success",
            "image_url": result.get("image_url", ""),
            "provider": used_provider,
            "prompt_used": composed["positive"],
            "evaluation": evaluation,
            "suggestions": suggestions
        }

    async def _try_provider(self, user_id: str, prompt: str, negative: str, provider: str) -> Optional[Dict]:
        """محاولة التوليد عبر مزود محدد"""
        import base64, aiohttp, os, asyncio

        if provider == "gemini":
            try:
                from app.infrastructure.ai.ai_gateway import ai_gateway
                key = ai_gateway.key_manager.get_key("gemini_image")
                if key:
                    from google import genai
                    client = genai.Client(api_key=key)
                    loop = asyncio.get_running_loop()
                    response = await asyncio.wait_for(
                        loop.run_in_executor(None, lambda: client.models.generate_content(
                            model="gemini-2.5-flash-exp-image-generation",
                            contents=prompt
                        )),
                        timeout=30.0
                    )
                    if response and response.text:
                        return {"status": "success", "image_url": response.text, "image_base64": ""}
            except Exception as e:
                logger.warning(f"Gemini failed: {e}")

        if provider in ["flux", "pollinations", "ideogram"]:
            try:
                encoded = prompt.replace(" ", "%20")
                width, height = 1024, 1024
                model_param = "&model=flux" if provider == "flux" else ""
                url = f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&nologo=true{model_param}"
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                        if resp.status == 200:
                            img_bytes = await resp.read()
                            return {"status": "success", "image_url": f"data:image/png;base64,{base64.b64encode(img_bytes).decode()}", "image_base64": base64.b64encode(img_bytes).decode()}
            except Exception as e:
                logger.warning(f"{provider} failed: {e}")

        return None

    # ── قدرات إضافية ──────────────────────────────────────
    async def enhance_prompt(self, user_id: str, prompt: str) -> Dict[str, Any]:
        enhanced = await self.composer.enhance_with_ai(prompt)
        return {"original": prompt, "enhanced": enhanced}

    async def analyze_image(self, image_base64: str, language: str = "ar") -> Dict[str, Any]:
        return await self.analyzer.full_analysis(image_base64, language)

    async def edit_image(self, operation: str, image_base64: str, **kwargs) -> Dict[str, Any]:
        if operation == "upscale":
            return await self.editor.upscale(image_base64)
        elif operation == "remove_bg":
            return await self.editor.remove_background(image_base64)
        elif operation == "restore_face":
            return await self.editor.restore_face(image_base64)
        return {"status": "unknown_operation"}

    async def get_dashboard(self, user_id: str, lang: str = "ar") -> Dict[str, Any]:
        history = await self.memory.get_history(user_id, 10)
        favorites = await self.projects.get_favorites(user_id)
        prefs = await self.memory.get_preferences(user_id)
        return {
            "recent_generations": history,
            "favorites_count": len(favorites),
            "preferences": prefs
        }


image_lab = ImageOrchestrator()
