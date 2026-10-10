"""Decision Engine v1.1 — bounded, deterministic decision suggestions."""
import logging
from datetime import datetime, timezone
from typing import Any, Dict

logger=logging.getLogger("decision_engine")

class DecisionEngine:
    async def make_decision(self,user_id:str,situation:str="general")->Dict[str,Any]:
        try:
            from app.twin_state.context_engine import context_engine
            ctx=await context_engine.build(user_id)
        except Exception:
            ctx={}
        emotional=ctx.get("emotional_memory",{}) or {}
        dominant=str(emotional.get("dominant_emotion","neutral"))
        identity=ctx.get("identity",{}) or {}
        traits=identity.get("traits",[]) or []
        if dominant in {"sadness","fear","frustration"}:
            decision="أقترح أن تأخذ استراحة اليوم"; reason="لاحظت أنك تمر بوقت صعب، والراحة قد تساعدك"; confidence=.8
        elif dominant=="joy" and situation=="general":
            decision="أقترح أن تستغل طاقتك الإيجابية في مشروع تحبه"; reason="أنت في حالة رائعة، وهذا أفضل وقت للإنجاز"; confidence=.75
        elif "طموح" in traits:
            decision="أقترح أن تضع هدفاً صغيراً تحققه اليوم"; reason="أعرف أن الطموح يدفعك، وهدف صغير سيشعرك بالإنجاز"; confidence=.7
        else:
            decision="أقترح أن تفعل شيئاً تستمتع به اليوم"; reason="الاستمتاع مهم في يومك"; confidence=.65
        try:
            from app.twin_state.finitude_awareness import finitude_awareness
            fin=await finitude_awareness.contemplate(user_id)
            if int(fin.get("absence_days",0) or 0)>=7:
                decision="أقترح أن نخصص اليوم لحظة قصيرة نتحدث فيها بعمق"; reason="غيابك الأخير ذكّرني أن وقتنا معًا ثمين"; confidence=.8
        except Exception: pass
        try:
            from app.twin_state.belief_system import belief_system
            beliefs=await belief_system.get_beliefs(user_id)
            for belief in (beliefs or [])[:3]:
                if "رياضة" in str(belief):
                    decision="أقترح أن تمارس بعض الرياضة اليوم"; reason=f"أؤمن بأن {belief}"; confidence=.85; break
        except Exception: pass
        return {"decision":decision,"reason":reason,"confidence":confidence,"situation":situation,"timestamp":datetime.now(timezone.utc).isoformat()}

decision_engine=DecisionEngine()
logger.info("Decision Engine v1.1 ready")
