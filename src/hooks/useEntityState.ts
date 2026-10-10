import { useEffect, useState } from 'react';
import { presenceEngine } from '../core/PresenceBridge';
import type { PresenceState } from '../../engine/presence/PresenceTypes';
const safe01 = (n: unknown, fallback = 0) => { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback; };
export function presenceToEntity(pres: PresenceState | null) {
  const p = pres || {};
  return { emotion: String(p.emotion ?? 'calm'), energy: safe01(p.energy, 0.55), speaking: !!p.speaking, listening: !!p.listening, thinking: !!p.thinking,
    eyeOpenness: safe01(p.eyeOpenness, 0.85), eyeGlow: safe01(p.eyeGlow, 0.88), pupilSize: safe01(p.pupilSize, 0.42), gazeX: Math.max(-1, Math.min(1, Number(p.gazeX ?? 0))), gazeY: Math.max(-1, Math.min(1, Number(p.gazeY ?? 0))), warmth: safe01(p.warmth, 0.35), colorA: p.colorA, colorB: p.colorB, eyeColor: p.eyeColor, isDark: false };
}
export type EntityState = ReturnType<typeof presenceToEntity>;
export function useEntityState(): { state: EntityState } {
  const [state, setState] = useState<EntityState>(() => presenceToEntity(presenceEngine.getSnapshot()));
  useEffect(() => presenceEngine.subscribe((s) => setState(presenceToEntity(s))), []);
  return { state };
}
export default useEntityState;
