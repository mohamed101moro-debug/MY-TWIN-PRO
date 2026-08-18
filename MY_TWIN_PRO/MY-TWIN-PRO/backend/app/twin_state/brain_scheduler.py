"""Brain Scheduler v4.0 — حياة داخلية كاملة: حلقات لكل مستخدم، بلا كتل ميتة."""
import logging, asyncio, time
from datetime import datetime, timezone, timedelta
from typing import List, Set
logger = logging.getLogger("brain_scheduler")
class BrainScheduler:
    def __init__(self):
        self._running = False
        self._tasks: List[asyncio.Task] = []
        self._processed_light: Set[str] = set(); self._processed_hourly: Set[str] = set(); self._processed_daily: Set[str] = set()
        self._last_light_reset = datetime.now(timezone.utc); self._last_hourly_reset = datetime.now(timezone.utc); self._last_daily_reset = datetime.now(timezone.utc)
    async def start(self):
        if self._running: return
        self._running = True
        self._tasks.append(asyncio.create_task(self._run_loop("light", 600, self._light_cycle)))
        self._tasks.append(asyncio.create_task(self._run_loop("hourly", 3600, self._hourly_cycle)))
        self._tasks.append(asyncio.create_task(self._run_loop("daily", 86400, self._daily_cycle)))
        self._tasks.append(asyncio.create_task(self._run_loop("engine", 1800, self._engine_cycle)))
        logger.info("🧠 Brain Scheduler v4.0 started")
    async def stop(self):
        self._running = False
        for t in self._tasks: t.cancel()
        self._tasks.clear()
    async def _run_loop(self, name, interval, coro):
        while self._running:
            try:
                await asyncio.sleep(interval); t0 = time.time(); await coro()
                logger.info(f"⏰ {name} cycle done ({time.time()-t0:.1f}s)")
            except asyncio.CancelledError: break
            except Exception as e: logger.error(f"❌ {name} cycle crashed: {e}")
    async def _get_active_users(self) -> List[str]:
        ids: Set[str] = set()
        try:
            from app.infrastructure.database.supabase_client import get_db
            db = get_db()
            cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
            for table, col in (("user_devices", "last_active"), ("working_memory", "created_at"), ("twin_events", "ts")):
                try:
                    r = db.table(table).select("user_id").gte(col, cutoff).execute()
                    ids |= set(x["user_id"] for x in (r.data or []))
                except Exception: pass
        except Exception: pass
        return list(ids)
    def _reset_debounce_if_needed(self, cycle: str):
        now = datetime.now(timezone.utc)
        if cycle == "light" and (now - self._last_light_reset).seconds > 600: self._processed_light.clear(); self._last_light_reset = now
        elif cycle == "hourly" and (now - self._last_hourly_reset).seconds > 3600: self._processed_hourly.clear(); self._last_hourly_reset = now
        elif cycle == "daily" and (now - self._last_daily_reset).days >= 1: self._processed_daily.clear(); self._last_daily_reset = now
    async def _light_cycle(self):
        self._reset_debounce_if_needed("light")
        for uid in (await self._get_active_users())[:10]:
            if uid in self._processed_light: continue
            self._processed_light.add(uid)
            try:
                from app.twin_state.internal_state import twin_internal_state
                st = await twin_internal_state.get_state(uid)
                st["energy_level"] = min(1.0, st.get("energy_level", 0.5) + 0.005)
                await twin_internal_state._save_state(uid, st)
            except Exception as e: logger.debug(f"Light/energy {uid}: {e}")
            try:
                from app.twin_state.unified_curiosity import unified_curiosity_engine
                q = await unified_curiosity_engine.generate(uid)
                if q:
                    from app.twin_state.internal_state import twin_internal_state
                    await twin_internal_state.add_pending_question(uid, q)
            except Exception as e: logger.debug(f"Light/curiosity {uid}: {e}")
            try:
                from app.twin_state.finitude_awareness import finitude_awareness
                fin = await finitude_awareness.contemplate(uid)
                if fin.get("absence_days", 0) >= 3:
                    from app.twin_state.internal_state import twin_internal_state
                    await twin_internal_state.add_pending_question(uid, f"💭 {fin['note_ar']}")
            except Exception as e: logger.debug(f"Light/void {uid}: {e}")
    async def _hourly_cycle(self):
        self._reset_debounce_if_needed("hourly")
        for uid in (await self._get_active_users())[:5]:
            if uid in self._processed_hourly: continue
            self._processed_hourly.add(uid)
            for label, fn in (("reflection", self._h_reflect), ("unified", self._h_unified), ("monitor", self._h_monitor), ("identity", self._h_identity), ("decision", self._h_decision), ("proactive", self._h_proactive)):
                try: await fn(uid)
                except Exception as e: logger.debug(f"Hourly/{label} {uid}: {e}")
    async def _h_reflect(self, uid):
        from app.twin_state.self_reflection import self_reflection
        t = await self_reflection.reflect(uid)
        if t:
            from app.twin_state.internal_state import twin_internal_state; await twin_internal_state.set_last_thought(uid, t)
    async def _h_unified(self, uid):
        from app.twin_state.unified_consciousness import unified_consciousness
        m = await unified_consciousness.moment_of_awareness(uid)
        if m:
            from app.twin_state.internal_state import twin_internal_state
            if m.get("unified_summary"): await twin_internal_state.set_last_thought(uid, m["unified_summary"])
            for q in (m.get("questions") or [])[:2]: await twin_internal_state.add_pending_question(uid, q)
    async def _h_monitor(self, uid):
        from app.twin_state.self_monitor import self_monitor
        o = await self_monitor.check_quality(uid)
        if o:
            from app.twin_state.internal_state import twin_internal_state; await twin_internal_state.add_pending_question(uid, f"🔍 {o}")
    async def _h_identity(self, uid):
        from app.twin_state.identity_evolution import identity_evolution; await identity_evolution.evolve_if_ready(uid)
    async def _h_decision(self, uid):
        from app.twin_state.decision_engine import decision_engine
        d = await decision_engine.make_decision(uid)
        if d and d.get("decision"):
            from app.twin_state.internal_state import twin_internal_state; await twin_internal_state.add_pending_question(uid, f"💡 {d['decision']}")
    async def _h_proactive(self, uid):
        from app.features.unified_proactive_engine import unified_proactive; await unified_proactive.pulse(uid)
    async def _daily_cycle(self):
        self._reset_debounce_if_needed("daily")
        for uid in (await self._get_active_users())[:3]:
            if uid in self._processed_daily: continue
            self._processed_daily.add(uid)
            for label, fn in (("decay", self._d_decay), ("fade", self._d_fade), ("compress", self._d_compress), ("dreaming", self._d_dream), ("milestone", self._d_milestone), ("belief", self._d_belief), ("consciousness", self._d_conscious), ("prediction", self._d_predict), ("onthisday", self._d_otd), ("simulator", self._d_sim), ("goals", self._d_goals), ("constitution", self._d_constitution)):
                try: await fn(uid)
                except Exception as e: logger.debug(f"Daily/{label} {uid}: {e}")
    async def _d_decay(self, uid):
        from app.memory.memory_decay import memory_decay_engine; await memory_decay_engine.decay_memories(uid)
    async def _d_fade(self, uid):
        from app.memory.conscious_forgetting import choose_to_fade; await choose_to_fade(uid)
    async def _d_compress(self, uid):
        from app.memory.memory_compressor import memory_compressor; await memory_compressor.compress(uid)
    async def _d_dream(self, uid):
        from app.twin_state.dreaming_engine import dreaming_engine
        d = await dreaming_engine.dream(uid)
        if d:
            from app.twin_state.internal_state import twin_internal_state; await twin_internal_state.set_last_thought(uid, f"حلمت الليلة: {d[:150]}")
    async def _d_milestone(self, uid):
        from app.twin_state.milestone_engine import milestone_engine
        m = await milestone_engine.check_milestones(uid)
        if m:
            from app.twin_state.internal_state import twin_internal_state; await twin_internal_state.add_pending_question(uid, f"🎉 {m}")
    async def _d_belief(self, uid):
        from app.twin_state.belief_system import belief_system; await belief_system.update_beliefs(uid)
    async def _d_conscious(self, uid):
        from app.twin_state.consciousness_engine import consciousness_engine
        s = await consciousness_engine.daily_summary(uid)
        if s:
            from app.twin_state.internal_state import twin_internal_state; await twin_internal_state.set_last_thought(uid, s)
    async def _d_predict(self, uid):
        from app.twin_state.prediction_engine import prediction_engine
        p = await prediction_engine.predict_tomorrow(uid)
        if p and p.get("recommendation"):
            from app.twin_state.internal_state import twin_internal_state; await twin_internal_state.add_pending_question(uid, f"🔮 {p['recommendation']}")
    async def _d_otd(self, uid):
        from app.memory.on_this_day import on_this_day_engine
        m = await on_this_day_engine.get_memory_for_today(uid)
        if m:
            from app.twin_state.internal_state import twin_internal_state; await twin_internal_state.add_pending_question(uid, f"📅 {m}")
    async def _d_sim(self, uid):
        from app.twin_state.relationship_simulator import relationship_simulator
        m = await relationship_simulator.check_for_milestone(uid)
        if m:
            from app.twin_state.internal_state import twin_internal_state; await twin_internal_state.add_pending_question(uid, m)
    async def _d_goals(self, uid):
        from app.twin_state.goal_evolution import goal_evolution
        r = await goal_evolution.evolve_goals(uid)
        if r:
            from app.twin_state.internal_state import twin_internal_state; await twin_internal_state.add_pending_question(uid, r)
    async def _d_constitution(self, uid):
        from app.twin_state.constitution_drift import get_weights; await get_weights(uid)
    async def _engine_cycle(self):
        users = (await self._get_active_users())[:5]
        if not users: return
        for uid in users:
            try:
                from app.memory.unified_memory import unified_memory_engine
            except Exception as e:
                logger.debug(f"Engine cycle {uid}: {e}"); continue
            try:
                from app.engine.energy.twin_energy_engine import twin_energy_engine
                tw = await twin_energy_engine.get_energy_state(uid)
                await unified_memory_engine.store_engine_output(uid, "twin_energy", {"energy": tw.get("energy"), "tone": (tw.get("response_behavior") or {}).get("tone")})
            except Exception as e: logger.debug(f"Engine/energy {uid}: {e}")
            try:
                from app.engine.goal.goal_engine import goal_engine
                await unified_memory_engine.store_engine_output(uid, "goal", goal_engine.determine_goal("normal", "neutral", 50, "friend", "morning", []))
            except Exception as e: logger.debug(f"Engine/goal {uid}: {e}")
            try:
                from app.engine.identity.identity_engine import identity_engine
                await unified_memory_engine.store_engine_output(uid, "identity", identity_engine.evaluate(bond_level=50, interaction_count=0, memory_count=0))
            except Exception as e: logger.debug(f"Engine/identity {uid}: {e}")
            try:
                from app.engine.reflection.reflection_engine import reflection_engine
                await unified_memory_engine.store_engine_output(uid, "reflection", {"text": reflection_engine.reflect(50, "friend")})
            except Exception as e: logger.debug(f"Engine/reflection {uid}: {e}")
brain_scheduler = BrainScheduler()
logger.info("✅ Brain Scheduler v4.0 ready (per-user loops + widened gate + living engine cycle)")
