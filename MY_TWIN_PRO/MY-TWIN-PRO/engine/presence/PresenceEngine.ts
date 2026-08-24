/**
 * PresenceEngine v2.0 — القلب النابض للكيان الحي
 * ================================================
 * العقد العام (مطابق حرفيًا لكل المستهلكين الحاليين):
 *   start() / stop() / subscribe(fn) / getSnapshot()
 *   setEmotion(emotion, intensity) / addMicroExpression(type, intensity) / triggerMemoryEcho()
 *
 * التكامل العميق (قرار «كيان واحد يقوده مصدر واحد»):
 *   stateBus (حساسات+مشاعر+محادثة) ─→ Engine ─→ PresenceState ─→ ConsciousBeing ─→ DigitalBeing/ShaderBeing
 * - setEmotion: مزج 600ms بين ملفين بصريين (EmotionToVisualMapper) ⇒ لا قفزات لونية.
 * - إن غاب setEmotion 30ث: اشتقاق الشعور من stateBus (valence/arousal/focus/thinking).
 * - EnvironmentalReactor: الضوء/الضوضاء/الحركة/القرب يعدّلون الرقعة قبل النشر.
 * - نظر ذاتي متجوّل + gaze من الحافلة، صدى ذاكرة (3ث)، تعابير دقيقة (1.2ث) تصل للبصريات فعلًا.
 * - دروع: NaN/undefined مرفوضة، tick 100ms، إشعار 5Hz (لا إغراق رندرة).
 */
import type { PresenceState } from './PresenceTypes';
import {
  EMOTION_PROFILES, getProfile, blendProfiles,
  profileToPresencePatch, profileFromValence,
} from './EmotionToVisualMapper';
import type { EmotionVisualProfile } from './EmotionToVisualMapper';
import { reactToEnvironment, applyModsToPatch } from './EnvironmentalReactor';
import type { EnvSnapshot } from './EnvironmentalReactor';
import { stateBus } from '../../src/core/StateBus';

const c01 = (n: unknown, fb = 0): number => { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb; };
const c11 = (n: unknown, fb = 0): number => { const v = Number(n); return Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : fb; };

const BASELINE: PresenceState = {
  emotion: 'calm', intensity: 0.6,
  energy: 0.55, pulse: 0.4, breathing: 0.4,
  eyeOpenness: 0.85, eyeGlow: 0.88, pupilSize: 0.42, gazeX: 0, gazeY: 0,
  warmth: 0.35, attention: 0.5, anticipation: 0.25,
  voiceLevel: 0, speaking: false, listening: false, thinking: false,
  fieldSpeed: 0.4, turbulence: 0.18, orbitality: 0.68, fieldRadius: 1, fieldOpacity: 0.85,
  colorA: EMOTION_PROFILES.calm.colorA, colorB: EMOTION_PROFILES.calm.colorB, eyeColor: EMOTION_PROFILES.calm.eyeColor,
  userPresent: false, micro: undefined,
};

type Listener = (s: PresenceState) => void;

class PresenceEngine {
  private listeners = new Set<Listener>();
  private state: PresenceState = { ...BASELINE };
  private timer: ReturnType<typeof setInterval> | null = null;
  private tickCount = 0;
  private dirty = true;

  // مزج المشاعر
  private fromProfile: EmotionVisualProfile = EMOTION_PROFILES.calm;
  private toProfile: EmotionVisualProfile = EMOTION_PROFILES.calm;
  private blendStart = 0;
  private readonly blendDur = 600;
  private intensityVal = 0.6;
  private lastSetEmotionTs = 0;

  // أحداث حية
  private micro: { type: string; intensity: number; ts: number } | null = null;
  private echoTs = 0;
  private wanderSeed = Math.random() * 100;

  // ── العقد العام ──
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 100);
  }
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    try { fn(this.getSnapshot()); } catch {}
    return () => { this.listeners.delete(fn); };
  }
  getSnapshot(): PresenceState { return { ...this.state }; }

  setEmotion(emotion: string, intensity = 0.6): void {
    const target = getProfile(emotion);
    this.fromProfile = this.currentProfile();
    this.toProfile = target;
    this.blendStart = Date.now();
    this.intensityVal = c01(intensity, 0.6);
    this.lastSetEmotionTs = Date.now();
    this.dirty = true;
  }

  addMicroExpression(type: string, intensity = 0.7): void {
    this.micro = { type: String(type || 'head_nod'), intensity: c01(intensity, 0.7), ts: Date.now() };
    this.dirty = true;
  }

  triggerMemoryEcho(): void {
    this.echoTs = Date.now();
    this.dirty = true;
  }

  // ── الداخل ──
  private currentProfile(): EmotionVisualProfile {
    const t = c01((Date.now() - this.blendStart) / this.blendDur);
    return t >= 1 ? this.toProfile : blendProfiles(this.fromProfile, this.toProfile, t);
  }

  private tick(): void {
    this.tickCount += 1;
    const now = Date.now();
    const bus = stateBus.getState();

    // 1) الملف البصري: صريح حديثًا، وإلا مشتق من الحافلة
    if (now - this.lastSetEmotionTs > 30000) {
      const derived = profileFromValence(Number(bus.emotionValence ?? 0), Number(bus.arousal ?? 0.3), Number(bus.focus ?? 0.5), !!bus.thinking);
      if (derived.key !== this.toProfile.key) {
        this.fromProfile = this.currentProfile();
        this.toProfile = derived;
        this.blendStart = now;
      }
    }
    const prof = this.currentProfile();
    const patch = profileToPresencePatch(prof, this.intensityVal);

    // 2) البيئة عبر الـ Reactor
    const env: EnvSnapshot = {
      ambientLight: bus.ambientLight, noise: bus.voiceLevel, motion: bus.movement,
      proximity: bus.proximity, userPresent: !!bus.userPresent,
      listening: !!bus.listening, speaking: !!bus.speaking, thinking: !!bus.thinking,
    };
    const merged = applyModsToPatch(patch, reactToEnvironment(env));

    // 3) أحداث حية: صدى ذاكرة + تعابير دقيقة
    const echo = now - this.echoTs < 3000;
    const microFresh = !!this.micro && now - this.micro.ts < 1200;
    const microType = microFresh ? this.micro!.type : '';

    // 4) طاقة مركّبة (حافلة + انحياز شعور + صدى)
    const energy = c01(Number(bus.energy ?? 0.55) + (prof.energyBias ?? 0) * 0.5 + (echo ? 0.12 : 0));

    // 5) نظر: حافلة + تجوال ذاتي بطيء (حياة)
    const wx = Math.sin(now / 4700 + this.wanderSeed) * 0.22 + Math.sin(now / 9100) * 0.1;
    const wy = Math.cos(now / 5300 + this.wanderSeed) * 0.14;
    const gazeX = c11(c11(bus.gazeX) * 0.7 + wx * 0.3);
    const gazeY = c11(c11(bus.gazeY) * 0.7 + wy * 0.3);

    // 6) لمسات الأحداث على الحقائص
    let warmth = c01(Number(merged.warmth ?? prof.warmth));
    let attention = c01(Number(merged.attention ?? prof.attention));
    let anticipation = c01(Number(merged.anticipation ?? prof.anticipation));
    let turbulence = c01(Number(merged.turbulence ?? prof.turbulence));
    if (microType === 'head_nod') { warmth = c01(warmth + 0.15); attention = c01(attention + 0.1); }
    if (microType === 'membrane_shiver') turbulence = c01(turbulence + 0.18);
    if (echo) anticipation = c01(anticipation + 0.2);

    this.state = {
      ...this.state,
      ...merged,
      emotion: prof.key,
      energy, gazeX, gazeY, warmth, attention, anticipation, turbulence,
      voiceLevel: c01(bus.voiceLevel), speaking: !!bus.speaking, listening: !!bus.listening, thinking: !!bus.thinking,
      userPresent: !!bus.userPresent,
      micro: microFresh ? microType : undefined,
    };

    // 7) إشعار 5Hz أو عند حدث
    if (this.dirty || this.tickCount % 2 === 0) {
      this.dirty = false;
      const snap = this.getSnapshot();
      this.listeners.forEach((l) => { try { l(snap); } catch {} });
    }
  }
}

export const presenceEngine = new PresenceEngine();
export default presenceEngine;
