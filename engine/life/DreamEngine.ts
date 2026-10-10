import { stateBus } from '../../src/core/StateBus';
import { audioEngine } from '../../src/core/AudioEngine';

export interface Dream {
  id: string;
  content: string;
  emotion: string;
  timestamp: string;
  shared: boolean;
}

/** Backend-owned dream adapter. The client only presents explicit dream data. */
export class DreamEngine {
  private dreams: Dream[] = [];
  private isSleeping = false;

  start(): void { /* lifecycle compatibility; no autonomous generation */ }
  stop(): void { this.isSleeping = false; }
  setSleeping(sleeping: boolean): void { this.isSleeping = sleeping; }

  presentDream(input: Omit<Dream, 'id' | 'timestamp' | 'shared'> & Partial<Pick<Dream, 'id' | 'timestamp' | 'shared'>>): Dream {
    const dream: Dream = {
      id: input.id || `dream_${Date.now()}`,
      content: String(input.content || ''),
      emotion: String(input.emotion || 'neutral'),
      timestamp: input.timestamp || new Date().toISOString(),
      shared: input.shared ?? true,
    };
    this.dreams.push(dream);
    stateBus.emit('dream:shared', dream);
    audioEngine.play('memory_whisper').catch(() => {});
    return dream;
  }

  getLastDream(): Dream | null { return this.dreams.length ? this.dreams[this.dreams.length - 1] : null; }
  isActive(): boolean { return this.isSleeping; }
}

export const dreamEngine = new DreamEngine();
