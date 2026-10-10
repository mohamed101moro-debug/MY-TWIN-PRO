/**
 * StateBus v6.0 — مخزن الحالة العابر للطبقات.
 * قاعدة: مصدر واحد للحالة؛ المشاعر القادمة من الخلفية تحمل source/timestamp.
 */
export const STATE_EVENTS = {
  STATE_CHANGED: 'state:changed', PRESENCE_CHANGED: 'presence:changed', PRESENCE_STATE_UPDATED: 'presence:state_updated',
  EMOTION_CHANGED: 'emotion:changed', MODE_CHANGED: 'mode:changed', ENERGY_CHANGED: 'energy:changed',
  AWARENESS_CHANGED: 'awareness:changed', BOND_CHANGED: 'bond:changed', TRUST_CHANGED: 'trust:changed',
  BEHAVIOR_DECISION: 'behavior:decision', INTERFACE_CHANGED: 'interface:changed', PRESENCE_LEVEL_CHANGED: 'presence:level_changed',
  MEMORY_SURFACED: 'memory:surfaced', MEMORY_CREATED: 'memory:created', SOUL_AWAKENED: 'soul:awakened',
  SOUL_SHUTDOWN: 'soul:shutdown', DREAM_SHARED: 'dream:shared', RHYTHM_CHANGED: 'life:rhythm_changed',
  STATE_UPDATED: 'life:state_changed', SURPRISE_TRIGGERED: 'surprise:triggered', SHADOW_UPDATED: 'shadow:updated',
  MICRO_GAZE_SHIFT: 'micro:gaze_shift', MICRO_BREATH: 'micro:breath_variation', MICRO_PULSE: 'micro:tiny_pulse', CURIOSITY_TRIGGERED: 'curiosity:triggered',
} as const;

export type PresenceLevel = number;
export type InterfaceState = 'dormant' | 'aware' | 'awake' | 'dreaming' | string;
export interface StateBusState {
  ambientLight?: number; movement?: number; proximity?: number; userPresent?: boolean; voiceLevel?: number; touch?: number;
  emotionValence?: number; arousal?: number; curiosity?: number; focus?: number; connection?: number; memoryLevel?: number; energy?: number;
  thinking?: boolean; listening?: boolean; speaking?: boolean; gazeX?: number; gazeY?: number;
  emotion?: { primaryEmotion?: string; intensity?: number; valence?: string | number; arousal?: number; source?: string; updatedAt?: number };
  emotionSource?: string; emotionUpdatedAt?: number;
  relationship?: { bondLevel?: number; connection?: number; trust?: number };
  batteryLevel?: number; isCharging?: boolean; performanceTier?: number; reducedMotion?: boolean;
  interfaceState?: InterfaceState; isOnline?: boolean; presenceLevel?: PresenceLevel; spaceEnergy?: string; mode?: string; avatar?: any;
  brainMeaning?: any; lifeIntention?: any; presenceBinding?: any; cognitiveState?: any;
  continuity?: any; lastThought?: string; pendingQuestions?: string[]; cognitiveLoad?: number;
  isAwakening?: boolean; awakeningPhase?: string; night?: boolean; camera?: boolean;
  [key: string]: any;
}
export type StateListener = (state: Readonly<StateBusState>, changed?: string[]) => void;
export type EventHandler = (...args: any[]) => void;

const DEFAULTS: StateBusState = {
  ambientLight: 0.5, movement: 0.3, proximity: 0.5, userPresent: false, voiceLevel: 0, touch: 0,
  emotionValence: 0, arousal: 0.3, curiosity: 0.45, focus: 0.5, connection: 0.2, memoryLevel: 0, energy: 0.55,
  thinking: false, listening: false, speaking: false, gazeX: 0, gazeY: 0,
  emotion: { primaryEmotion: 'calm', intensity: 0.5, valence: 'neutral', source: 'default', updatedAt: 0 },
  emotionSource: 'default', emotionUpdatedAt: 0, relationship: { bondLevel: 20 }, batteryLevel: 1, isCharging: false, performanceTier: 1, reducedMotion: false,
  interfaceState: 'aware', isOnline: true, presenceLevel: 2, spaceEnergy: 'tranquil', mode: 'normal', night: false, camera: false,
};
const RANGES: Record<string, [number, number]> = {
  ambientLight: [0, 1], movement: [0, 1], proximity: [0, 1], voiceLevel: [0, 1], touch: [0, 1], emotionValence: [-1, 1], arousal: [0, 1],
  curiosity: [0, 1], focus: [0, 1], connection: [0, 1], memoryLevel: [0, 1], energy: [0, 1], gazeX: [-1, 1], gazeY: [-1, 1], batteryLevel: [0, 1], performanceTier: [0.5, 1],
};
const c01 = (n: unknown, fb = 0): number => { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb; };

export class StateBus {
  private state: StateBusState = { ...DEFAULTS, emotion: { ...DEFAULTS.emotion! }, relationship: { ...DEFAULTS.relationship! } };
  private listeners = new Set<StateListener>();
  private handlers = new Map<string, Set<EventHandler>>();

  getState(): StateBusState { return this.state; }
  getSnapshot(): StateBusState { return this.state; }

  patch(p: Partial<StateBusState>): void {
    if (!p || typeof p !== 'object') return;
    const changed: string[] = [];
    const next: StateBusState = { ...this.state };
    for (const key of Object.keys(p)) {
      let value: any = (p as any)[key];
      if (value === undefined) continue;
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) continue;
        const range = RANGES[key]; if (range) value = Math.max(range[0], Math.min(range[1], value));
      }
      if (key === 'emotion' && value && typeof value === 'object') value = { ...(this.state.emotion || {}), ...value };
      if (key === 'relationship' && value && typeof value === 'object') value = { ...(this.state.relationship || {}), ...value };
      if (JSON.stringify((next as any)[key]) !== JSON.stringify(value)) { (next as any)[key] = value; changed.push(key); }
    }
    if (!changed.length) return;
    this.state = next;
    this.listeners.forEach((listener) => { try { listener(this.state, changed); } catch {} });
  }

  update(p: Partial<StateBusState>): void { this.patch(p); this.emit(STATE_EVENTS.STATE_CHANGED, p); }

  updateFromUnifiedResponse(r: any): void {
    try {
      const nested = r?.twin_emotional_state || {};
      const rawEmotion = r?.emotion?.primaryEmotion ?? r?.emotion ?? nested.current_emotion ?? 'calm';
      const em = String(rawEmotion || 'calm').toLowerCase();
      const intensity = c01(r?.emotion?.intensity ?? r?.emotion_meta?.intensity ?? r?.intensity ?? nested.intensity ?? 0.5, 0.5);
      const timestamp = Number(r?.emotion?.updatedAt ?? r?.emotion_meta?.updatedAt ?? r?.emotion_meta?.updated_at ?? r?.timestamp ?? Date.now());
      const source = String(r?.emotion?.source ?? r?.emotion_meta?.source ?? r?.source ?? 'backend');
      const currentTs = Number(this.state.emotionUpdatedAt ?? 0);
      if (Number.isFinite(timestamp) && timestamp < currentTs) return;
      const joy = /joy|happ|excit|caring|love/.test(em), sad = /sad|fear|grief/.test(em), ang = /angry|anger/.test(em);
      const valence = joy ? Math.min(1, 0.6 + intensity * 0.35) : sad ? -Math.min(1, 0.4 + intensity * 0.35) : ang ? -Math.min(1, 0.6 + intensity * 0.35) : /surpr/.test(em) ? 0.5 : /curious/.test(em) ? 0.35 : 0.1;
      const arousal = /excit|angry|anger|surpr/.test(em) ? c01(0.8 + intensity * 0.18) : /sleep/.test(em) ? 0.12 : /calm/.test(em) ? 0.22 : c01(0.4 + intensity * 0.25);
      const update: Partial<StateBusState> = {
        ...(r?.cognitive_state ? { cognitiveState: r.cognitive_state } : {}),
        emotion: { primaryEmotion: em, intensity, valence: valence > 0.15 ? 'positive' : valence < -0.15 ? 'negative' : 'neutral', arousal, source, updatedAt: timestamp },
        emotionSource: source, emotionUpdatedAt: timestamp, emotionValence: valence, arousal,
        energy: c01(r?.energy ?? 0.5 + intensity * 0.35, 0.5),
      };
      const bond = Number(r?.bond_level ?? r?.bondLevel ?? nested.bond_level);
      if (Number.isFinite(bond)) update.relationship = { bondLevel: Math.max(0, Math.min(100, bond)) };
      const twinState = r?.twin_state_update || {};
      if (Number.isFinite(Number(twinState?.energy))) update.energy = c01(twinState.energy, this.state.energy ?? 0.55);
      if (r?.continuity_context && typeof r.continuity_context === 'object') {
        update.continuity = r.continuity_context;
        update.lastThought = String(r.continuity_context.last_thought ?? '').slice(0, 1000);
        update.pendingQuestions = Array.isArray(r.continuity_context.pending_questions)
          ? r.continuity_context.pending_questions.slice(-5).map((q: unknown) => String(q).slice(0, 300))
          : [];
        update.cognitiveLoad = c01(r.continuity_context.cognitive_load, 0);
      }
      this.patch(update);
      this.emit(STATE_EVENTS.EMOTION_CHANGED, { emotion: em, intensity, source, updatedAt: timestamp });
      if (r?.memory_surfaced) this.emit(STATE_EVENTS.MEMORY_SURFACED, r.memory_surfaced);
    } catch {}
  }

  emit(event: string, ...args: any[]): void { this.handlers.get(event)?.forEach((handler) => { try { handler(...args); } catch {} }); }
  on(event: string, handler: EventHandler): () => void {
    let set = this.handlers.get(event); if (!set) { set = new Set(); this.handlers.set(event, set); }
    set.add(handler); return () => { set!.delete(handler); if (!set!.size) this.handlers.delete(event); };
  }
  subscribe(listener: StateListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  subscribeKeys(keys: string[], listener: StateListener): () => void {
    const wanted = new Set(keys); return this.subscribe((state, changed = []) => { if (changed.some((k) => wanted.has(k))) listener(state, changed); });
  }
  select<T>(fn: (state: StateBusState) => T): T { return fn(this.state); }
  get listenerCount(): number { return this.listeners.size; }
  reset(): void {
    this.state = { ...DEFAULTS, emotion: { ...DEFAULTS.emotion! }, relationship: { ...DEFAULTS.relationship! } };
    this.listeners.forEach((listener) => { try { listener(this.state, Object.keys(DEFAULTS)); } catch {} });
    this.emit(STATE_EVENTS.STATE_CHANGED, this.state);
  }

  private static _i: StateBus | null = null;
  private static get I(): StateBus { if (!StateBus._i) StateBus._i = new StateBus(); return StateBus._i; }
  static bind(i: StateBus): void { StateBus._i = i; }
  static getState(): StateBusState { return StateBus.I.getState(); }
  static getSnapshot(): StateBusState { return StateBus.I.getSnapshot(); }
  static patch(p: Partial<StateBusState>): void { StateBus.I.patch(p); }
  static update(p: Partial<StateBusState>): void { StateBus.I.update(p); }
  static updateFromUnifiedResponse(r: any): void { StateBus.I.updateFromUnifiedResponse(r); }
  static emit(event: string, ...args: any[]): void { StateBus.I.emit(event, ...args); }
  static on(event: string, handler: EventHandler): () => void { return StateBus.I.on(event, handler); }
  static subscribe(listener: StateListener): () => void { return StateBus.I.subscribe(listener); }
  static subscribeKeys(keys: string[], listener: StateListener): () => void { return StateBus.I.subscribeKeys(keys, listener); }
  static select<T>(fn: (state: StateBusState) => T): T { return StateBus.I.select(fn); }
  static reset(): void { StateBus.I.reset(); }
}
export const stateBus = new StateBus();
StateBus.bind(stateBus);
export default stateBus;
