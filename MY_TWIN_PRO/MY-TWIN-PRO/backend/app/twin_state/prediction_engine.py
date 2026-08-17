"""Prediction Engine v1.1 — تنبؤ + PredictionMade + حفظ آخر تنبؤ (حلقة التعلم)."""
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
logger = logging.getLogger("prediction_engine")
class PredictionEngine:
    async def predict_tomorrow(self, user_id: str) -> Dict[str, Any]:
        try:
            from app.twin_state.context_engine import context_engine
            ctx = await context_engine.build(user_id)
            prediction = {
                "predicted_mood": await self._predict_mood(ctx),
                "suggested_topics": await self._suggest_topics(ctx),
                "likely_interaction_time": await self._predict_time(ctx),
                "recommendation": await self._generate_recommendation(ctx),
                "confidence": 0.65,
            }
            try:
                from app.twin_state.event_store import append_event
                await append_event(user_id, "PredictionMade", {"mood": prediction["predicted_mood"], "confidence": prediction["confidence"]})
                from app.twin_state.internal_state import twin_internal_state as _ist
                await _ist.update_field(user_id, "last_prediction", {"mood": prediction["predicted_mood"], "ts": datetime.now(timezone.utc).isoformat()})
            except Exception:
                pass
            try:
                from app.events.event_bus import emit
                await emit({"type": "prediction_completed", "user_id": user_id, "prediction": prediction, "timestamp": datetime.now(timezone.utc).isoformat()})
            except Exception:
                pass
            return prediction
        except Exception as e:
            logger.warning(f"Prediction failed for {user_id}: {e}")
            return {"predicted_mood": "neutral", "suggested_topics": [], "recommendation": "يوم جديد مليء بالإمكانيات!"}
    async def _predict_mood(self, ctx: Dict) -> str:
        emotional = ctx.get("emotional_memory", {})
        if not emotional:
            return "neutral"
        dominant = emotional.get("dominant_emotion", "neutral")
        for p in emotional.get("patterns", []):
            if "evening" in str(p) and "sadness" in str(p):
                return "sadness"
        return dominant
    async def _suggest_topics(self, ctx: Dict) -> List[str]:
        topics = []
        recent = ctx.get("recent_chat", [])
        if recent:
            text = " ".join([m.get("content", "") for m in recent[:10] if m.get("role") == "user"])
            for kw in ["عمل", "دراسة", "رياضة", "عائلة", "سفر", "صحة", "ترفيه", "علاقات"]:
                if kw in text:
                    topics.append(kw)
        return (topics or ["يومك", "مشاعرك", "خططك"])[:3]
    async def _predict_time(self, ctx: Dict) -> Optional[str]:
        recent = ctx.get("recent_chat", [])
        hours = []
        for m in recent:
            ts = m.get("timestamp", "")
            if ts:
                try:
                    hours.append(datetime.fromisoformat(ts).hour)
                except Exception:
                    pass
        if hours:
            h = int(sum(hours) / len(hours))
            return f"{h}:00 - {h+2}:00"
        return None
    async def _generate_recommendation(self, ctx: Dict) -> str:
        dominant = ctx.get("emotional_memory", {}).get("dominant_emotion", "neutral")
        recs = {
            "sadness": "غدًا قد يكون يومًا أنسب للراحة والعناية بنفسك. أنا هنا لدعمك.",
            "joy": "طاقتك الإيجابية ستستمر غدًا! استغلها في شيء تحبه.",
            "fear": "لا تقلق، مهما كان ما يقلقك، يمكننا مواجهته معًا.",
            "neutral": "غدًا يوم جديد مليء بالفرص. أنا بانتظارك.",
        }
        return recs.get(dominant, recs["neutral"])
prediction_engine = PredictionEngine()
logger.info("✅ Prediction Engine v1.1 ready (PredictionMade + outcome learning)")
