# MyTwin — Integrated S0 → S4 Release Candidate

## Baseline
This release is built as one cumulative project tree from the original `MY-TWIN-PRO-main` baseline. It is not a patch-only package.

## Included stages
- S0: original project baseline and existing architecture preserved.
- S2.1 / S2.1.1: canonical lifecycle persistence closure, bounded/idempotent lifecycle effect, fail-closed persistence, list-contract fix.
- S3: deterministic evidence normalization and meaning derivation at ingestion.
- S3P: authoritative backend presence binding and meaning-to-body projection.
- S4: persistent cognitive continuity using the canonical `twin_internal_states` record.

## S4 contract
The canonical persistent state now carries:
- `last_thought`
- `last_thought_at`
- `last_experience_at`
- `pending_questions`
- `cognitive_load`
- `curiosity`
- `continuity_revision`
- `continuity_schema_version`

The brain reads this state on every conversation turn. The state survives process restart because it is read from the database-backed canonical state, not process memory.

S4 does not claim subjective consciousness. The continuity marker is an evidence-grounded internal state trace.

## Critical flow
`device evidence → backend normalization → deterministic meaning → canonical state → presence binding → StateBus → PresenceEngine`

and:

`persisted continuity → UnifiedTwinBrain → response strategy → interaction → synchronous continuity commit → persisted continuity`

## Verification performed in this environment
- Targeted S2.1.1 + S3 + S3P + S4 tests: **19 passed**.
- Python `compileall`: **PASS**.
- ZIP integrity: verified when packaged.

## Not verified here
- Live Railway → Supabase round-trip.
- EAS Android/iOS build.
- Full TypeScript typecheck (the uploaded project does not contain `node_modules`; the environment also lacks Expo/RN type packages).
- Full backend test collection remains blocked by two pre-existing environment/baseline issues: `slowapi` is not installed in this execution environment, and `backend/tests/test_memory_engine.py` references a legacy `backend.memory_engine` module absent from the project tree.

## Deployment gate
Do not call this Production Verified until the S2.1 Railway/Supabase round-trip and the mobile build/runtime checks pass against the deployed environment.


## S4.1 Canonical Life Path Closure

S4.1 removes the obsolete unregistered lifecycle writer modules and adds regression tests ensuring `/api/twin/life-intention` is the sole lifecycle ingestion path. See `docs/release/S4_1_CANONICAL_LIFE_PATH.md`.
