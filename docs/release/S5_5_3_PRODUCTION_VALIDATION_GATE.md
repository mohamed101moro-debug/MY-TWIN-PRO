# S5.5.3 — Production Validation Gate

## Purpose

S5.5.3 is not a feature release. It is the execution gate that proves the
S5.5.2 lifecycle contract in the real deployment environment before S6.

The contract is:

`Evidence → canonical meaning → atomic PostgreSQL commit → acknowledgement → durable continuation`

## Gate A — Supabase / PostgreSQL

Run:

```bash
MYTWIN_VALIDATION_ALLOW_WRITE=true \
MYTWIN_VALIDATION_USER_ID=<dedicated-validation-user-uuid> \
python scripts/validate_s5_5_3_production_gate.py
```

The script proves:

- Supabase connectivity.
- `lifecycle_intention_receipts` exists.
- `commit_twin_life_intention` is callable with service role.
- exact retry does not advance `continuity_revision`.
- two legitimate concurrent events are not collapsed into one.
- concurrent revisions are consecutive under the PostgreSQL advisory lock.
- persisted state matches the latest committed revision.

Use a dedicated validation user. The script intentionally requires an explicit
write opt-in and must not be run against an unrelated production user.

## Gate B — Railway restart

1. Send a lifecycle event through the deployed API.
2. Record `continuity_revision`, `last_life_intention`, `brain_meaning`, and
   continuity fields.
3. Restart/kill the Railway process.
4. Read `/api/twin/state` after restart.
5. Require byte-level/semantic equality of the recorded canonical fields.

Result: PASS/FAIL with deployment ID and timestamps.

## Gate C — Network interruption / durable queue

On a real Android build:

1. Create evidence while online.
2. Disable network before acknowledgement.
3. Confirm the evidence remains in the durable queue.
4. Terminate the app.
5. Reopen it while offline.
6. Confirm the queue still exists.
7. Restore network.
8. Confirm the server acknowledges the item exactly once.
9. Confirm the queue item is removed only after acknowledgement.

## Gate D — EAS / Android lifecycle

Required path:

`foreground → background → OS termination → reopen → bootstrap → queue flush → canonical state restore`

No PASS can be declared from Expo development mode alone.

## Gate E — Multi-day continuity

At least 72 hours across multiple app sessions:

- Day 1: interaction, experience, continuity commit.
- Day 2: app reopen and state restore.
- Day 3: new interaction that consumes prior continuity.

Verify:

- no fabricated memories;
- no continuity reset;
- no duplicate lifecycle revisions;
- no loss of durable evidence;
- identity remains the same entity.

## Exit criteria

S5.5.3 is PASS only when all critical gates A–E pass.

Until then the repository remains a **Production Validation Candidate**.
S6 capability expansion must not be used as a substitute for these proofs.
