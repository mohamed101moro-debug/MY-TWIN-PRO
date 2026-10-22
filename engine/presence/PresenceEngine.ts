/**
 * PresenceEngine v2.3 — canonical presence state producer.
 * Backend/unified emotion remains authoritative until a newer authoritative update arrives.
 * Renderer never reads sensors directly.
 */
import type { PresenceState } from './PresenceTypes';
import { EMOTION_PROFILES, getProfile, blendProfiles, profileToPresencePatch } from './EmotionToVisualMapper';
import type { EmotionVisualProfile } from './EmotionToVisualMapper';
import { reactToEnvironment, applyModsToPatch } from './EnvironmentalReactor';
import type { EnvSnapshot } from './EnvironmentalReactor';
import { stateBus } from '../../src/core/StateBus';

const c01 = (n: unknown, fb = 0): number => { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb; };
const c11 = (n: unknown, fb = 0): number => { const v = Number(n); return Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : fb; };

/** S3P projection: backend meaning changes presentation only.
 * It never creates an emotion, command, speech, or autonomous action.
 */
const projectBrainMeaning = (meaning: any, patch: any) => {
  const need = String(meaning?.implied_need ?? 'none');
  if (need === 'reduced_activity') {
    patch.fieldSpeed = c01(Number(patch.fieldSpeed ?? 0.4) * 0.72);
    patch.turbulence = c01(Number(patch.turbulence ?? 0.18) * 0.72);
    patch.breathing = c01(Number(patch.breathing ?? 0.4) * 0.82);
    patch.pulse = c01(Number(patch.pulse ?? 0.4) * 0.86);
  } else if (need === 'reduced_presence') {
    patch.fieldOpacity = c01(Number(patch.fieldOpacity ?? 0.85) * 0.78);
    patch.fieldSpeed = c01(Number(patch.fieldSpeed ?? 0.4) * 0.82);
    patch.attention = c01(Number(patch.attention ?? 0.5) * 0.78);
  } else if (need === 'maintain_continuity') {
    patch.attention = c01(Number(patch.attention ?? 0.5) + 0.10);
  } else if (need === 'observe_only') {
    patch.attention = c01(Number(patch.attention ?? 0.5) + 0.05);
  }
  return patch;
};

const BASELINE: PresenceState = {
  emotion: 'calm', intensity: 0.6, emotionSource: 'default', emotionUpdatedAt: 0,
  energy: 0.55, pulse: 0.4, breathing: 0.4, eyeOpenness: 0.85, eyeGlow: 0.88, pupilSize: 0.42, gazeX: 0, gazeY: 0,
  warmth: 0.35, attention: 0.5, anticipation: 0.25, voiceLevel: 0, speaking: false, listening: false, thinking: false,
  fieldSpeed: 0.4, turbulence: 0.18, orbitality: 0.68, fieldRadius: 1, fieldOpacity: 0.85,
  colorA: EMOTION_PROFILES.calm.colorA, colorB: EMOTION_PROFILES.calm.colorB, eyeColor: EMOTION_PROFILES.calm.eyeColor,
  userPresent: false, micro: undefined, conversationState: 'idle', ambientLight: 0.5, noise: 0.2, motion: 0, proximity: 0.5,
  night: false, camera: false, gazeLock: false, batteryLevel: 1, isCharging: false, performanceTier: 1,
};

type Listener = (s: PresenceState) => void;
export class PresenceEngine {
  private listeners = new Set<Listener>();
  private state: PresenceState = { ...BASELINE };
  private timer: ReturnType<typeof setInterval> | null = null;
  private tickCount = 0;
  private dirty = true;
  private fromProfile: EmotionVisualProfile = EMOTION_PROFILES.calm;
  private toProfile: EmotionVisualProfile = EMOTION_PROFILES.calm;
  private blendStart = 0;
  private readonly blendDur = 600;
  private intensityVal = 0.6;
  private lastAppliedEmotionTs = 0;
  private micro: { type: string; intensity: number; ts: number } | null = null;
  private echoTs = 0;
  private readonly wanderSeed = 17.0;
  private conv: PresenceState['conversationState'] = 'idle';
  private prevThinking = false;
  private lastThinkEnd = 0;
  private stateUnsubs: Array<() => void> = [];

  start(): void {
    if (this.timer) return;
    this.stateUnsubs.push(stateBus.on('emotion:changed', (payload: any) => {
      const emotion = String(payload?.emotion ?? stateBus.getState().emotion?.primaryEmotion ?? 'calm');
      const ts = Number(payload?.updatedAt ?? stateBus.getState().emotionUpdatedAt ?? Date.now());
      this.setEmotion(emotion, Number(payload?.intensity ?? stateBus.getState().emotion?.intensity ?? 0.6), String(payload?.source ?? stateBus.getState().emotionSource ?? 'backend'), ts);
    }));
    this.stateUnsubs.push(stateBus.on('memory:surfaced', () => this.triggerMemoryEcho()));
    this.stateUnsubs.push(stateBus.subscribeKeys(['brainMeaning'], () => { this.dirty = true; }));
    this.timer = setInterval(() => this.tick(), 100);
  }
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.stateUnsubs.forEach((u) => { try { u(); } catch {} });
    this.stateUnsubs = [];
  }
  subscribe(fn: Listener): () => void { this.listeners.add(fn); try { fn(this.getSnapshot()); } catch {} return () => this.listeners.delete(fn); }
  getSnapshot(): PresenceState { return { ...this.state }; }

  setEmotion(emotion: string, intensity = 0.6, source = 'local', updatedAt = Date.now()): void {
    const ts = Number(updatedAt);
    if (!Number.isFinite(ts) || ts < this.lastAppliedEmotionTs) return;
    this.fromProfile = this.currentProfile();
    this.toProfile = getProfile(String(emotion || 'calm'));
    this.blendStart = Date.now();
    this.intensityVal = c01(intensity, 0.6);
    this.lastAppliedEmotionTs = ts;
    this.state = { ...this.state, emotion: this.toProfile.key, intensity: this.intensityVal, emotionSource: String(source || 'local'), emotionUpdatedAt: ts };
    this.dirty = true;
  }
  addMicroExpression(type: string, intensity = 0.7): void { this.micro = { type: String(type || 'head_nod'), intensity: c01(intensity, 0.7), ts: Date.now() }; this.dirty = true; }
  triggerMemoryEcho(): void { this.echoTs = Date.now(); this.dirty = true; }
  reset(): void { this.state = { ...BASELINE }; this.fromProfile = EMOTION_PROFILES.calm; this.toProfile = EMOTION_PROFILES.calm; this.blendStart = 0; this.intensityVal = 0.6; this.lastAppliedEmotionTs = 0; this.micro = null; this.echoTs = 0; this.conv = 'idle'; this.prevThinking = false; this.lastThinkEnd = 0; this.dirty = true; }

  private currentProfile(): EmotionVisualProfile {
    const t = c01((Date.now() - this.blendStart) / this.blendDur);
    return t >= 1 ? this.toProfile : blendProfiles(this.fromProfile, this.toProfile, t);
  }

  private tick(): void {
    this.tickCount += 1;
    const now = Date.now();
    const bus = stateBus.getState();
    const busEmotionTs = Number(bus.emotionUpdatedAt ?? bus.emotion?.updatedAt ?? 0);
    // No TTL fallback: elapsed time must never invent a replacement emotion.
    if (bus.emotion?.primaryEmotion && Number.isFinite(busEmotionTs) && busEmotionTs > this.lastAppliedEmotionTs) {
      this.setEmotion(String(bus.emotion.primaryEmotion), Number(bus.emotion.intensity ?? 0.6), String(bus.emotionSource ?? bus.emotion.source ?? 'backend'), busEmotionTs);
    }

    const prof = this.currentProfile();
    const patch = profileToPresencePatch(prof, this.intensityVal);
    const env: EnvSnapshot = {
      ambientLight: c01(bus.ambientLight, 0.5), noise: c01(bus.voiceLevel, 0), motion: c01(bus.movement, 0), proximity: c01(bus.proximity, 0.5),
      userPresent: !!bus.userPresent, listening: !!bus.listening, speaking: !!bus.speaking, thinking: !!bus.thinking,
      night: !!bus.night, camera: !!bus.camera,
    };
    const merged = applyModsToPatch(patch, reactToEnvironment(env));
    projectBrainMeaning(bus.brainMeaning, merged);
    const echo = now - this.echoTs < 3000;
    const microFresh = !!this.micro && now - this.micro.ts < 1200;
    const microType = microFresh ? this.micro!.type : '';
    const energy = c01(Number(bus.energy ?? 0.55) + (prof.energyBias ?? 0) * 0.5 + (echo ? 0.12 : 0));
    const wx = Math.sin(now / 4700 + this.wanderSeed) * 0.22 + Math.sin(now / 9100) * 0.1;
    const wy = Math.cos(now / 5300 + this.wanderSeed) * 0.14;
    const gazeX = c11(c11(bus.gazeX) * 0.7 + wx * 0.3);
    const gazeY = c11(c11(bus.gazeY) * 0.7 + wy * 0.3);
    let warmth = c01(Number(merged.warmth ?? prof.warmth));
    let attention = c01(Number(merged.attention ?? prof.attention));
    let anticipation = c01(Number(merged.anticipation ?? prof.anticipation));
    let turbulence = c01(Number(merged.turbulence ?? prof.turbulence));
    if (microType === 'head_nod') { warmth = c01(warmth + 0.15); attention = c01(attention + 0.1); }
    if (microType === 'membrane_shiver') turbulence = c01(turbulence + 0.18);
    if (echo) anticipation = c01(anticipation + 0.2);

    if (!!bus.listening) this.conv = 'listening';
    else if (!!bus.thinking) this.conv = 'processing';
    else if (!!bus.speaking) this.conv = 'responding';
    else { if (this.prevThinking && !bus.thinking) this.lastThinkEnd = now; this.conv = (this.lastThinkEnd && now - this.lastThinkEnd < 1200) ? 'understanding' : 'idle'; }
    this.prevThinking = !!bus.thinking;

    this.state = {
      ...this.state, ...merged, emotion: prof.key, intensity: this.intensityVal, emotionSource: this.state.emotionSource,
      emotionUpdatedAt: this.lastAppliedEmotionTs, energy, gazeX, gazeY, warmth, attention, anticipation, turbulence,
      voiceLevel: c01(bus.voiceLevel), speaking: !!bus.speaking, listening: !!bus.listening, thinking: !!bus.thinking,
      userPresent: !!bus.userPresent, micro: microFresh ? microType : undefined, conversationState: this.conv,
      ambientLight: env.ambientLight, noise: env.noise, motion: env.motion, proximity: env.proximity, night: env.night, camera: env.camera,
      gazeLock: !!env.night && !env.userPresent && !bus.listening && !bus.speaking,
      batteryLevel: c01(bus.batteryLevel, 1), isCharging: !!bus.isCharging, performanceTier: Math.max(0.5, Math.min(1, Number(bus.performanceTier ?? 1))), reducedMotion: !!bus.reducedMotion,
    };
    if (this.dirty || this.tickCount % 2 === 0) { this.dirty = false; const snap = this.getSnapshot(); this.listeners.forEach((l) => { try { l(snap); } catch {} }); }
  }
  startPresenceLoop(): void { this.start(); }
  stopPresenceLoop(): void { this.stop(); }
  applyLifeRhythm(): void { const st = stateBus.getState(); const e = c01(st.energy, 0.55); this.state = { ...this.state, breathing: Math.max(0.15, Math.min(1, 0.3 + e * 0.4)), pulse: Math.max(0.15, Math.min(1, 0.3 + e * 0.5)) }; this.dirty = true; }
}
export const presenceEngine = new PresenceEngine();
export default presenceEngine;
