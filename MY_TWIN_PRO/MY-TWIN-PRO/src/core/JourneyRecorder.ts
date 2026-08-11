import { EventBus } from './EventBus';
import { livingSession } from './LivingSession';
import { stateBus } from './StateBus';
import { unifiedBrainBridge } from './UnifiedBrainBridge';

/**
 * خطوة الرحلة
 */
interface JourneyEntry {
  sessionId: string;
  from: string | null;
  to: string;
  trigger: string;
  reason: string;
  userMessage: string;
  emotion: string;
  bondLevel: number;
  timestamp: number;
}

/**
 * JOURNEY RECORDER v2.0
 * ======================
 * يسجل كل خطوة في رحلة المستخدم خلال الجلسة.
 * ✅ المصادر الجديدة: stateBus (للعاطفة والرابطة)، unifiedBrainBridge (لتخزين الذاكرة)
 */
export class JourneyRecorder {
  private entries: JourneyEntry[] = [];
  private isRecording: boolean = false;
  private unsubscribers: Array<() => void> = [];
  private lastUserMessage: string = '';

  start(): void {
    if (this.isRecording) return;
    this.isRecording = true;
    this.entries = [];

    this.unsubscribers.push(
      EventBus.on('WORKSPACE_TRANSFORM_START', (payload: any) => {
        this.recordStep(payload?.from || null, payload?.to, 'consciousness', payload?.reason || '');
      }),
    );

    this.unsubscribers.push(
      EventBus.on('USER_SEND_MESSAGE', (payload: any) => {
        this.lastUserMessage = payload?.message || '';
      }),
    );

    console.log('[JourneyRecorder] 📍 بدأ التسجيل');
  }

  stop(): JourneyEntry[] {
    this.isRecording = false;
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    console.log(`[JourneyRecorder] ✅ توقف — ${this.entries.length} خطوة`);
    return [...this.entries];
  }

  recordStep(from: string | null, to: string, trigger: string, reason: string): void {
    if (!this.isRecording) return;

    const session = livingSession.getCurrent();
    if (!session) return;

    // ✅ من stateBus: العاطفة والرابطة
    const currentEmotion = stateBus.getState().emotion.primaryEmotion;
    const bondLevel = stateBus.getState().relationship.bondLevel;

    const entry: JourneyEntry = {
      sessionId: session.id,
      from,
      to,
      trigger,
      reason,
      userMessage: this.lastUserMessage,
      emotion: currentEmotion,
      bondLevel,
      timestamp: Date.now(),
    };

    this.entries.push(entry);
    this.lastUserMessage = '';

    // ✅ حفظ في الذاكرة عبر الجسر الموحد
    if (to !== 'living_world' && to !== 'general') {
      try {
        unifiedBrainBridge.storeMemory('event', `${from || 'start'} → ${to}: ${reason}`, 40, currentEmotion, [to]);
      } catch (e) {}
    }
  }

  getEntries(): JourneyEntry[] {
    return [...this.entries];
  }

  getSummary(): { worldsVisited: string[]; totalSteps: number; dominantEmotion: string } {
    const worlds = [...new Set(this.entries.map(e => e.to))];
    const emotions = this.entries.map(e => e.emotion);
    const dominant = emotions.sort((a, b) =>
      emotions.filter(v => v === a).length - emotions.filter(v => v === b).length
    ).pop() || 'neutral';

    return {
      worldsVisited: worlds,
      totalSteps: this.entries.length,
      dominantEmotion: dominant,
    };
  }
}

export const journeyRecorder = new JourneyRecorder();
