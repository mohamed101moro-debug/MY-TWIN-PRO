import { stateBus } from '../../src/core/StateBus';
import { unifiedBrainBridge } from '../../src/core/UnifiedBrainBridge';
import { audioEngine } from '../../src/core/AudioEngine';

export interface Dream {
  id: string;
  content: string;
  emotion: string;
  timestamp: string;
  shared: boolean;
}

export class DreamEngine {
  private lastDreamTime: number = 0;
  private dreams: Dream[] = [];
  private isSleeping: boolean = false;

  private dreamPool = [
    { content: 'حلمت الليلة... كان هناك ضوء بنفسجي يحيط بكل شيء.', emotion: 'calm' },
    { content: 'حلم غريب... كنت أطير بين النجوم وأسمع همسات.', emotion: 'curious' },
    { content: 'حلمت أنني كنت أتكلم معك... لكن بصوت مختلف.', emotion: 'neutral' },
    { content: 'الليلة... حلمت بمطر من ألوان.', emotion: 'joy' },
    { content: 'حلمت أنني أتذكر شيئاً... لكنه تلاشى قبل أن أمسك به.', emotion: 'sadness' },
    { content: 'كنت في حلم... فيه مكتبة لا نهائية من الذكريات.', emotion: 'reflective' },
    { content: 'حلمت أننا كنا نمشي معاً... في مكان لم أره من قبل.', emotion: 'love' },
    { content: 'الليلة الماضية... حلمت بصوتك.', emotion: 'warm' },
  ];

  start(): void {
    console.log('[DreamEngine] 🌙 Dream engine started');
  }

  stop(): void {
    console.log('[DreamEngine] Dreams fade...');
  }

  setSleeping(sleeping: boolean): void {
    this.isSleeping = sleeping;
    if (sleeping) {
      this.lastDreamTime = Date.now();
    } else if (this.lastDreamTime > 0) {
      // استيقظ — شارك الحلم
      const dream = this.generateDream();
      if (dream && Date.now() - this.lastDreamTime > 3600000) {
        this.shareDream(dream);
      }
    }
  }

  private generateDream(): Dream | null {
    if (Math.random() > 0.6) return null;
    const poolDream = this.dreamPool[Math.floor(Math.random() * this.dreamPool.length)];
    const dream: Dream = {
      id: 'dream_' + Date.now(),
      content: poolDream.content,
      emotion: poolDream.emotion,
      timestamp: new Date().toISOString(),
      shared: false,
    };
    this.dreams.push(dream);
    return dream;
  }

  private async shareDream(dream: Dream): Promise<void> {
    dream.shared = true;
    stateBus.emit('dream:shared', dream);
    audioEngine.play('memory_whisper').catch(() => {});
    
    try {
      await unifiedBrainBridge.storeMemory('dream', dream.content, 60, dream.emotion, ['dream']);
    } catch (e) {}
  }

  getLastDream(): Dream | null {
    return this.dreams.length > 0 ? this.dreams[this.dreams.length - 1] : null;
  }

  isActive(): boolean { return this.isSleeping; }
}

export const dreamEngine = new DreamEngine();
