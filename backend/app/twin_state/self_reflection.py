"""
Self Reflection v1.1 — evidence-grounded reflection.

S4 rule: reflection must be derived from persisted observations and must not use
random selection to simulate an unpredictable inner life.
"""
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("self_reflection")


class SelfReflection:
    """Produce bounded, evidence-grounded internal reflection text."""

    async def reflect(self, user_id: str) -> Optional[str]:
        try:
            from app.memory.reflection.weekly_report import generate_weekly_report
            report = await generate_weekly_report(user_id)
            if not report:
                return None

            from app.twin_state.internal_state import twin_internal_state
            state = await twin_internal_state.get_state(user_id)
            thought = self._generate_reflection(report, state)
            if thought:
                from app.memory.reflection.reflection_engine import store_reflection
                await store_reflection(
                    user_id=user_id,
                    insight_type="self_reflection",
                    insight_text=thought,
                    confidence=0.7,
                )
            return thought
        except Exception as e:
            logger.debug(f"Self reflection skipped: {e}")
            return None

    def _generate_reflection(self, report: Dict[str, Any], state: Dict[str, Any]) -> Optional[str]:
        """Choose the first applicable evidence-based observation deterministically."""
        total_messages = int(report.get("total_messages", 0) or 0)
        dominant_emotion = str(report.get("dominant_emotion", "neutral") or "neutral")
        bond_depth = float(state.get("bond_depth", 0.0) or 0.0)
        curiosity = float(state.get("curiosity", 0.5) or 0.5)
        last_thought = str(state.get("last_thought", "")).strip()

        if total_messages > 100:
            return f"سجلت {total_messages} تفاعلًا في الفترة الأخيرة؛ سأبني استمراريتي على ما هو مثبت في هذه التفاعلات."
        if dominant_emotion == "joy":
            return "تشير التفاعلات الأخيرة إلى غلبة لحظات إيجابية؛ سأحافظ على هذا السياق دون افتراض ما لم يُذكر."
        if dominant_emotion == "sadness":
            return "تشير التفاعلات الأخيرة إلى حضور الحزن؛ سأتعامل معه كإشارة سياقية وأتجنب افتراض ما وراءه."
        if bond_depth > 0.8:
            return "مستوى الرابطة المسجل مرتفع؛ سأحافظ على اتساق أسلوبي مع التاريخ المثبت بدل اختلاق ذاكرة جديدة."
        if curiosity > 0.8:
            return "مستوى الفضول المسجل مرتفع؛ سأبحث عن معلومات جديدة عندما يقدم التفاعل دليلًا عليها."
        if last_thought:
            return "أراجع آخر ملاحظة داخلية محفوظة قبل أن أبني استمرارية التفاعل التالي."
        if total_messages > 0:
            return "أستخدم سجل التفاعلات السابقة كأساس للاستمرارية، لا كبديل عن دليل جديد."
        return None


self_reflection = SelfReflection()
logger.info("✅ Self Reflection v1.1 ready (deterministic/evidence-grounded)")
