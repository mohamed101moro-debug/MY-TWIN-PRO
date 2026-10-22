"""
MENTOR BRAIN v3.0 – المرشد الهندسي
======================================
- تتبع أخطاء المستخدم
- شرح حسب المستوى
- Pair Programming
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class MentorBrain:
    def __init__(self):
        self.ai_route = None
        self.memory_client = None

    async def analyze_user_code(self, user_id: str, code: str, lang: str = "Python") -> Dict[str, Any]:
        if self.ai_route:
            try:
                prompt = f"""حلل كود المستخدم ({lang}) واذكر 3 نقاط للتحسين.\n\n{code[:1500]}"""
                text, _ = await self.ai_route(prompt, task="mentoring")
            except: text = ""
        else: text = ""
        return {"feedback": text}

    async def explain_concept(self, concept: str, user_level: str = "beginner", lang: str = "ar") -> str:
        if not self.ai_route:
            return f"شرح {concept}"
        prompt = f"""اشرح '{concept}' لمبرمج مستوى '{user_level}'. اللغة: {lang}."""
        try:
            text, _ = await self.ai_route(prompt, task="mentoring")
            return text
        except:
            return f"شرح {concept}"


mentor_brain = MentorBrain()
