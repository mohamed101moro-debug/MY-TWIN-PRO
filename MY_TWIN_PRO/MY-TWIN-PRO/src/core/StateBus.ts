/**
 * StateBus v5.0 — العقد الكامل: مثيل + ستاتيك + أحداث + أنواع
 * ============================================================
 * - كل الاستدعاءات الستاتيكية التاريخية (StateBus.update/select/getState/reset/on/emit)
 *   تفوّض لنفس المثيل stateBus ⇒ مخزن واحد لا يتجزأ.
 * - EventHandler/StateListener variadic ⇒ دوال بمعامل أو اثنين أو أكثر تُقبل كلها.
 * - [key:string]:any يمتص أي حقل تاريخي (isAwakening/awakeningPhase/avatar/…).
 */
export const STATE_EVENTS = {
  STATE_CHANGED: 'state:changed',
  PRESENCE_CHANGED: 'presence:changed',
  PRESENCE_STATE_UPDATED: 'presence:state_updated',
  EMOTION_CHANGED: 'emotion:changed',
  MODE_CHANGED: 'mode:changed',
  ENERGY_CHANGED: 'energy:changed',
  AWARENESS_CHANGED: 'awareness:changed',
  BOND_CHANGED: 'bond:changed',
  TRUST_CHANGED: 'trust:changed',
  BEHAVIOR_DECISION: 'behavior:decision',
  INTERFACE_CHANGED: 'interface:changed',
  PRESENCE_LEVEL_CHANGED: 'presence:level_changed',
  MEMORY_SURFACED: 'memory:surfaced',
  MEMORY_CREATED: 'memory:created',
  SOUL_AWAKENED: 'soul:awakened',
  SOUL_SHUTDOWN: 'soul:shutdown',
  DREAM_SHARED: 'dream:shared',
  RHYTHM_CHANGED: 'life:rhythm_changed',
  STATE_UPDATED: 'life:state_changed',
  SURPRISE_TRIGGERED: 'surprise:triggered',
  SHADOW_UPDATED: 'shadow:updated',
  MICRO_GAZE_SHIFT: 'micro:gaze_shift',
  MICRO_BREATH: 'micro:breath_variation',
  MICRO_PULSE: 'micro:tiny_pulse',
  CURIOSITY_TRIGGERED: 'curiosity:triggered',
} as const;

export type PresenceLevel = number;
export type InterfaceState = 'dormant' | 'aware' | 'awake' | 'dreaming' | string;

export interface StateBusState {
  ambientLight?: number; movement?: number; proximity?: number; userPresent?: boolean;
  voiceLevel?: number; touch?: number;
  emotionValence?: number; arousal?: number; curiosity?: number; focus?: number;
  connection?: number; memoryLevel?: number; energy?: number;
  thinking?: boolean; listening?: boolean; speaking?: boolean;
  gazeX?: number; gazeY?: number;
  emotion?: { primaryEmotion?: string; intensity?: number; valence?: any; arousal?: number };
  relationship?: { bondLevel?: number; connection?: number; trust?: number };
  interfaceState?: InterfaceState; isOnline?: boolean; presenceLevel?: PresenceLevel;
  spaceEnergy?: string; mode?: string; avatar?: any;
  isAwakening?: boolean; awakeningPhase?: string;
  [key: string]: any;
}

export type StateListener = (state: Readonly<StateBusState>, ...rest: any[]) => void;
export type EventHandler = (...args: any[]) => void;

const DEFAULTS: StateBusState = {
  ambientLight: 0.5, movement: 0.3, proximity: 0.5, userPresent: false, voiceLevel: 0, touch: 0,
  emotionValence: 0, arousal: 0.3, curiosity: 0.45, focus: 0.5, connection: 0.2, memoryLevel: 0, energy: 0.55,
  thinking: false, listening: false, speaking: false, gazeX: 0, gazeY: 0,
  emotion: { primaryEmotion: 'calm', intensity: 0.5, valence: 'neutral' },
  relationship: { bondLevel: 20 },
  interfaceState: 'aware', isOnline: true, presenceLevel: 2, spaceEnergy: 'tranquil', mode: 'normal',
};
const RANGES: Record<string, [number, number]> = {
  ambientLight: [0, 1], movement: [0, 1], proximity: [0, 1], voiceLevel: [0, 1], touch: [0, 1],
  emotionValence: [-1, 1], arousal: [0, 1], curiosity: [0, 1], focus: [0, 1],
  connection: [0, 1], memoryLevel: [0, 1], energy: [0, 1], gazeX: [-1, 1], gazeY: [-1, 1],
};
const c01 = (n: any, fb = 0) => { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb; };

export class StateBus {
  private state: StateBusState;
  private listeners = new Set<StateListener>();
  private handlers = new Map<string, Set<EventHandler>>();
  constructor() { this.state = { ...DEFAULTS }; }

  getState(): StateBusState { return this.state; }
  getSnapshot(): StateBusState { return this.state; }

  patch(p: Partial<StateBusState>): void {
    if (!p || typeof p !== 'object') return;
    const changed: string[] = [];
    const next: StateBusState = { ...this.state };
    for (const k of Object.keys(p)) {
      let v: any = (p as any)[k];
      if (v === undefined) continue;
      if (typeof v === 'number') {
        if (!Number.isFinite(v)) continue;
        const r = RANGES[k];
        if (r) v = Math.max(r[0], Math.min(r[1], v));
      }
      if ((next as any)[k] !== v) { (next as any)[k] = v; changed.push(k); }
    }
    if (changed.length === 0) return;
    this.state = next;
    this.listeners.forEach((l) => { try { l(this.state, changed); } catch {} });
  }

  update(p: Partial<StateBusState>): void { this.patch(p); this.emit(STATE_EVENTS.STATE_CHANGED, p); }

  /** يستجيب موحّد (chat/AI) ⇒ عاطفة+طاقة+حدث */
  updateFromUnifiedResponse(r: any): void {
    try {
      const em = String(r?.emotion?.primaryEmotion ?? r?.twin_emotional_state?.current_emotion ?? r?.emotion ?? 'calm').toLowerCase();
      const intensity = c01(r?.emotion?.intensity ?? r?.twin_emotional_state?.intensity ?? 0.5, 0.5);
      const joy = em.includes('joy') || em.includes('happ') || em.includes('excit') || em.includes('caring');
      const sad = em.includes('sad') || em.includes('fear');
      const ang = em.includes('ang');
      const v = joy ? 0.6 + intensity * 0.35 : sad ? -(0.4 + intensity * 0.35) : ang ? -(0.6 + intensity * 0.35) : em.includes('surpr') ? 0.5 : em.includes('curious') ? 0.35 : 0.1;
      const a = em.includes('excit') || ang || em.includes('surpr') ? 0.8 + intensity * 0.18 : em.includes('sleep') ? 0.12 : em.includes('calm') ? 0.22 : 0.4 + intensity * 0.25;
      this.patch({
        emotion: { primaryEmotion: em, intensity, valence: v > 0.15 ? 'positive' : v < -0.15 ? 'negative' : 'neutral' },
        emotionValence: v, arousal: a, energy: c01(0.5 + intensity * 0.35),
      });
      this.emit(STATE_EVENTS.EMOTION_CHANGED, { emotion: em, intensity });
    } catch {}
  }

  emit(event: string, ...args: any[]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    set.forEach((h) => { try { h(...args); } catch {} });
  }
  on(event: string, h: EventHandler): () => void {
    let set = this.handlers.get(event);
    if (!set) { set = new Set(); this.handlers.set(event, set); }
    set.add(h);
    return () => { set!.delete(h); };
  }
  subscribe(l: StateListener): () => void { this.listeners.add(l); return () => { this.listeners.delete(l); }; }
  subscribeKeys(keys: string[], l: StateListener): () => void {
    return this.subscribe((s, changed) => { const c: string[] = Array.isArray(changed) ? changed : []; for (let i = 0; i < c.length; i++) if (keys.indexOf(c[i]) !== -1) { l(s, c); return; } });
  }
  select<T>(fn: (s: StateBusState) => T): T { return fn(this.state); }
  get listenerCount(): number { return this.listeners.size; }
  reset(): void { this.state = { ...DEFAULTS }; }

  // ── الواجهة الستاتيكية التاريخية (تفوّض للمثيل الواحد) ──
  private static _i: StateBus | null = null;
  private static get I(): StateBus { if (!StateBus._i) StateBus._i = new StateBus(); return StateBus._i; }
  static bind(i: StateBus): void { StateBus._i = i; }
  static getState(): StateBusState { return StateBus.I.getState(); }
  static getSnapshot(): StateBusState { return StateBus.I.getSnapshot(); }
  static patch(p: Partial<StateBusState>): void { StateBus.I.patch(p); }
  static update(p: Partial<StateBusState>): void { StateBus.I.update(p); }
  static updateFromUnifiedResponse(r: any): void { StateBus.I.updateFromUnifiedResponse(r); }
  static emit(event: string, ...args: any[]): void { StateBus.I.emit(event, ...args); }
  static on(event: string, h: EventHandler): () => void { return StateBus.I.on(event, h); }
  static subscribe(l: StateListener): () => void { return StateBus.I.subscribe(l); }
  static subscribeKeys(keys: string[], l: StateListener): () => void { return StateBus.I.subscribeKeys(keys, l); }
  static select<T>(fn: (s: StateBusState) => T): T { return StateBus.I.select(fn); }
  static reset(): void { StateBus.I.reset(); }
}

export const stateBus = new StateBus();
StateBus.bind(stateBus);
export default stateBus;
