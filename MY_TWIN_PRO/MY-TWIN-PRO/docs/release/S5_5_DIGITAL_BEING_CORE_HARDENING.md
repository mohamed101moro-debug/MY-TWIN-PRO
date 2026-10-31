# MyTwin S5.5 — Digital Being Core Hardening

## Purpose

S5.5 hardens the S0→S5 cognitive/life backbone without introducing another
state store or another cognitive engine.

The goal is to make the existing core behave as one persistent digital-being
backbone: backend state is authoritative, the device supplies evidence and
renders presence, and lifecycle ingestion is deterministic and idempotent.

## Closed in S5.5

- Lifecycle classification is backend-only. A client-supplied `intention` is
  compatibility input and is never authoritative.
- Repeated lifecycle evidence with the same persisted `intention_id` is
  idempotent and does not advance continuity a second time.
- Existing S4 continuity schema remains backward compatible at `s4.0` while
  S5.5 hardens the contract; no second persistence store was introduced.
- Frontend memory events no longer manufacture curiosity, emotion bias, or
  relationship gains locally.
- Frontend recovery no longer invents inner speech or relationship changes.
- Chat response expression metadata is projected by the backend response path;
  the chat hook no longer mutates relationship/emotional state from UI hints.
- Static architecture gate `verify_s5_5_core_hardening.py` prevents the known
  local cognitive mutation regressions.

## Canonical flow

```text
Device / OS / sensors
        ↓
Normalized evidence
        ↓
LifeIntentionBridge
        ↓
/api/twin/life-intention
        ↓
backend lifecycle classification
        ↓
TwinInternalState
        ↓
Meaning + continuity + persistence
        ↓
Presence Binding / Cognitive Projection
        ↓
StateBus / renderer / voice / haptics
```

## What S5.5 deliberately does not claim

S5.5 is not Production Verified. Real Railway/Supabase restart, production
migrations, EAS/mobile runtime, dependency-complete TypeScript checking, and
multi-device failure testing remain external release gates.

The backend test suite in the current build environment cannot be collected
fully because the environment lacks the declared `slowapi` dependency. This
is an environment/dependency gate, not a hidden test failure.
