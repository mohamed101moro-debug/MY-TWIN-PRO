# MyTwin S5 — Cognitive Core Consolidation

## Scope
S5 consolidates the conversational backbone and establishes the first production-oriented Presence Client boundary without creating a second cognitive engine.

### Closed in S5
- `/api/chat` is the sole production conversational endpoint.
- The obsolete `/api/v2/chat` unified-chat route was removed rather than left disabled.
- Frontend lifecycle observation is evidence-only (`LIFE_EVIDENCE`).
- Lifecycle classification is deterministic and backend-authoritative.
- `TwinInternalState` remains the sole persistence authority.
- `CognitiveState` is a bounded projection contract, not a second state store.
- `/api/twin/state` derives identity from the authenticated JWT instead of a caller-supplied user id.
- `PresenceClient` owns device sensor projection; `PresenceBridge` coordinates lifecycle/presentation rather than sensor interpretation.

## Canonical interaction path

```text
Device / UI
  -> PresenceClient / chat request
  -> /api/chat
  -> SoulKernel InteractionPipeline (when active)
  -> UnifiedTwinBrain
  -> Memory / Identity / Relationship / Cognitive Context
  -> TwinInternalState
  -> response + cognitive_state
  -> StateBus
  -> Presence rendering
```

## Lifecycle evidence path

```text
Sensors + device lifecycle
  -> LIFE_EVIDENCE
  -> LifeIntentionBridge
  -> POST /api/twin/life-intention
  -> normalize_evidence
  -> derive_lifecycle_intention
  -> derive_meaning
  -> TwinInternalState persistence
  -> PresenceBinding
  -> StateBus
```

The frontend does not classify `rest`, `reduce_presence`, or `stay_present` anymore.

## Explicit non-goals
S5 does not claim subjective consciousness. It does not add autonomous action, dream generation, or a new emotion engine. Those require later policy/initiative stages.

## Verification
- S5 + S4.1 + S4 + S3 + Life Loop targeted suite: 30/30 PASS.
- Python compileall: PASS.
- AppState lifecycle verifier: 9/9 PASS.
- Dormant engine safety verifier: all PASS.
- Life Loop closure verifier: all PASS.
- Reconciled backbone verifier: 12/12 PASS.

## External gates still required
Real Railway/Supabase migration + restart verification, complete TypeScript dependency-resolved typecheck, and EAS/mobile runtime verification remain release gates. This package is an integrated release candidate, not a production-verified build.


## Local privacy supersession — 2026-10-08

The sensor-backed device-projection descriptions above are historical architecture notes. In the current local hardening pass, automatic camera, microphone, location, motion, pedometer, calendar, and cloud-perception collection is disabled; native permissions and plugins for those inputs are removed from the app manifest, and the remaining production voice path is output-only TTS. Do not use the historical sensor paths as the current release contract. Any future input feature requires an explicit consent flow, purpose/retention disclosure, and new native permission review before reactivation.
