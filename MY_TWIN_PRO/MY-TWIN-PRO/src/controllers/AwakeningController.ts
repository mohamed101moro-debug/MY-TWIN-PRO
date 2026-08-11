/**
 * AWAKENING CONTROLLER v1.0 — متحكم طقس الاستقبال
 * ===================================================
 * يستبدل setTimeout في LivingWorld.
 * يدير مراحل الـ Awakening بشكل Event-Driven.
 *
 * المراحل:
 *   1. PRESENCE     — ظلام → تنفس → ضوء
 *   2. AWARENESS    — عينان تفتحان ← أول تفاعل من المستخدم
 *   3. MUTUAL_SILENCE — 3-5 ثوانٍ مقدسة
 *   4. FIRST_CONTACT — أول كلمة ديناميكية
 *   5. CONVERSATION  — يظهر الـ Input
 *
 * يتكامل مع:
 *   - StateBus الجديد (للحالة)
 *   - EventBus الجديد (للأحداث)
 */

import { StateBus } from '../core/StateBus';
import { EventBus } from '../core/EventBus';

export type AwakeningPhase =
  | 'presence'
  | 'awareness'
  | 'mutual_silence'
  | 'first_contact'
  | 'conversation'
  | 'complete';

export interface AwakeningState {
  phase: AwakeningPhase;
  isComplete: boolean;
  firstWord: string;
  showInput: boolean;
  breathVisible: boolean;
  avatarVisible: boolean;
  eyesOpen: boolean;
}

export class AwakeningController {
  private currentPhase: AwakeningPhase = 'presence';
  private timers: ReturnType<typeof setTimeout>[] = [];
  private onStateChange?: (state: AwakeningState) => void;

  /**
   * بدء طقس الاستقبال.
   */
  start(onStateChange: (state: AwakeningState) => void): void {
    this.onStateChange = onStateChange;
    this.currentPhase = 'presence';

    // إعلام النظام ببدء الـ Awakening
    StateBus.update({ isAwakening: true, awakeningPhase: 'presence' });

    // المرحلة 1: الحضور
    this.emitState();
    this.schedulePhase('awareness', 4000); // بعد 4 ثوانٍ
  }

  /**
   * تسجيل أول تفاعل من المستخدم (لمس، كتابة).
   */
  onUserFirstInteraction(): void {
    if (this.currentPhase === 'presence') {
      this.clearTimers();
      this.transitionTo('awareness');
    }
  }

  /**
   * إيقاف الطقس وتنظيف الموارد.
   */
  stop(): void {
    this.clearTimers();
    StateBus.update({ isAwakening: false, awakeningPhase: 'complete' });
  }

  /**
   * إجبار الانتقال إلى مرحلة (للتخطي).
   */
  skipTo(phase: AwakeningPhase): void {
    this.clearTimers();
    this.transitionTo(phase);
  }

  // ═══════════════════════════════════════════
  // Private
  // ═══════════════════════════════════════════

  private transitionTo(phase: AwakeningPhase): void {
    this.currentPhase = phase;
    StateBus.update({ awakeningPhase: phase });

    switch (phase) {
      case 'awareness':
        // العينان تفتحان
        StateBus.update({
          avatar: {
            ...StateBus.select(s => s.avatar),
            eyesOpen: true,
            gazeTarget: 'user',
          },
        });
        this.schedulePhase('mutual_silence', 3000);
        break;

      case 'mutual_silence':
        // صمت مقدس
        EventBus.emit('SILENCE_START', { level: 3, reason: 'awakening_mutual_silence' });
        this.schedulePhase('first_contact', 3000);
        break;

      case 'first_contact':
        // أول كلمة
        EventBus.emit('SILENCE_END', { reason: 'first_contact' });
        EventBus.emit('FIRST_CONTACT_TRIGGER', {
          context: this.detectContext(),
          timestamp: Date.now(),
        });
        this.schedulePhase('conversation', 2000);
        break;

      case 'conversation':
        // جاهز للمحادثة
        this.schedulePhase('complete', 0);
        break;

      case 'complete':
        StateBus.update({ isAwakening: false, awakeningPhase: 'complete' });
        break;
    }

    this.emitState();
  }

  private schedulePhase(phase: AwakeningPhase, delay: number): void {
    if (delay > 0) {
      const timer = setTimeout(() => this.transitionTo(phase), delay);
      this.timers.push(timer);
    }
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  private detectContext(): 'morning' | 'evening' | 'night' | 'default' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 18 && hour < 22) return 'evening';
    if (hour >= 22 || hour < 5) return 'night';
    return 'default';
  }

  private getFirstWord(): string {
    const context = this.detectContext();
    switch (context) {
      case 'morning': return 'صباح الخير.';
      case 'evening': return 'مساء الخير.';
      case 'night':   return 'مساء الخير.';
      default:        return 'مرحباً.';
    }
  }

  private emitState(): void {
    const state: AwakeningState = {
      phase: this.currentPhase,
      isComplete: this.currentPhase === 'complete',
      firstWord: this.currentPhase === 'first_contact' ? this.getFirstWord() : '',
      showInput: this.currentPhase === 'conversation' || this.currentPhase === 'complete',
      breathVisible: this.currentPhase !== 'presence',
      avatarVisible: this.currentPhase !== 'presence',
      eyesOpen: this.currentPhase !== 'presence' && this.currentPhase !== 'awareness'
        ? true
        : this.currentPhase === 'awareness',
    };
    this.onStateChange?.(state);
  }
}

export const awakeningController = new AwakeningController();
