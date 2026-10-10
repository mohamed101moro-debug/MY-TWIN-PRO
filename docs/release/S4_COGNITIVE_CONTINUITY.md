# S4 — Cognitive Continuity

## Objective
Make continuity a persistent canonical state rather than a process-local illusion.

## Design rules
1. No new core engine.
2. No random thought generation for continuity.
3. No frontend inference of cognitive meaning.
4. Continuity is read from `TwinInternalState` on every brain turn.
5. Critical interaction continuity is committed synchronously before chat response completion.
6. `pending_questions` is bounded to 10 at persistence and 5 at read/context surfaces.
7. `last_thought` is bounded to 1000 characters.
8. `cognitive_load` is bounded to [0,1].
9. `brain_meaning` remains separate from emotion, speech, and action.

## Restart proof
A continuity test writes Thought A, records a real interaction, constructs a new state instance (simulated process restart), and verifies that the next state retains Thought A plus the new experience marker.

## Database migration
Apply:
`backend/migrations/20260927_s4_cognitive_continuity.sql`

before deploying the S4 backend.
