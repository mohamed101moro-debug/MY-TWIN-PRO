# S4.1 — Canonical Life Path Closure

## Purpose

S4.1 closes the remaining lifecycle duplicate-writer path left outside S0→S4.
The project has one authoritative lifecycle ingestion contract:

`Frontend evidence → POST /api/twin/life-intention → TwinInternalState.save_life_intention() → deterministic meaning → persistent state → Presence Binding`

## Removed legacy writers

The following obsolete modules were removed because they were not part of the registered production route and represented a second lifecycle mutation model:

- `backend/app/api/routes/life_intentions.py`
- `backend/app/twin_state/life_intention_service.py`

The old service could mutate `energy_level` and `last_thought` independently of the canonical S3/S4 lifecycle contract. Keeping it would allow future callers to reintroduce conflicting state semantics.

## Canonical ownership

`TwinInternalState` remains the authoritative persistence boundary for lifecycle state. `LifeIntentionBridge` reports evidence only. The backend derives meaning and returns the canonical state projection. The scheduler may apply the bounded, explicitly defined lifecycle effect to the already-persisted canonical record; it does not create a second ingestion path.

## Regression protection

`backend/tests/test_s4_1_canonical_life_path.py` verifies:

- legacy lifecycle writer modules are absent;
- the API registry does not expose the old route;
- the frontend bridge targets only `/api/twin/life-intention`;
- the canonical endpoint persists through `save_life_intention()` and fails closed on persistence errors.

## Scope boundary

S4.1 does **not** remove the broader frontend engines. They remain scheduled for the later Presence Client / backend-authority migration. It also does not claim live Railway/Supabase or EAS verification.
