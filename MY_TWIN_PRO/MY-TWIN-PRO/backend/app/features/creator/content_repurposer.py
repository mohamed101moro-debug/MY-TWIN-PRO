"""
CONTENT REPURPOSER v1.0 – إعادة توظيف المحتوى بين الصيغ
"""
import logging
from typing import Dict, Any, List
logger = logging.getLogger("content_repurposer")
FORMATS = {"article":"مقال طويل","tweet":"سلسلة تغريدات","instagram":"منشور إنستغرام","linkedin":"منشور لينكدإن","video":"سكريبت فيديو","newsletter":"نشرة بريدية"}
class ContentRepurposer:
    def __init__(self):
        self.ai_route = None
        self.memory_client = None
    async def repurpose(self, user_id: str, content: str, source_format: str, target_format: str, language: str = "ar") -> Dict[str, Any]:
        if not self.ai_route:
            return {"status": "unavailable", "result": ""}
        prompt = (f"أعد صياغة المحتوى من صيغة '{FORMATS.get(source_format, source_format)}' إلى '{FORMATS.get(target_format, target_format)}'. "
                  f"حافظ على الفكرة والنبرة. اللغة: {language}.\n\nالمحتوى:\n{content[:3000]}")
        try:
            text, _ = await self.ai_route(prompt, task="creative", user_id=user_id)
            result = text or ""
        except Exception as e:
            logger.warning(f"repurpose failed: {e}"); result = ""
        if result and self.memory_client:
            try:
                await self.memory_client.store_entity("project", user_id, {"title": f"إعادة توظيف: {source_format}→{target_format}", "type": "content", "data": {"target": target_format, "result": result[:500]}, "user_id": user_id})
            except Exception: pass
        return {"status": "success" if result else "failed", "result": result, "source_format": source_format, "target_format": target_format}
    async def batch_repurpose(self, user_id: str, content: str, target_formats: List[str], language: str = "ar") -> Dict[str, Any]:
        outputs = {}
        for fmt in target_formats[:4]:
            out = await self.repurpose(user_id, content, "article", fmt, language)
            outputs[fmt] = out.get("result", "")
        return {"status": "success", "outputs": outputs}
content_repurposer = ContentRepurposer()
logger.info("✅ Content Repurposer v1.0 ready")
