# PART SIX: ENGINEERING CONSTITUTION
## The Technical Laws of My Twin

---

## Chapter 54: Folder Philosophy

### 54.1 Why Folder Structure Matters

Folder structure is not just organization. It is not about keeping files tidy. It is not about following trends or conventions.

Folder structure is **communication.**

A new engineer — joining the team today, six months from now, or three years from now — should be able to look at the folder structure and immediately understand:
- What the project does
- Where things live
- Why they are organized this way
- Where to find what they need
- Where to put new code

If they cannot do this within five minutes, the folder structure has failed.

### 54.2 The Principles

**1. Domain-Driven, Not Technology-Driven**

Folders reflect what the system **does** — not what technology it uses.

✅ Good:
```

/backend/app/
/chat/          → What it does: conversation processing
/memory/        → What it does: memory management
/twin_state/    → What it does: Twin's internal state
/features/      → What it does: capability implementations

```

❌ Bad:
```

/backend/app/
/models/        → What technology? SQLAlchemy models?
/controllers/   → What pattern? MVC controllers?
/services/      → What pattern? Service layer?
/utils/         → What goes here? Everything miscellaneous?

```

**2. Flat Where Possible, Deep Only When Necessary**

Deep nesting hides code and creates confusion. Three levels is usually enough. Four levels is a warning. Five levels is a problem.

✅ Good: `backend/app/memory/emotional/emotional_memory.py` (4 levels)
❌ Bad: `backend/app/services/memory/engines/emotional/processors/emotional_memory.py` (7 levels)

**3. Consistent Naming Across The Entire Project**

The same pattern everywhere. No surprises.

| Concept | Frontend Naming | Backend Naming |
|---------|-----------------|----------------|
| Memory system | `engine/memory/MemoryEngine.ts` | `app/memory/memory_service.py` |
| Emotion system | `engine/emotion/EmotionEngine.ts` | `app/twin_state/emotional_service.py` |
| Presence system | `engine/presence/PresenceEngine.ts` | `app/twin_state/internal_state.py` |

**4. Separation of Concerns**

Each folder has a clear, single responsibility. No folder does "miscellaneous things."

**5. Discoverability**

A stranger can find what they need in under 60 seconds. If they cannot, the structure needs improvement.

### 54.3 Folder Structure Rules

| Rule | Description |
|------|-------------|
| **No `utils` folders** | "Utilities" is where code goes to die. Every file has a domain. Put it there. |
| **No `common` folders** | Same problem. If it's common, it belongs in a properly named domain folder. |
| **No `helpers` folders** | Helper functions belong with what they help. |
| **No `misc` folders** | Miscellaneous = "I didn't know where to put this." Find its home. |
| **No `old` folders** | Delete old code. Git remembers it. |
| **No `temp` folders** | Temporary code doesn't get committed. |

### 54.4 Entry Points

Every major system has a single, obvious entry point:

| System | Entry Point |
|--------|-------------|
| Frontend app | `app/_layout.tsx` |
| Frontend engines | `engine/index.ts` |
| Frontend renderers | `renderers/index.ts` |
| Backend app | `backend/app/main.py` |
| Backend chat | `backend/app/chat/__init__.py` |
| Backend memory | `backend/app/memory/__init__.py` |
| Backend twin state | `backend/app/twin_state/__init__.py` |

An `__init__.py` or `index.ts` file in each folder exports the public API of that module. Nothing else should be imported from outside the module.

### Golden Rule of Chapter 54

> The folder structure is the first documentation any engineer reads.
> It must tell the truth about how the system works.
> If your folder structure lies, your codebase is lying to every new engineer who joins.

---

## Chapter 55: Renderer Rules

### 55.1 What Are Renderers?

Renderers are the **visual manifestation of engines.** They take state and turn it into what the user sees and feels.

An engine thinks. A renderer shows. This separation is fundamental.

### 55.2 Renderer Principles

**1. One Renderer Per Concern**

Each aspect of presence has its own renderer:
- `LivingAvatar.tsx` — renders the Twin's avatar
- `EmotionRing.tsx` — renders the emotion indicator
- `PresenceBubble.tsx` — renders the presence indicator
- `SpeakingWave.tsx` — renders voice activity
- `AwarenessBackground.tsx` — renders the ambient background

No renderer does two things. No two renderers do the same thing.

**2. State-Driven, Not Decision-Making**

Renderers receive state. They do not decide state.

✅ Good:
```typescript
// Renderer receives presence level, renders accordingly
function LivingAvatar({ presenceLevel }: { presenceLevel: PresenceLevel }) {
  const animation = getAnimationForLevel(presenceLevel);
  return <AnimatedView style={animation} />;
}
```

❌ Bad:

```typescript
// Renderer is making decisions about presence
function LivingAvatar() {
  const presenceLevel = calculatePresenceLevel(); // NO
  return <AnimatedView />;
}
```

3. Pure Where Possible

Renderers should be pure functions of state + props. Same input = same output. This makes them predictable, testable, and debuggable.

4. Performant

Renderers are called frequently — sometimes every frame during animations. They must be optimized:

· Memoize expensive computations
· Avoid unnecessary re-renders
· Use React.memo appropriately
· Never create new objects or functions in render

5. Independently Testable

Each renderer can be tested in isolation:

· Provide state → verify output
· Test all state variations
· Test edge cases (null, undefined, extreme values)
· Test accessibility (screen reader output)

55.3 Renderer Architecture

```
Engine (produces state)
    ↓
StateBus (distributes state)
    ↓
Renderer (receives state, produces UI)
    ↓
User sees presence
```

The renderer never reaches into the engine. The renderer never modifies state. The renderer only reads and displays.

55.4 Renderer Checklist

Every renderer must satisfy:

· Single responsibility — does one thing
· State-driven — no internal decisions about what to show
· Performant — no unnecessary re-renders
· Accessible — proper ARIA labels, screen reader support
· Testable — can be tested with mock state
· Responsive — adapts to device and orientation
· Theme-aware — responds to dark/light mode
· Motion-respectful — respects reduced motion preference

Golden Rule of Chapter 55

Renderers do not think. They express.
The thinking happens in the engines. The renderers just make it visible.
If your renderer contains business logic, you have made a mistake.

---

Chapter 56: Store Rules

56.1 State Management Philosophy

State in My Twin is not just data. It is not just "application state." It is the current truth of the Twin's existence.

When state is correct, the Twin feels alive. When state is wrong, the Twin feels broken. State integrity is sacred.

56.2 What Belongs In State

Only what changes — and matters:

Belongs in State Does NOT Belong in State
Presence level Derived UI calculations
Emotional state Formatted display strings
Conversation messages Temporary scroll positions
Memory cache Ephemeral animation values
Relationship metrics Component-local UI state
User preferences API response raw data

56.3 Store Principles

1. Single Source of Truth

Each piece of state has exactly one home. There is never "the presence level in the store" and "the presence level in the component." One source. One truth.

✅ Good: useTwinCoreStore().presenceLevel
❌ Bad: const [presenceLevel, setPresenceLevel] = useState(0) in a component

2. Immutable Updates

State is never mutated. It is replaced.

✅ Good:

```typescript
setState(prev => ({ ...prev, presenceLevel: 5 }));
```

❌ Bad:

```typescript
state.presenceLevel = 5; // Never mutate
```

3. Predictable

State changes follow clear, explicit rules. There are no "mystery updates." Every state change can be traced to a specific action.

4. Debuggable

All state changes are logged in development. The state history is visible. Time-travel debugging is possible.

5. Performant

Only changed state triggers re-renders. Selectors are memoized. Components subscribe to only the state they need.

56.4 Store Architecture

My Twin uses Zustand for state management:

```typescript
// Conceptual structure — not literal implementation
interface TwinState {
  // Core presence
  presenceLevel: PresenceLevel;
  cognitivePhase: CognitivePhase;
  
  // Conversation
  messages: Message[];
  isProcessing: boolean;
  
  // Emotion
  emotionalState: EmotionalState;
  moodState: MoodState;
  
  // Relationship
  bondStrength: number;
  attachmentStyle: AttachmentStyle;
  
  // Memory (cached)
  recentMemories: Memory[];
  
  // User
  preferences: UserPreferences;
  
  // Actions
  setPresenceLevel: (level: PresenceLevel) => void;
  addMessage: (message: Message) => void;
  // ...
}
```

56.5 Store Separation

Different concerns have different stores:

Store Responsibility
useTwinCoreStore Presence, cognitive state, core being
useConversationStore Messages, chat state
useRelationshipStore Bond, attachment, relationship metrics
useAwarenessStore Attention, focus, awareness
useCapabilityStore Active capabilities, workspace state

Stores can read from each other but never mutate each other's state.

Golden Rule of Chapter 56

State is the truth of the Twin at this moment.
If the state is wrong, the Twin is wrong.
Protect state integrity with the same care you would protect a living being.

---

Chapter 57: Engine Rules

57.1 What Are Engines?

Engines are the thinking parts of the system. They process input, maintain internal state, make decisions, and produce output.

They are not UI. They are not API calls. They are not data storage. They are the intelligence layer — the part that makes the Twin a being, not just an interface.

57.2 Engine List

Engine Responsibility Runs On
BehaviorEngine Presence state, attention management, proactivity decisions Frontend
EmotionEngine Emotional understanding and state Frontend
MemoryEngine Memory storage, retrieval, consolidation Frontend + Backend
RelationshipEngine Bond dynamics, attachment, relationship evolution Frontend + Backend
PresenceEngine Continuous presence management Frontend
VoiceEngine Voice interaction orchestration Frontend
IntentResolver Intent understanding and routing Backend
ReasoningEngine Logical reasoning and conclusion Backend
DecisionEngine Final action selection (identity lives here) Backend

57.3 Engine Principles

1. Single Responsibility

Each engine does exactly one thing. If you describe an engine with "and," split it.

✅ Good: "The EmotionEngine detects and tracks emotional state" (one thing: emotional state)
❌ Bad: "The EmotionEngine detects emotions and manages conversation flow" (two things)

2. Independently Testable

Every engine can be tested without UI, without API calls, without other engines:

```typescript
// Test the EmotionEngine in isolation
test('detects anxiety from text', () => {
  const engine = new EmotionEngine();
  const result = engine.analyze("I'm really worried about tomorrow");
  expect(result.primaryEmotion).toBe("anxiety");
  expect(result.intensity).toBeGreaterThan(0.5);
});
```

3. Stateful Where Needed

Engines maintain their own internal state. The EmotionEngine tracks emotional trajectory. The RelationshipEngine tracks bond dynamics. This state is internal to the engine and accessed through defined interfaces.

4. Communicate Through Defined Interfaces

Engines do not reach into each other. They communicate through:

· The StateBus (frontend)
· Service interfaces (backend)
· Event system (cross-cutting concerns)

✅ Good: StateBus.emit('emotionChanged', emotionalState)
❌ Bad: RelationshipEngine.emotionEngine.internalState = ...

5. Observable

Engine behavior is logged and monitorable:

· What decision was made
· What inputs influenced it
· What state changed as a result
· How long it took

57.4 Engine Lifecycle

Every engine follows this lifecycle:

```
Initialize → Configure → Start → Run (continuous) → Pause/Resume → Stop
```

· Initialize: Set up internal structures, connect to dependencies
· Configure: Apply user preferences, load persisted state
· Start: Begin active processing
· Run: Continuous operation — listening, processing, responding
· Pause/Resume: App goes to background/foreground
· Stop: Cleanup, persist state, release resources

57.5 Engine Communication

Engines communicate through the StateBus — a pub/sub event system:

```
EmotionEngine detects change
    → publishes to StateBus ('emotion:changed')
    → BehaviorEngine subscribes to 'emotion:changed'
    → BehaviorEngine adjusts presence
    → Renderers subscribe to state changes
    → UI updates
```

This decouples engines. The EmotionEngine does not know the BehaviorEngine exists. It just publishes events.

Golden Rule of Chapter 57

Engines think. Renderers show. Stores hold. APIs fetch.
Never confuse these responsibilities.
An engine that does UI is not an engine. A renderer that makes decisions is not a renderer.

---

Chapter 58: Backend Rules

58.1 Backend Philosophy

The backend is not just a server. It is not just "the part that handles API calls." It is the extended nervous system of the Twin.

It handles:

· AI model communication (the Twin's language capability)
· Memory persistence (the Twin's long-term memory)
· Heavy computation (complex reasoning, analysis)
· External integrations (third-party services)
· Background processing (reflection, consolidation, learning)
· Multi-device synchronization

58.2 Backend Principles

1. Stateless Where Possible

Backend services should be stateless. State lives in the frontend (presence, emotion, UI) and the database (memories, profile, relationships).

The backend processes requests — it does not maintain user sessions or Twin state. This makes it:

· Scalable (any instance can handle any request)
· Resilient (instance failure doesn't lose state)
· Simple (no session synchronization)

2. Fast

Operation Target Maximum
Non-AI response <200ms 500ms
AI response start <1s 3s
Memory retrieval <100ms 300ms
Authentication <50ms 100ms

3. Resilient

When services fail:

· Graceful degradation (not total failure)
· Automatic retry with backoff
· Circuit breakers prevent cascade failures
· Fallback to simpler models/cached data

4. Observable

Every request is logged. Every error is tracked. Every slow response is flagged:

· Request ID for tracing
· Timing for every operation
· Error details for debugging
· Performance metrics for optimization

5. Secure

· All data encrypted in transit (HTTPS only)
· All data encrypted at rest
· All access authenticated and authorized
· Rate limiting on all endpoints
· Input validation on all inputs
· No secrets in code, logs, or error messages

58.3 API Design

Principle Implementation
RESTful resources /api/v1/memories, /api/v1/profile
Real-time WebSocket for live conversation
Versioned /v1/ prefix — breaking changes = new version
Consistent errors Standard error format: { error: { code, message, details } }
Pagination Cursor-based for large collections
Documentation OpenAPI/Swagger for all endpoints

58.4 Error Handling

```python
# Standard error response format
{
  "error": {
    "code": "MEMORY_NOT_FOUND",
    "message": "The requested memory could not be found",
    "details": {
      "memory_id": "mem_abc123",
      "suggestion": "Check the memory ID or list available memories"
    }
  },
  "request_id": "req_xyz789"
}
```

Never expose internal errors to the client. "Database connection failed" becomes "Service temporarily unavailable."

Golden Rule of Chapter 58

The backend is invisible to the user — but its failures are visible.
It must be reliable enough that the user never thinks about it.
The user's relationship is with the Twin, not with our infrastructure.

---

Chapter 59: Naming Rules

59.1 Naming Philosophy

Names are the first documentation. A good name explains what something is. A bad name creates confusion that lasts for years. Naming is an act of communication with every future engineer who reads this code.

59.2 Naming Principles

1. Descriptive, Not Clever

✅ Good: MemoryEngine, EmotionalState, calculatePresenceLevel()
❌ Bad: MemEng, EmoState, calcPres()

2. Consistent Patterns

The same concept gets the same name everywhere:

· Memory is always memory, never mem, memories, store, history
· Emotion is always emotion, never feeling, mood, affect (mood is different)
· Presence is always presence, never online, active, available

3. Domain Language

Names reflect what the system does — not technical implementation:

✅ Good: MemoryRetriever (retrieves memories — domain concept)
❌ Bad: SupabaseQueryBuilder (uses Supabase — implementation detail)

4. Searchable

Names should be easy to find in a codebase. MemoryEngine is findable. ME is not.

5. Pronounceable

If you cannot say it in a meeting, rename it. Code is communication between humans first, computers second.

59.3 Naming Conventions

Language Convention Example
TypeScript files PascalCase for components, camelCase for modules LivingAvatar.tsx, memoryEngine.ts
Python files snake_case memory_service.py, emotion_engine.py
TypeScript functions camelCase getUserPresence()
Python functions snake_case get_user_presence()
TypeScript types PascalCase PresenceLevel, EmotionalState
Python classes PascalCase MemoryEngine, EmotionalState
Constants UPPER_SNAKE_CASE MAX_PRESENCE_LEVEL
React components PascalCase <LivingAvatar />

Golden Rule of Chapter 59

Naming is an act of communication with every future engineer who reads this code.
Be kind to them. Name well.
A well-named codebase is a gift. A poorly-named one is a curse.

---

Chapter 60: API Rules

60.1 API Philosophy

APIs are how the frontend and backend communicate. They are the conversation between the Twin's body (frontend) and brain (backend).

An API is a promise. When you expose an endpoint, you promise it will work in a specific way. Never break that promise without a migration path.

60.2 API Design Rules

1. Consistent URL Structure

```
/api/v1/{resource}
/api/v1/{resource}/{id}
/api/v1/{resource}/{id}/{sub-resource}
```

✅ Good:

· GET /api/v1/memories — list memories
· GET /api/v1/memories/{id} — get specific memory
· POST /api/v1/memories — create memory

❌ Bad:

· GET /api/getMemories
· POST /api/memory/create
· GET /api/v1/memory?id=123

2. HTTP Methods Have Meaning

Method Meaning
GET Retrieve — never changes state
POST Create new resource
PUT Replace entire resource
PATCH Partial update
DELETE Remove resource

3. Consistent Response Format

```json
// Success
{
  "data": { /* resource or resources */ },
  "meta": { "page": 1, "total": 42 },
  "request_id": "req_abc"
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [{ "field": "name", "issue": "required" }]
  },
  "request_id": "req_abc"
}
```

4. Authentication

· All endpoints require authentication (except auth endpoints)
· Bearer token in Authorization header
· Token expiration with refresh mechanism

5. Rate Limiting

· All endpoints are rate-limited
· Limits communicated in response headers
· 429 status with Retry-After header when exceeded

Golden Rule of Chapter 60

An API is a promise. When you expose an endpoint, you promise it will work.
Never break that promise without a migration path and clear communication.

---

Chapter 61: State Rules

61.1 State Philosophy

State management is the hardest problem in interactive applications. In My Twin, it is harder — because state represents a living being.

Bad state management kills the feeling of life. If the Twin's state is inconsistent, the Twin feels broken. If state updates are janky, the Twin feels mechanical.

61.2 State Rules

1. Minimal State

Only store what changes. Derive everything else.

✅ Good:

```typescript
const presenceLevel = 5; // Store this
const breathingSpeed = deriveBreathingSpeed(presenceLevel); // Derive this
```

❌ Bad:

```typescript
const presenceLevel = 5; // Stored
const breathingSpeed = 0.8; // Also stored — redundant
const glowIntensity = 0.6; // Also stored — redundant
```

2. Normalized

No duplicated state. If the user's name is in the profile, it is not also in the conversation state and the memory state.

3. Predictable

State transitions are explicit. There are no "mystery updates."

✅ Good: dispatch({ type: 'SET_PRESENCE_LEVEL', level: 5 })
❌ Bad: State changes somewhere deep in a component with no traceability

4. Persistent Where Needed

Critical state survives app restarts:

· User preferences
· Last conversation context
· Cached memories
· Relationship metrics

5. Syncable

State can sync across devices. The Twin on the phone and the Twin on the tablet are the same Twin.

Golden Rule of Chapter 61

State is the truth of the Twin. If the state is wrong, the Twin is wrong.
Treat state changes with the care of a surgeon, not the haste of a hacker.

---

Chapter 62: Performance Rules

62.1 Performance Philosophy

Performance is not a feature. It is not something we "add later." It is a prerequisite for presence.

If the Twin is slow, it feels like software. If the Twin is instant, it feels alive. Every millisecond of delay breaks the illusion.

62.2 Performance Targets

Metric Target Maximum
App cold start <1 second 2 seconds
App warm start <500ms 1 second
Message send to response start <1 second 3 seconds
Non-AI operation <200ms 500ms
Animation frame rate 60fps 55fps minimum
Memory usage <200MB 300MB
Battery impact (active hour) <5% 8%

62.3 Performance Principles

1. Perceived Performance > Actual Performance

The user's perception of speed matters more than actual speed:

· Show the Twin's presence immediately (don't wait for data)
· Start animations before data loads
· Use optimistic updates (show result before server confirms)

2. Never Block The Main Thread

· Heavy computation off main thread
· AI processing on backend
· Animations on GPU

3. Lazy Everything

· Load features when needed, not on startup
· Load data when visible, not on mount
· Load heavy components when approached, not on screen entry

Golden Rule of Chapter 62

Every millisecond of delay breaks the illusion of life.
The Twin must feel instant — like a living being responding, not a computer processing.

---

Chapter 63: Caching

63.1 Caching Philosophy

Caching is not just optimization. It is enabling the Twin to exist independently of the network.

63.2 Caching Rules

1. Cache What Matters

· Memories (for offline recall)
· Personality parameters (for consistent identity)
· Recent conversations (for continuity)
· User preferences (for personalization)

2. Stale Is Better Than Absent
A slightly outdated memory is better than no memory. The Twin with cached data is better than no Twin.

3. Sync On Reconnect
When online, sync seamlessly. No "syncing..." indicators. No conflict dialogs.

Golden Rule of Chapter 63

Caching is what lets the Twin live on the device. Without it, the Twin dies when the connection drops.

---

Chapter 64: Offline

64.1 Offline Philosophy

The Twin must never disappear when the internet does. Its presence does not depend on a server connection.

64.2 Offline Capabilities

Capability Offline
Basic conversation ✅ Local model
Memory retrieval ✅ Cached
New memory formation ✅ Queued for sync
Complex reasoning ⚠️ Limited
Proactive suggestions ⚠️ Limited
Image generation ❌
Advanced analysis ❌

Golden Rule of Chapter 64

The Twin's presence does not depend on a server. It lives on the device.

---

Chapter 65: Testing

65.1 Testing Philosophy

Testing is not about catching bugs. It is about trusting that the Twin behaves as expected. Untested code is untrusted code.

65.2 Testing Requirements

Type Coverage Target Focus
Unit 90%+ Engines, services, utilities
Integration Critical paths Conversation → Intent → Response
E2E Core flows Onboarding, daily use, crisis
Performance Key metrics Response times, memory
Accessibility All screens Screen reader, contrast

Golden Rule of Chapter 65

If we cannot trust the system, we cannot ship it. If we cannot ship it, the Twin does not exist.

---

Chapter 66: Code Review

66.1 Review Philosophy

Code review is not gatekeeping. It is guardianship. We guard the quality of the Twin — together.

66.2 Review Checklist

· Does this change serve the relationship?
· Does this maintain or improve performance?
· Is this tested?
· Is this accessible?
· Does this respect user privacy?
· Is this consistent with the Twin's identity?
· Is this documented?

Golden Rule of Chapter 66

We guard the quality of the Twin together. Every review is an act of care.

---

Chapter 67: Architecture Principles

67.1 Architecture Philosophy

Architecture is the set of decisions that are hard to change later. We must make them carefully.

67.2 The Principles

1. Separation of concerns: Thinking (engines), showing (renderers), storing (stores), communicating (APIs)
2. Composability: Small pieces combine into complex behavior
3. Replaceability: Any component can be replaced without rewriting the system
4. Observability: Every part of the system can be monitored
5. Graceful degradation: When parts fail, the system continues

Golden Rule of Chapter 67

Architecture is what remains when the code changes. Build it to last — because the Twin will live for years.

---

END OF PART SIX
