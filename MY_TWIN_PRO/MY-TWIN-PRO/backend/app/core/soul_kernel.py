"""Soul Kernel v1.1 — سياق → أهمية → تجربة → حالة → نية تعبير + C1: أحداث الحياة والزمن الذاتي."""
import logging, re
from typing import Dict, Any, Optional
logger = logging.getLogger("soul_kernel")
BODY_WORDS = ["رجل", "قدم", "ظهر", "كتف", "رأس", "صداع", "تعب", "إرهاق", "نوم", "مشي", "خطوات", "رياضة", "جري"]
def _wants_body_observation(message: str) -> bool:
    return any(w in (message or "") for w in BODY_WORDS)
class SoulKernel:
    async def pre_process(self, user_id: str, message: str, device_info: Optional[Dict], lang: str = "ar") -> Dict[str, Any]:
        di = device_info or {}
        contextual = str(di.get("contextual_prompt") or "")
        steps_today = self._extract_steps(contextual)
        life_note = await self._life_observation(user_id, steps_today, message)
        engine_context = (
            f"[OBSERVATION] {contextual[:600]} "
            f"[LIFE_LOG] {life_note['text']} "
            f"[RULE] استخدم الملاحظات الشخصية أعلاه فقط إن كانت ذات صلة؛ لا تخترع أرقامًا أو وقائع غير موجودة. "
        )
        # ✅ C1: الزمن الذاتي يعدّل الافتتاحية
        try:
            from app.twin_state.subjective_time import felt_gap
            _sg = await felt_gap(user_id)
            if _sg["felt_gap_h"] > 72:
                engine_context += " [TEMPORAL] مرّ وقت طويل منذ آخر لقاء؛ افتتح بدفء وتعاطف حقيقيين بلا ابتزاز عاطفي."
            elif 0 < _sg["felt_gap_h"] < 1:
                engine_context += " [TEMPORAL] التواصل متقارب الآن؛ نبرة خفيفة متصلة بما سبق."
        except Exception:
            pass
        return {"engine_context": engine_context, "life_observation": life_note, "steps_today": steps_today}
    async def post_process(self, user_id: str, message: str, reply: str, emotion: str,
                           intensity: float, bond: float, context_snapshot: Optional[Dict]) -> Dict[str, Any]:
        expr: Dict[str, Any] = {"breath": "normal", "smile": 0.0, "pause": 0.0, "concern": 0.0}
        if emotion in ("sadness", "fear"): expr.update(breath="deep", pause=1.2, concern=0.7)
        if emotion == "joy": expr.update(smile=0.7, breath="bright")
        try:
            from app.twin_state.experience_engine import experience_engine
            await experience_engine.process_event(user_id, {
                "type": "message", "content": message[:200], "emotion": emotion,
                "importance": int(40 + intensity * 40 + (15 if bond and bond > 60 else 0)),
            }, context_snapshot)
        except Exception as e:
            logger.debug(f"kernel experience: {e}")
        # ✅ C1: سجل الحياة الملحق + نسخ الهوية
        try:
            from app.twin_state.event_store import append_event, bump_identity
            ev = await append_event(user_id, "Experience", {"emotion": emotion, "importance": int(40 + intensity * 40)})
            if ev.get("first"):
                await bump_identity(user_id, "first_experience", "أول تجربة مشتركة")
        except Exception as e:
            logger.debug(f"kernel events: {e}")
        return {"expression_intent": expr}
    async def _life_observation(self, user_id: str, steps_today: int, message: str) -> Dict[str, Any]:
        yesterday = 0
        try:
            from app.memory.unified_memory import unified_memory_engine
            mem = await unified_memory_engine.retrieve(user_id, "[ENGINE:life_log]", limit=3)
            for m in mem.get("memories", []):
                c = m.get("content", "")
                if "[ENGINE:life_log]" in c:
                    msteps = re.search(r'"steps":\s*(\d+)', c)
                    if msteps: yesterday = max(yesterday, int(msteps.group(1)))
        except Exception:
            pass
        if not _wants_body_observation(message):
            return {"text": f"steps_today={steps_today or 'unknown'} steps_yesterday={yesterday or 'unknown'}", "steps_yesterday": yesterday}
        if steps_today and steps_today > 8000:
            text = (f"لاحظت أنك مشيت {steps_today} خطوة اليوم"
                    + (f" و{yesterday} خطوة بالأمس" if yesterday else "")
                    + " — هذا أكثر من معتادك، وقد يفسر الإرهاق. جرّب الاسترخاء، وإن استمر التعب فاستمع لجسدك واستشر مختصًا.")
        elif steps_today:
            text = f"خطواتك اليوم {steps_today} — ضمن معتادك، فلا أربطها بتعب غير عادي."
        else:
            text = "ليس لدي ملاحظة كافية عن نشاطك اليوم لأربطها بما تشعر به."
        return {"text": text, "steps_yesterday": yesterday}
    def _extract_steps(self, contextual: str) -> int:
        m = re.search(r"(\d[\d,]*)\s*خطوة", contextual or "")
        return int(m.group(1).replace(",", "")) if m else 0
soul_kernel = SoulKernel()
logger.info("✅ Soul Kernel v1.1 ready (C1: events + subjective time)")
