# MyTwin — Life Loop Closure Engineering Report

Date: 2026-09-25
Source tree: `MY-TWIN-PRO-main`

## Scope

This closure implements only the contract approved in the Grok review:

- persist `last_life_intention` as canonical internal state;
- consume lifecycle intention in the backend brain scheduler as **evidence**, never as a direct command;
- remove random new-user internal-state defaults;
- make `LifeRhythmEngine.start()` idempotent;
- preserve lifecycle evidence emitted before login and flush it after `refreshUser()`;
- exclude `[ENGINE:*]` records from normal conversational memory retrieval while retaining explicit engine-output retrieval;
- keep the orphan `life_intentions.py` route unregistered;
- no new engines, dream generation, surprise generation, personality expansion, sensors, TWIN_SPEAK, or user-visible initiative were added.

## Canonical lifecycle path

```text
Sensors / rhythm evidence
        ↓
ExistenceLoop
        ↓
LIFE_EVIDENCE
        ↓
LifeIntentionBridge
        ↓
POST /api/twin/life-intention
        ↓
twin_internal_states.last_life_intention (JSONB)
        ↓
BrainScheduler._process_life_intention()
        ↓
bounded internal-state effect only
        ↓
Presence / future cognition can observe state
```

## Evidence-only brain contract

Accepted intentions:

- `observe` → no user-visible action; records `observe_only`.
- `stay_present` → records `maintain_presence`; no speech or autonomous event.
- `reduce_presence` → bounded energy reduction, minimum `0.2`.
- `rest` → bounded rest state through energy cap at `0.35`.

Each processed intention is marked with `processed_at`, `backend_effect`, and `source_of_truth=internal_state` inside the canonical JSONB payload. This prevents repeated application after scheduler restarts without introducing a second source of truth.

Explicitly forbidden in this closure path:

- `TWIN_SPEAK`
- dream generation
- surprise presentation
- direct mood synthesis
- automatic user-visible initiative

## Persistence

`backend/migrations/20260925_add_last_life_intention.sql` adds:

```sql
last_life_intention JSONB
```

The API now fails with HTTP 503 instead of acknowledging `accepted` when canonical persistence fails.

`store_engine_output(..., "life_intention", ...)` remains an audit/engine trace only and is not the canonical state consumed by the brain.

## Session timing

`LifeIntentionBridge` buffers the latest lifecycle intention while `session.userId` is empty. `BootstrapCoordinator.refreshUser()` calls `onSessionReady()` so the buffered evidence is flushed after authentication. The five-minute dedupe window therefore does not silently discard the first pre-login evidence event.

## Memory isolation

Normal `unified_memory.retrieve()` now excludes records whose `expressed_text` begins with `[ENGINE:`. Engine consumers explicitly request `include_engine_outputs=True` through `get_engine_outputs()`.

This prevents lifecycle/engine traces from becoming visible conversational memories.

## New-user defaults

When no internal-state row exists:

- mood = `unknown`
- energy = `0.5`
- curiosity = `0.5`
- bond depth = `0.0`
- life intention = `null`

No random mood selection remains in `TwinInternalState.get_state()`.

## Verification performed

### Passed

- `python3 scripts/verify_life_loop_closure.py`
- `python3 scripts/verify_dormant_engine_safety.py`
- `python3 scripts/verify_appstate_lifecycle.py`
- `python3 -m compileall -q backend/app backend/tests`
- focused Life Loop tests: **3 passed**
- integration import test: **1 passed**
- Soul Core conformance: **6 passed** when run as a dedicated pytest invocation
- TypeScript/TSX syntax transpile: **220 source files, 0 diagnostics** (declaration file excluded because TypeScript 5.8's isolated `transpileModule` cannot emit it)

### Not claimed

- full `tsc --noEmit` — project dependency/type environment is incomplete in this runtime;
- production EAS/device build;
- real Supabase production roundtrip against the user's database;
- full backend test suite, because the runtime lacks some project dependencies (including `slowapi`/Supabase package in the isolated environment).

The focused roundtrip test uses a fake database to prove the state serialization path, not a live production database.

## Closure status

The lifecycle evidence loop is now **closed at the persistence + backend-evidence interpretation boundary** without granting the lifecycle signal authority to speak, dream, surprise, or initiate user-visible behavior.

This is not a Production Release claim. Device/EAS validation and a real Supabase migration/application remain required before production deployment.
