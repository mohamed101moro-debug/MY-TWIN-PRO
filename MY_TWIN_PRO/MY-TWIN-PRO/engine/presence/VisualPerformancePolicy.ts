/**
 * S6V.9 — deterministic rendering policy.
 *
 * Presentation-only. This policy never creates entity state; it only decides
 * how much visual work the renderer may spend on an already-derived state.
 */
import type { PresenceState } from './PresenceTypes';

export type VisualPerformanceTier = 'ultra' | 'high' | 'balanced' | 'low';

export interface VisualPerformanceProfile {
  readonly tier: VisualPerformanceTier;
  readonly normalizedTier: number;
  readonly targetFps: 30 | 45 | 60;
  readonly particleBudget: number;
  readonly animationScale: number;
  readonly blurScale: number;
  readonly reducedMotion: boolean;
}

const clamp01 = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
};

export function deriveVisualPerformanceProfile(presence: Pick<PresenceState, 'performanceTier' | 'batteryLevel' | 'isCharging'> & { reducedMotion?: boolean } | null | undefined): VisualPerformanceProfile {
  const p = presence ?? {};
  const battery = clamp01(p.batteryLevel, 1);
  const charging = !!p.isCharging;
  const raw = clamp01(p.performanceTier, 1);
  const effective = !charging && battery <= 0.12 ? Math.min(raw, 0.5) : raw;
  const tier: VisualPerformanceTier = effective >= 0.95 ? 'ultra' : effective >= 0.82 ? 'high' : effective >= 0.65 ? 'balanced' : 'low';
  const profiles: Record<VisualPerformanceTier, Omit<VisualPerformanceProfile, 'tier' | 'reducedMotion'>> = {
    ultra: { normalizedTier: 1, targetFps: 60, particleBudget: 200, animationScale: 1, blurScale: 1 },
    high: { normalizedTier: 0.88, targetFps: 60, particleBudget: 160, animationScale: 0.95, blurScale: 0.9 },
    balanced: { normalizedTier: 0.72, targetFps: 45, particleBudget: 115, animationScale: 0.82, blurScale: 0.72 },
    low: { normalizedTier: 0.55, targetFps: 30, particleBudget: 70, animationScale: 0.65, blurScale: 0.5 },
  };
  return { tier, ...profiles[tier], reducedMotion: !!p.reducedMotion };
}

/** Deterministic phase offset; no random source is permitted in S6V. */
export function deterministicVisualPhase(entitySeed: string, channel: string): number {
  const input = `${entitySeed}|${channel}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
  return (hash >>> 0) / 4294967296;
}
