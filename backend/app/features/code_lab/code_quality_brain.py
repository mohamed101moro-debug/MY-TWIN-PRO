"""
CODE QUALITY BRAIN v3.0 – جودة الكود
========================================
- مراجعة شاملة
- اختبارات
- Refactoring
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class CodeQualityBrain:
    def __init__(self):
        self.ai_route = None

    async def full_review(self, code: str, lang: str = "Python") -> Dict[str, Any]:
        if not self.ai_route:
            return {}
        prompt = f"""راجع الكود التالي ({lang}) من حيث: الأمان، الأداء، النظافة، واقترح تحسينات.\n\n{code[:2000]}"""
        try:
            text, _ = await self.ai_route(prompt, task="code_review")
            return {"review": text}
        except:
            return {}

    async def suggest_tests(self, code: str, lang: str = "Python") -> Dict[str, Any]:
        if not self.ai_route:
            return {}
        prompt = f"""اقترح 5 اختبارات للكود التالي ({lang}).\n\n{code[:1500]}"""
        try:
            text, _ = await self.ai_route(prompt, task="code_review")
            return {"test_cases": text}
        except:
            return {}


code_quality_brain = CodeQualityBrain()
