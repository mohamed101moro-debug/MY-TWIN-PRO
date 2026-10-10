"""
TECH DECISION ENGINE v3.0 – محرك القرارات التقنية
====================================================
- مقارنة تقنيات
- تبرير
- توصية
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class TechDecisionEngine:
    def __init__(self):
        self.ai_route = None

    async def decide(self, question: str, options: List[str], context: Dict, lang: str = "ar") -> Dict[str, Any]:
        if not self.ai_route or not options:
            return {"recommended": options[0] if options else ""}
        
        options_text = "\n".join([f"- {o}" for o in options])
        prompt = f"""سؤال تقني: {question}
الخيارات:
{options_text}
السياق: {context}
حلل كل خيار من حيث: الأداء، التكلفة، سهولة التعلم، المجتمع، وقابلية التوسع. ثم اختر الأفضل مع تبرير. اللغة: {lang}."""
        try:
            text, _ = await self.ai_route(prompt, task="technical_decision")
            return {"analysis": text, "recommended": options[0]}
        except:
            return {"recommended": options[0]}


tech_decision_engine = TechDecisionEngine()
