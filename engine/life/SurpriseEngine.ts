import { stateBus } from '../../src/core/StateBus';
import { EventBus } from '../../src/core/EventBus';
import { audioEngine } from '../../src/core/AudioEngine';

export interface Surprise {
  id: string;
  type: 'milestone' | 'memory' | 'weather' | 'random' | 'greeting';
  message: string;
  emotion: string;
  timestamp: string;
}

/** Backend-owned surprise adapter. No client-side random/proactive speech. */
export class SurpriseEngine {
  private surprises: Surprise[] = [];

  start(): void { /* lifecycle compatibility; no autonomous timer */ }
  stop(): void { /* no timer to stop */ }

  presentSurprise(input: Omit<Surprise, 'id' | 'timestamp'> & Partial<Pick<Surprise, 'id' | 'timestamp'>>): Surprise {
    const surprise: Surprise = {
      id: input.id || `surprise_${Date.now()}`,
      type: input.type,
      message: String(input.message || ''),
      emotion: String(input.emotion || 'neutral'),
      timestamp: input.timestamp || new Date().toISOString(),
    };
    this.surprises.push(surprise);
    audioEngine.play('success_soft').catch(() => {});
    EventBus.emit('TWIN_SPEAK', { phrase: surprise.message, tone: 'gentle', type: 'surprise' });
    stateBus.emit('surprise:triggered', surprise);
    return surprise;
  }

  getSurprises(): Surprise[] { return [...this.surprises]; }
}

export const surpriseEngine = new SurpriseEngine();
