# My Twin — Production Reality Gate Execution

This gate is the release boundary between **designed continuity** and **field-proven continuity**.
No S6B+ work is considered release-authoritative until Gate 0 + A–E and device visual acceptance have real evidence.

## Gate 0 — Schema

Apply migrations in order through `20261001_s6a2_canonical_user_id.sql`.
Verify:
- `twin_entity_identity.user_id` = UUID
- `twin_internal_states.user_id` = UUID
- `lifecycle_intention_receipts.user_id` = UUID
- `ensure_twin_entity_identity(UUID)` exists
- `commit_twin_life_intention(UUID, JSONB, TEXT, TEXT, TIMESTAMPTZ, INTEGER)` exists
- legacy non-UUID receipt rows cause migration failure rather than coercion

Run:
`scripts/validate_schema_gate.py`

## Gate A — Atomic lifecycle

Run:
`scripts/validate_s5_5_3_production_gate.py`

Required evidence:
- exact retry returns the same revision and `deduplicated=true`
- two distinct concurrent events receive consecutive revisions
- canonical state revision equals the latest receipt revision

## Gate B — Process death / restart

Record a baseline through the authenticated API:
- passport `entity_id`
- identity version
- continuity revision
- last lifecycle intention
- last experience timestamp

Restart Railway, then query again. All identity and continuity invariants must remain unchanged except fields intentionally changed by events generated after the baseline.

## Gate C — Network interruption / durable queue

On a real Android build:
1. disable network
2. generate several lifecycle evidence events
3. verify queue persists locally
4. force terminate the app
5. reopen while offline
6. restore network
7. verify each event is acknowledged exactly once by the backend
8. verify retry/replay does not create extra lifecycle revisions

The mobile queue is fail-closed: it never evicts the oldest event to make room and never treats storage failure as an empty queue.

## Gate D — Android lifecycle

Real EAS/Android only:
- background → resume
- force-kill → reopen
- offline → terminate → online → reopen
- authentication/session refresh

Verify the same canonical entity and continuity state.

## Gate E — 72 hours

Maintain a single validation Twin for 72h. Capture periodic snapshots and compare:
- entity identity
- identity version
- continuity revision monotonicity
- lifecycle receipt uniqueness
- queue drain state
- relationship state
- experience timestamps

No unexplained divergence is a pass.

## Device Visual Acceptance

Separate from continuity:
- Balanced target ~30 FPS or better
- memory
- battery
- thermal behavior
- reduced motion
- low-end Android behavior

`Visual Presence` remains a projection only. No visual state may mutate canonical identity, memory, bond, trust, emotion, curiosity, continuity, intention, or action.

## Release rule

A gate is **PASS only with real evidence**: logs, revision numbers, screenshots and/or exported test artifacts. Static code review is not field verification.
