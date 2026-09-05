/** VisualState v1.2 — الطبقة الوسيطة الوحيدة: PresenceState + Env ⇒ VisualState ⇒ Renderer */
import { mapEmotion } from './EmotionToVisualMapper';
import type { EmotionVisualProfile } from './EmotionToVisualMapper';
import { reactToEnvironment } from './EnvironmentalReactor';
import type { EnvSnapshot } from './EnvironmentalReactor';
import type { PresenceState, RGB } from './PresenceTypes';
export type EnvironmentalContext = EnvSnapshot;
const c01 = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, Number.isFinite(n) ? n : a));
const toHex = (c: RGB): string => '#' + [c.r, c.g, c.b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('').toUpperCase();
export interface VisualState {
  energy: number; breathing: number; pulse: number; awaken: number;
  fieldSpeed: number; turbulence: number; orbitality: number; fieldRadius: number; ambientLight: number;
  colorA: string; colorB: string; glowColor: string; irisA: string; irisB: string;
  eyeOpenness: number; eyeGlow: number; pupilSize: number; gazeX: number; gazeY: number;
  browRaise: number; tearOpacity: number; squint: number; thinkingMul: number; mouthCurve: number;
  auraIntensity: number; haloOpacity: number; particleCount: number; particleSpeed: number; coreGlow: number;
  blurMod: number; voiceLevel: number; listening: boolean; speaking: boolean; thinking: boolean;
  emotion: string; convState: string;
}
export function buildVisualState(presence: PresenceState | null, env?: EnvSnapshot, awaken = 1): VisualState {
  const emotion = String(presence?.emotion ?? 'calm');
  const convState = presence?.conversationState ?? (presence?.speaking ? 'responding' : presence?.listening ? 'listening' : presence?.thinking ? 'processing' : 'idle');
  const P: EmotionVisualProfile = mapEmotion(emotion);
  const E: EnvSnapshot = env ?? { ambientLight: 0.5, noise: 0.2, motion: 0, proximity: 0.3, userPresent: false, camera: false, listening: false, speaking: false, thinking: false, night: false };
  const mod = reactToEnvironment(E);
  const energy = c01((presence?.energy ?? 0.55) + (P.energyBias ?? 0) * 0.3);
  const fieldSpeed = c01((P.fieldSpeed ?? 0.4) * (presence?.speaking ? 1.3 : presence?.thinking ? 0.5 : 1) * (convState === 'processing' ? 1.4 : 1), 0.05, 2);
  return {
    energy, breathing: c01((P.breathRate ?? 0.4) * (1 - mod.breathSlow * 0.4)),
    pulse: c01((P.pulseRate ?? 0.4) + (convState === 'processing' ? 0.25 : 0) + (convState === 'responding' ? 0.2 : 0)),
    awaken: c01(awaken),
    fieldSpeed, turbulence: c01((P.turbulence ?? 0.18) * (0.8 + mod.tremble * 0.8), 0.05, 1),
    orbitality: c01(P.orbitality ?? 0.68, 0.2, 0.95),
    fieldRadius: c01((presence?.fieldRadius ?? 1) * mod.haloSpread, 0.5, 1.7),
    ambientLight: c01(E.ambientLight ?? 0.5),
    colorA: P.primary, colorB: P.secondary, glowColor: P.glow, irisA: toHex(P.eyeColor), irisB: P.secondary,
    eyeOpenness: c01((P.eyeOpenness ?? 0.85) * (convState === 'listening' ? 1.05 : 1), 0.05, 1.2),
    eyeGlow: c01((P.eyeGlow ?? 0.88) * (0.85 + mod.eyeGlow * 0.5)),
    pupilSize: c01((P.pupilSize ?? 0.42) + (1 - (E.ambientLight ?? 0.5)) * 0.15),
    gazeX: mod.gazeLock ? 0 : c01(presence?.gazeX ?? 0, -1, 1), gazeY: mod.gazeLock ? 0 : c01(presence?.gazeY ?? 0, -1, 1),
    browRaise: P.browRaise ?? 0.1, tearOpacity: P.key === 'sad' ? 0.6 : 0, squint: P.key === 'angry' ? 0.4 : 0,
    thinkingMul: !!presence?.thinking ? 0.72 : 1, mouthCurve: P.mouthCurve ?? 0.3,
    auraIntensity: c01((P.auraIntensity ?? 0.5) * (0.7 + energy * 0.5) * mod.glowMul),
    haloOpacity: c01(0.25 + energy * 0.35),
    particleCount: Math.round((80 + energy * 120 + (presence?.anticipation ?? 0.25) * 50) * (P.particleDensity ?? 1)),
    particleSpeed: c01(fieldSpeed * (1 - mod.particleCalm * 0.5), 0.05, 2),
    coreGlow: c01(0.4 + energy * 0.4 + (convState === 'processing' ? 0.25 : 0) + (convState === 'responding' ? 0.2 : 0)),
    blurMod: mod.glowMul, voiceLevel: c01(presence?.voiceLevel ?? 0),
    listening: !!presence?.listening, speaking: !!presence?.speaking, thinking: !!presence?.thinking,
    emotion, convState,
  };
}
export function visualStatesEqual(a: VisualState, b: VisualState): boolean {
  return a.emotion === b.emotion && a.convState === b.convState && a.awaken === b.awaken &&
    Math.abs(a.energy - b.energy) < 0.02 && Math.abs(a.eyeOpenness - b.eyeOpenness) < 0.02 && Math.abs(a.blurMod - b.blurMod) < 0.05;
}
