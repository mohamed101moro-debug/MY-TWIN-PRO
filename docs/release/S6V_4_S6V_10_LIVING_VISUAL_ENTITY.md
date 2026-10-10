# S6V.4–S6V.10 — Living Visual Entity Production Track

Status: **implemented in the integrated tree; real-device acceptance remains gated by S5.5.3 A–E.**

## Purpose

S6V is the embodied presentation layer of My Twin. It renders canonical state and environmental evidence without becoming an authority over identity, memory, relationship, emotion, continuity, intention, or action.

## Implemented contracts

- S6V.4 Living idle: deterministic breathing/phase behavior; no random mood generation.
- S6V.5 Environmental presence: environment remains evidence projected through PresenceEngine.
- S6V.6 Conversation presence: idle → listening → processing → understanding → responding is derived from canonical presence inputs.
- S6V.7 Light/Dark: one geometry and behavior contract; theme changes presentation only.
- S6V.8 Energy adaptation: sleep/normal/high-energy modes derive from canonical energy and bounded visual emotion state.
- S6V.9 Performance: ultra/high/balanced/low profiles with bounded particle budgets, animation scale, blur scale and target frame-rate intent.
- S6V.9 Accessibility: reduced-motion is a first-class presentation constraint and never changes entity state.
- S6V.10 Production polish: renderer remains fail-safe and performance-aware; final acceptance requires real Android profiling.

## Non-authority rule

The visual layer may read canonical/presentation state. It must never write:

`identity, entity_id, memory, bond, trust, emotion, curiosity, continuity, goal, intention, life_intention, constitution, action`.

## Real-world acceptance

S6V.4–S6V.10 are not called production-verified until S5.5.3 Gates A–E pass on real infrastructure and an Android device profile confirms acceptable frame rate, memory, battery and thermal behavior.
