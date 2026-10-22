/**
 * LivingBehaviorEngine v2.0 — متصل بالخلفية
 * =============================================
 * يستخدم UnifiedBrainBridge لجلب سلوك الكيان الحي من الخلفية.
 * لا قيم افتراضية ثابتة.
 */

import { unifiedBrainBridge } from '../../src/core/UnifiedBrainBridge';
import { stateBus } from '../../src/core/StateBus';

export interface LivingBehavior {
  intent: string;
  goal: string;
  tone: string;
  silenceBeforeSpeakingMs: number;
  presenceAction: string;
}

export class LivingBehaviorEngine {
  private currentBehavior: LivingBehavior = {
    intent: 'reflect',
    goal: 'حضور',
    tone: 'neutral_warm',
    silenceBeforeSpeakingMs: 0,
    presenceAction: 'idle'
  };

  /**
   * تحديث السلوك من استجابة الخلفية
   */
  updateFromResponse(response: any): void {
    if (response?.behavior) {
      this.currentBehavior = {
        intent: response.behavior.intent || 'reflect',
        goal: response.behavior.goal || 'حضور',
        tone: response.behavior.tone || 'neutral_warm',
        silenceBeforeSpeakingMs: response.behavior.silence_before_speaking_ms || 0,
        presenceAction: response.presence_state?.voice_tone || 'idle'
      };
    }
  }

  getCurrentBehavior(): LivingBehavior {
    return this.currentBehavior;
  }

  getSilenceDuration(): number {
    return this.currentBehavior.silenceBeforeSpeakingMs;
  }
}

export const livingBehaviorEngine = new LivingBehaviorEngine();
