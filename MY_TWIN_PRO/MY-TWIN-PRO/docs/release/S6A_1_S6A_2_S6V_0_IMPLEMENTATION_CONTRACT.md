# S6A.1 + S6A.2 + S6V.0 Implementation Contract

## Identity
- Frontend never manufactures a Digital Passport.
- `/api/v1/passport` is the only canonical passport source.
- Missing identity is an explicit unavailable state, never a local fallback entity.
- Canonical user identity is the Supabase Auth UUID.
- Identity/lifecycle-sensitive backend boundaries validate that UUID contract.

## Visual Entity
The Light and Dark reference images are the visual North Star for My Twin.
They define one entity with one geometry/behavioral vocabulary rendered through two themes.

### Layers
1. Outer Halo
2. Energy Membrane / Living Membrane
3. Emotional Aura / Field
4. Core Light
5. Expressive Eye System
6. Micro Particles

### Projection rule
`Canonical State -> Presence State -> Visual State -> Renderer`

The visual layer may read state but must not write identity, memory, bond, trust, emotion, curiosity, continuity, intention, constitution or action.

### Current implementation
- `VisualEntityContract.ts` is the canonical visual vocabulary.
- `VisualState.ts` is the pure projection layer.
- `DigitalBeing.tsx` renders the membrane, halo, aura, core, eyes and particles.
- `PresenceEngine.ts` produces the presentation state and uses a deterministic gaze phase.

S6V.1–S6V.3 are considered implementation continuations of this contract; the renderer remains presentation-only.

## Visual North Star assets
- `visual-reference/my-twin-light-visual-north-star.png`
- `visual-reference/my-twin-dark-visual-north-star.png`

These are design references for the living form. They are not state authorities and are not runtime-generated identity data.
