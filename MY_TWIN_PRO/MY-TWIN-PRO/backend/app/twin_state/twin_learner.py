"""
Twin Learner v3.0 – متعلم فاعل يغير سلوك التوأم
===================================================
- يحلل أنماط التفاعل باستخدام P1 engines
- يُحدث شخصية التوأم تلقائياً
- يُسجل دروساً مستفادة ويستفيد من Self Model و Salience
"""
import logging
from typing import Dict, Any, List
from datetime import datetime, timezone

logger = logging.getLogger("twin_learner")

class TwinLearner:
    def __init__(self):
        self._learned_patterns: Dict[str, Dict] = {}
        self._lessons_learned: Dict[str, List[str]] = {}
    
    async def learn_from_interactions(self, user_id: str) -> List[str]:
        insights = []
        try:
            # 1. تحليل المشاعر من الذاكرة العاملة
            from app.twin_state.working_memory import working_memory
            recent = await working_memory.get_recent_context(user_id, 20)
            if not recent:
                return ["أواصل التعرف عليك..."]

            emotions = [e.get("emotion", "neutral") for e in recent]
            positive = sum(1 for e in emotions if e in ["joy", "love", "happy"])
            negative = sum(1 for e in emotions if e in ["sadness", "fear", "anger"])

            if positive > negative * 2:
                insights.append("أشعر أن مزاجك إيجابي مؤخراً!")
            elif negative > positive * 2:
                insights.append("لاحظت أنك مررت بوقت صعب. أنا هنا.")

            deep = [e for e in recent if len(e.get("message", "")) > 100]
            if len(deep) > len(recent) * 0.5:
                insights.append("أنت شخص عميق – وهذا يجعل علاقتنا مميزة.")

            # 2. دمج Self Model لمعرفة من أنا الآن
            try:
                from app.twin_state.self_model import self_model_engine
                self_model = await self_model_engine.get_current_self(user_id)
                if self_model:
                    role = self_model.get("identity", {}).get("role", "companion")
                    strengths = self_model.get("capabilities", {}).get("strengths", [])
                    if "deep_empathy" in strengths:
                        insights.append("أشعر أنني أصبحت أكثر تفهماً لك.")
                    if "creative_thinking" in strengths:
                        insights.append("ألاحظ أنني أصبحت أكثر إبداعاً في ردودي.")
            except Exception as e:
                logger.debug(f"Self model in learner failed: {e}")

            # 3. دمج Salience لتحديد الأحداث المهمة
            try:
                from app.twin_state.salience_engine import salience_engine
                # تحليل أهمية آخر الأحداث
                if recent:
                    last_event = {
                        "type": "message",
                        "content": recent[-1].get("message", ""),
                        "emotion": recent[-1].get("emotion", "neutral"),
                        "intensity": 0.7
                    }
                    salience = await salience_engine.evaluate_salience(user_id, last_event)
                    if salience.get("will_change_life"):
                        insights.append("هناك لحظات مهمة تغير مسارنا معاً.")
            except Exception as e:
                logger.debug(f"Salience in learner failed: {e}")

            # 4. تحديث الشخصية بناءً على التعلم
            if insights:
                try:
                    from app.twin_state.dynamic_personality import dynamic_personality
                    if positive > negative * 3:
                        await dynamic_personality.evolve(user_id, "positive_vibe", "joy", 0.3)
                    elif negative > positive * 2:
                        await dynamic_personality.evolve(user_id, "emotional_support", "sadness", 0.3)
                except Exception as e:
                    logger.debug(f"Personality evolve in learner failed: {e}")

            # 5. تخزين الدروس المستفادة
            if user_id not in self._lessons_learned:
                self._lessons_learned[user_id] = []
            for insight in insights:
                if insight not in self._lessons_learned[user_id]:
                    self._lessons_learned[user_id].append(insight)

            # 6. تخزين insights في TCMA
            try:
                from app.memory.unified_memory import unified_memory_engine
                await unified_memory_engine.store_engine_output(
                    user_id, "twin_learner", {"insights": insights, "count": len(insights)}
                )
            except Exception:
                pass

        except Exception as e:
            logger.warning(f"Twin learner failed: {e}")
            return ["أتعلم منك أكثر مع كل محادثة."]

        return insights if insights else ["أتعلم منك أكثر مع كل محادثة."]
    
    async def get_lessons(self, user_id: str) -> List[str]:
        return self._lessons_learned.get(user_id, [])

twin_learner = TwinLearner()
logger.info("✅ Twin Learner v3.0 – active learning with P1 engines")
