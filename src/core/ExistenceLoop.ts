import { AppState, AppStateStatus } from 'react-native';
import { lifeStateEngine } from '../../engine/life/LifeStateEngine';
import { lifeRhythmEngine } from '../../engine/life/LifeRhythmEngine';
import { dreamEngine } from '../../engine/life/DreamEngine';
import { presenceEngine } from '../../engine/presence/PresenceEngine';
import { EventBus } from './EventBus';
import { stateBus } from './StateBus';

/**
 * SSA-002: physical existence/evidence loop.
 *
 * The device owns observation and lifecycle timing only. It never decides a
 * lifecycle intention. Backend is the authoritative classifier/policy layer.
 * This boundary is deliberate: Sensor ≠ Meaning and Capability ≠ Entity.
 */
export class ExistenceLoop {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private slowIntervalId: ReturnType<typeof setInterval> | null = null;
  private verySlowIntervalId: ReturnType<typeof setInterval> | null = null;
  private appSub: { remove: () => void } | null = null;
  private running = false;

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    lifeRhythmEngine.start();
    this.resume();
    this.appSub = AppState.addEventListener('change', s => this.onApp(s));
    console.log('[ExistenceLoop] 🧬 The Twin body is alive (evidence-only).');
    this.emitEvidence();
  }

  stop(): void {
    this.pause();
    lifeRhythmEngine.stop();
    dreamEngine.setSleeping(false);
    this.appSub?.remove();
    this.appSub = null;
    this.running = false;
    stateBus.update({ isOnline: false, interfaceState: 'dormant' });
  }

  private onApp(s: AppStateStatus): void {
    if (s === 'active') {
      if (!this.intervalId) this.resume();
      return;
    }
    if (s === 'background') this.pause();
  }

  private resume(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(), 1000);
    this.slowIntervalId = setInterval(() => this.slowTick(), 30000);
    this.verySlowIntervalId = setInterval(() => this.deepTick(), 300000);
  }

  private pause(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.slowIntervalId) clearInterval(this.slowIntervalId);
    if (this.verySlowIntervalId) clearInterval(this.verySlowIntervalId);
    this.intervalId = this.slowIntervalId = this.verySlowIntervalId = null;
  }

  private tick(): void {
    // Legacy physical animation may continue locally, but it cannot write
    // cognitive meaning or lifecycle decisions into canonical backend state.
    lifeStateEngine.update();
    presenceEngine.applyLifeRhythm();
  }

  private slowTick(): void {
    const rhythm = lifeRhythmEngine.getState();
    dreamEngine.setSleeping(Boolean(rhythm.isDeepSleep || rhythm.phase === 'dawn'));
    this.emitEvidence();
  }

  private deepTick(): void {
    this.emitEvidence();
  }

  private emitEvidence(): void {
    const rhythm = lifeRhythmEngine.getState();
    const now = Date.now();
    EventBus.emit('LIFE_EVIDENCE', {
      timestamp: now,
      evidence: {
        phase: rhythm.phase,
        energy: Number(rhythm.energy ?? stateBus.getState().energy ?? 0.5),
        should_rest: Boolean(rhythm.shouldRest),
        is_deep_sleep: Boolean(rhythm.isDeepSleep),
      },
    });
  }
}

export const existenceLoop = new ExistenceLoop();
