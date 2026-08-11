/**
 * STATE MACHINE v1.0 — آلة الحالة المركزية
 * ==========================================
 * تدير انتقالات حالة التوأم بشكل آمن ومتسلسل.
 * تمنع الانتقالات غير الصالحة وتضمن سلامة الحالة.
 *
 * التكامل:
 *   - تقرأ وتكتب عبر useTwinState (Zustand)
 *   - تصدر الأحداث عبر stateBus الموحد
 *   - يستدعيها BehaviorEngine
 */

import { useTwinState, ConsciousnessMode } from './TwinState';
import { stateBus, STATE_EVENTS } from '../../src/core/StateBus';

// ═══════════════════════════════════════════════════════
// تعريف الانتقالات الصالحة بين حالات الوعي
// ═══════════════════════════════════════════════════════
const VALID_TRANSITIONS: Record<ConsciousnessMode, ConsciousnessMode[]> = {
  sleeping:        ['listening', 'dreaming'],
  listening:       ['thinking', 'speaking', 'sleeping', 'dreaming', 'emotional'],
  thinking:        ['analyzing', 'deep_thinking', 'searching_memory', 'listening', 'speaking'],
  analyzing:       ['thinking', 'learning', 'speaking', 'listening'],
  learning:        ['thinking', 'listening', 'sleeping'],
  speaking:        ['listening', 'thinking', 'emotional'],
  dreaming:        ['sleeping', 'listening'],
  emotional:       ['listening', 'thinking', 'speaking'],
  deep_thinking:   ['thinking', 'analyzing', 'speaking'],
  searching_memory: ['thinking', 'analyzing', 'speaking'],
};

// ═══════════════════════════════════════════════════════
// أولويات الحالات — لتحديد من ينتصر عند التعارض
// ═══════════════════════════════════════════════════════
const STATE_PRIORITY: Record<ConsciousnessMode, number> = {
  sleeping:          0,
  listening:         1,
  dreaming:          1,
  thinking:          2,
  searching_memory:  2,
  analyzing:         3,
  deep_thinking:     3,
  learning:          3,
  emotional:         4,
  speaking:          5,
};

// ═══════════════════════════════════════════════════
// وصف الحالة للتصحيح والمراقبة
// ═══════════════════════════════════════════════════
const STATE_LABELS: Record<ConsciousnessMode, string> = {
  sleeping:         'نائم',
  listening:        'يستمع',
  thinking:         'يفكر',
  analyzing:        'يحلل',
  learning:         'يتعلم',
  speaking:         'يتحدث',
  dreaming:         'يحلم',
  emotional:        'عاطفي',
  deep_thinking:    'تفكير عميق',
  searching_memory: 'يبحث في الذاكرة',
};

export class StateMachine {
  private transitionQueue: Array<{ target: ConsciousnessMode; resolve: () => void }> = [];
  private isProcessingQueue = false;
  private transitionInProgress = false;
  private lastTransitionTime = 0;
  private readonly MIN_TRANSITION_INTERVAL = 150; // مللي ثانية

  /**
   * انتقال آمن إلى حالة جديدة.
   * - يتحقق من الصلاحية
   * - يمنع الانتقالات المتزامنة
   * - يصدر الحدث المناسب
   */
  safeTransition(target: ConsciousnessMode): boolean {
    const store = useTwinState.getState();
    const current = store.consciousnessMode;

    // لا انتقال إذا كنا بالفعل في الحالة المطلوبة
    if (current === target) return true;

    // منع الانتقالات المتسارعة جداً
    const now = Date.now();
    if (now - this.lastTransitionTime < this.MIN_TRANSITION_INTERVAL) {
      this.enqueue(target);
      return false;
    }

    // التحقق من صلاحية الانتقال
    const allowed = VALID_TRANSITIONS[current];
    if (!allowed || !allowed.includes(target)) {
      console.warn(
        `[StateMachine] ⛔ انتقال غير صالح: ${STATE_LABELS[current]} → ${STATE_LABELS[target]}`
      );
      return false;
    }

    // تنفيذ الانتقال
    return this.executeTransition(current, target);
  }

  /**
   * انتقال بقوة — يتجاوز التحقق من الصلاحية (للحالات الطارئة)
   */
  forceTransition(target: ConsciousnessMode): boolean {
    const store = useTwinState.getState();
    const current = store.consciousnessMode;
    return this.executeTransition(current, target);
  }

  /**
   * محاولة انتقال — إذا كان الهدف أولويته أعلى من الحالي
   */
  transitionIfHigherPriority(target: ConsciousnessMode): boolean {
    const store = useTwinState.getState();
    const current = store.consciousnessMode;
    const currentPriority = STATE_PRIORITY[current] ?? 0;
    const targetPriority = STATE_PRIORITY[target] ?? 0;

    if (targetPriority > currentPriority) {
      return this.safeTransition(target);
    }
    return false;
  }

  /**
   * هل الحالة الحالية تسمح بالانتقال إلى الهدف؟
   */
  canTransition(target: ConsciousnessMode): boolean {
    const current = useTwinState.getState().consciousnessMode;
    const allowed = VALID_TRANSITIONS[current];
    return allowed ? allowed.includes(target) : false;
  }

  /**
   * الحالة الحالية
   */
  getCurrentState(): ConsciousnessMode {
    return useTwinState.getState().consciousnessMode;
  }

  /**
   * وصف الحالة الحالية (للتصحيح)
   */
  getStateLabel(): string {
    return STATE_LABELS[this.getCurrentState()] ?? 'غير معروف';
  }

  /**
   * إعادة تعيين إلى حالة الاستماع (الوضع الافتراضي)
   */
  reset(): void {
    this.forceTransition('listening');
    this.transitionQueue = [];
    this.isProcessingQueue = false;
  }

  // ═══════════════════════════════════════════
  // Private
  // ═══════════════════════════════════════════

  private executeTransition(from: ConsciousnessMode, to: ConsciousnessMode): boolean {
    if (this.transitionInProgress) {
      this.enqueue(to);
      return false;
    }

    this.transitionInProgress = true;
    this.lastTransitionTime = Date.now();

    const store = useTwinState.getState();

    // تحديث الحالة في TwinState
    store.setMode(to);
    store.setIsProcessing(to === 'thinking' || to === 'analyzing' || to === 'deep_thinking');
    store.setIsThinking(to === 'thinking' || to === 'deep_thinking');
    store.setIsSpeaking(to === 'speaking');
    store.setIsListening(to === 'listening');

    // إصدار الحدث عبر StateBus الموحد
    stateBus.emit(STATE_EVENTS.MODE_CHANGED, {
      from,
      to,
      timestamp: Date.now(),
      label: STATE_LABELS[to],
    });

    this.transitionInProgress = false;
    this.processQueue();

    return true;
  }

  private enqueue(target: ConsciousnessMode): void {
    this.transitionQueue.push({
      target,
      resolve: () => {},
    });
    // الحد الأقصى للطابور
    if (this.transitionQueue.length > 5) {
      this.transitionQueue = this.transitionQueue.slice(-3);
    }
  }

  private processQueue(): void {
    if (this.isProcessingQueue || this.transitionQueue.length === 0) return;

    this.isProcessingQueue = true;
    const next = this.transitionQueue.shift()!;
    this.isProcessingQueue = false;

    // محاولة الانتقال بعد تأخير قصير
    setTimeout(() => {
      this.safeTransition(next.target);
    }, this.MIN_TRANSITION_INTERVAL);
  }
}

export const stateMachine = new StateMachine();
