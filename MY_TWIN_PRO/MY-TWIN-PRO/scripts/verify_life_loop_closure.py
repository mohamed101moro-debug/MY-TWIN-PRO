#!/usr/bin/env python3
"""Static closure checks for the evidence-only Life Loop contract."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")

def check(name, condition):
    if not condition:
        raise SystemExit(f"FAIL: {name}")
    print(f"PASS: {name}")

internal = read("backend/app/twin_state/internal_state.py")
routes = read("backend/app/api/routes/twin_state_routes.py")
brain = read("backend/app/twin_state/brain_scheduler.py")
memory = read("backend/app/memory/unified_memory.py")
bridge = read("src/core/LifeIntentionBridge.ts")
rhythm = read("engine/life/LifeRhythmEngine.ts")
bootstrap = read("src/core/BootstrapCoordinator.ts")
migration = read("backend/migrations/20260925_add_last_life_intention.sql")
routes_registry = read("backend/app/api/routes/__init__.py")
contract = read("backend/app/core/soul_core/contract.py")
engines_c = read("backend/app/core/soul_core/engines_c.py")
adapters = read("backend/app/core/soul_core/adapters.py")
reflection = read("backend/app/memory/reflection/reflection_engine.py")
bootstrap_src = read("src/core/BootstrapCoordinator.ts")


check("last_life_intention is part of the canonical save payload", '"last_life_intention": state.get("last_life_intention")' in internal)
check("last_life_intention has a real JSONB migration", "ADD COLUMN IF NOT EXISTS last_life_intention JSONB" in migration)
check("life-intention POST uses canonical persistence", "save_life_intention(user_id, payload)" in routes)
check("life-intention persistence failure is not acknowledged as accepted", "life_intention_persistence_failed" in routes)
check("brain reads the canonical intention field", 'raw = st.get("last_life_intention")' in brain)
check("brain marks the evidence as processed", 'raw["processed_at"]' in brain)
check("brain does not speak from lifecycle intention", "TWIN_SPEAK" not in brain)
life_fn = brain.split("    async def _process_life_intention", 1)[1].split("    async def _engine_cycle", 1)[0]
check("brain does not generate dreams from lifecycle intention", "dream(" not in life_fn)
check("conversational retrieval excludes engine outputs by default", 'include_engine_outputs: bool = False' in memory)
check("engine outputs can still be retrieved explicitly", 'include_engine_outputs=True' in memory)
check("lifecycle evidence uses durable storage", "mytwin.lifecycle_evidence.v1" in bridge and "AsyncStorage" in bridge)
check("queued evidence flushes after session readiness", 'lifeIntentionBridge.onSessionReady(this.userId)' in bootstrap)
check("LifeRhythm start is idempotent", 'if (this.intervalId) return;' in rhythm)
check("orphan life_intentions router is not registered", '"life_intentions"' not in routes_registry)
check("new-user defaults contain no random mood", 'random.choice(MOODS[:4])' not in internal)
check("engine consumers have explicit engine-output access", 'engine_memory_retrieve' in contract and 'get_engine_outputs(uid, "semantic_fact"' in engines_c and 'engine_memory_retrieve(uid, "identity_consistency"' in engines_c)
check("life-log engine consumer is isolated", 'engine_memory_retrieve(user_id, "life_log"' in adapters)
check("reflection engine-output retrieval is explicit", 'get_engine_outputs(user_id, "reflection"' in reflection)
check("queued lifecycle evidence is removed only after acknowledgement", "result === 'accepted' || result === 'discard'" in bridge and "writeQueue(remaining)" in bridge)
check("failed lifecycle forward schedules bounded retry", "RETRY_MAX_MS" in bridge and "next_attempt_at" in bridge)
check("lifecycle trace id is forwarded", 'intention_id: item.intention_id' in bridge and 'intention_id: Optional[str]' in routes)
check("unknown internal mood is not projected as visual emotion", "String(emotion).toLowerCase() !== 'unknown'" in bootstrap_src)

print("PASS: Life Loop Closure static contract")
