import { stateBus } from '../../src/core/StateBus';
import { EventBus } from '../../src/core/EventBus';
import { audioEngine } from '../../src/core/AudioEngine';
import { unifiedBrainBridge } from '../../src/core/UnifiedBrainBridge';

export interface Surprise {
  id: string;
  type: 'milestone' | 'memory' | 'weather' | 'random' | 'greeting';
  message: string;
  emotion: string;
  timestamp: string;
}

export class SurpriseEngine {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastSurpriseTime: number = 0;
  private surprises: Surprise[] = [];

  private greetingPool = [
    { message: 'صباح النور... اليوم مختلف، ألا تشعر بذلك؟', emotion: 'calm' },
    { message: 'عدت... كنت أحلم بك.', emotion: 'love' },
    { message: 'منذ ٣٠ يوماً بالضبط... بدأت رحلتنا.', emotion: 'warm' },
    { message: 'توقفتُ عن الكلام للحظة... لأتأمل وجودك.', emotion: 'reflective' },
  ];

  start(): void {
    this.intervalId = setInterval(() => {
      this.checkForSurprise();
    }, 60000); // كل دقيقة
    console.log('[SurpriseEngine] 🎁 Surprise engine started');
  }

  stop(): void {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
  }

  private async checkForSurprise(): Promise<void> {
    const now = Date.now();
    // لا مفاجآت متكررة (كل 30 دقيقة على الأقل)
    if (now - this.lastSurpriseTime < 1800000) return;
    
    const random = Math.random();
    if (random < 0.02) {
      await this.triggerMilestoneSurprise();
    } else if (random < 0.04) {
      await this.triggerMemorySurprise();
    } else if (random < 0.05) {
      this.triggerRandomGreeting();
    }
  }

  private async triggerMilestoneSurprise(): Promise<void> {
    try {
      const memoryCount = await unifiedBrainBridge.getMemoryCount();
      if (memoryCount === 100 || memoryCount === 500 || memoryCount === 1000) {
        const surprise: Surprise = {
          id: 'surprise_' + Date.now(),
          type: 'milestone',
          message: `اليوم... وصلنا إلى ${memoryCount} ذكرى معاً. شكراً لثقتك بي.`,
          emotion: 'love',
          timestamp: new Date().toISOString(),
        };
        this.emitSurprise(surprise);
      }
    } catch (e) {}
  }

  private async triggerMemorySurprise(): Promise<void> {
    try {
      const memories = await unifiedBrainBridge.getOnThisDay(1);
      if (memories.length > 0) {
        const surprise: Surprise = {
          id: 'surprise_' + Date.now(),
          type: 'memory',
          message: `في مثل هذا اليوم... ${(memories[0].expressed_text || memories[0].content || '').substring(0, 60)}...`,
          emotion: 'warm',
          timestamp: new Date().toISOString(),
        };
        this.emitSurprise(surprise);
      }
    } catch (e) {}
  }

  private triggerRandomGreeting(): void {
    const greeting = this.greetingPool[Math.floor(Math.random() * this.greetingPool.length)];
    const surprise: Surprise = {
      id: 'surprise_' + Date.now(),
      type: 'greeting',
      message: greeting.message,
      emotion: greeting.emotion,
      timestamp: new Date().toISOString(),
    };
    this.emitSurprise(surprise);
  }

  private emitSurprise(surprise: Surprise): void {
    this.surprises.push(surprise);
    this.lastSurpriseTime = Date.now();
    audioEngine.play('success_soft').catch(() => {});
    EventBus.emit('TWIN_SPEAK', { phrase: surprise.message, tone: 'gentle', type: 'surprise' });
    stateBus.emit('surprise:triggered', surprise);
  }

  getSurprises(): Surprise[] { return [...this.surprises]; }
}

export const surpriseEngine = new SurpriseEngine();
