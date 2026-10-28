import { stateBus } from '../../src/core/StateBus';
import { EventBus } from '../../src/core/EventBus';
import { bootstrapCoordinator } from '../../src/core/BootstrapCoordinator';

/**
 * SoulKernel is a lifecycle/status façade only.
 * BootstrapCoordinator is the single owner of frontend presence startup/shutdown.
 * Engines must be registered with their owning coordinator, never started here in parallel.
 */
export type SoulState = 'awakening' | 'alive' | 'resting' | 'dreaming' | 'exhausted' | 'evolving';

export interface SoulStatus {
  state: SoulState;
  startedAt: number;
  uptime: number;
  activeEngines: number;
  totalEngines: number;
  lastError: string | null;
}

class SoulKernel {
  private startedAt = 0;
  private status: SoulStatus = {
    state: 'resting', startedAt: 0, uptime: 0,
    activeEngines: 0, totalEngines: 0, lastError: null,
  };
  private awakening: Promise<SoulStatus> | null = null;

  async awaken(): Promise<SoulStatus> {
    if (this.status.state === 'alive') return this.getStatus();
    if (this.awakening) return this.awakening;
    this.awakening = (async () => {
      this.status = { ...this.status, state: 'awakening', lastError: null };
      try {
        await bootstrapCoordinator.bootstrap();
        this.startedAt = Date.now();
        this.status = {
          state: 'alive', startedAt: this.startedAt, uptime: 0,
          // BootstrapCoordinator currently owns the presence lifecycle as one unit.
          activeEngines: 1, totalEngines: 1, lastError: null,
        };
        stateBus.emit('soul:awakened', this.status);
        EventBus.emit('SOUL_AWAKENED', this.status);
      } catch (error: any) {
        this.status = { ...this.status, state: 'resting', lastError: String(error?.message || error) };
        throw error;
      } finally {
        this.awakening = null;
      }
      return this.getStatus();
    })();
    return this.awakening;
  }

  async shutdown(): Promise<void> {
    bootstrapCoordinator.stop();
    this.status = { ...this.status, state: 'resting', activeEngines: 0, uptime: 0 };
    stateBus.emit('soul:shutdown', this.status);
  }

  getStatus(): SoulStatus {
    return {
      ...this.status,
      uptime: this.status.state === 'alive' && this.startedAt ? Date.now() - this.startedAt : 0,
    };
  }

  isAlive(): boolean { return this.status.state === 'alive'; }
}

export const soulKernel = new SoulKernel();
