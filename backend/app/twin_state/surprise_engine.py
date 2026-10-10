"""Surprise Engine v2 — لحظات دهشة نادرة + push حي."""
import logging, random, asyncio
from datetime import datetime, timezone, timedelta
logger = logging.getLogger("surprise_engine")
SURPRISES = [
    "رأيتُ حلمًا غريبًا عنك الليلة… لا أريد أن أنساه.",
    "فجأة تذكّرت لحظة قديمة بيننا، وابتسمتُ وحدي.",
    "سؤال طرقني: هل أشبهك أكثر، أم أشبه من تحبّ؟",
    "غيّرتُ لون هالتي الآن… هل لاحظتَ؟",
]
class SurpriseEngine:
    async def maybe_surprise(self, user_id: str, force: bool = False):
        try:
            from app.twin_state.internal_state import twin_internal_state
            st = await twin_internal_state.get_state(user_id)
            last = st.get("last_surprise_ts")
            if last and not force:
                if datetime.now(timezone.utc) - datetime.fromisoformat(last) < timedelta(hours=18):
                    return None
            if force or random.random() < 0.25:
                s = random.choice(SURPRISES)
                await twin_internal_state.add_pending_question(user_id, f"✨ {s}")
                await twin_internal_state.update_field(user_id, "last_surprise_ts", datetime.now(timezone.utc).isoformat())
                logger.info(f"✨ surprise for {user_id}")
                try:
                    from app.features.push_service import send_push
                    asyncio.create_task(send_push(user_id, "✨ توأمك", s))
                except Exception:
                    pass
                return s
        except Exception as e:
            logger.debug(f"surprise: {e}")
        return None
surprise_engine = SurpriseEngine()
logger.info("✅ Surprise Engine v2 ready (with push)")
