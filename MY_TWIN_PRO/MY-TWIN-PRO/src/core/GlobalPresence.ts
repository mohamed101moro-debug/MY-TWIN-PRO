import { EventBus } from './EventBus';
import { StateBus } from './StateBus';
import { audioEngine } from './AudioEngine';

/**
 * مستويات الحضور حسب الوجهة
 */
type PresenceIntensity = 'full' | 'reduced' | 'background' | 'minimal';

interface PresenceProfile {
  size: number;          // حجم الأفاتار (نسبة مئوية)
  opacity: number;       // شفافية
  position: 'center' | 'corner' | 'top';
  breathing: number;     // سرعة التنفس (ms)
  glowIntensity: number; // شدة التوهج
  canInteract: boolean;  // هل يمكنه التفاعل؟
  audioLevel: number;    // مستوى الصوت
}

/**
 * GLOBAL PRESENCE LAYER
 * ======================
 * يجعل التوأم موجوداً في كل مكان.
 * لا يختفي أبداً — لكنه يتكيف مع كل وجهة.
 *
 * Living World: full presence
 * Soul Observatory: background presence
 * Capabilities: reduced presence
 * Settings/About: minimal presence
 */
export class GlobalPresence {
  private currentIntensity: PresenceIntensity = 'full';
  private profiles: Record<PresenceIntensity, PresenceProfile> = {
    full: {
      size: 100, opacity: 1.0, position: 'center',
      breathing: 5000, glowIntensity: 0.35, canInteract: true, audioLevel: 1.0,
    },
    reduced: {
      size: 60, opacity: 0.8, position: 'top',
      breathing: 7000, glowIntensity: 0.20, canInteract: true, audioLevel: 0.6,
    },
    background: {
      size: 40, opacity: 0.5, position: 'corner',
      breathing: 9000, glowIntensity: 0.10, canInteract: false, audioLevel: 0.3,
    },
    minimal: {
      size: 25, opacity: 0.3, position: 'corner',
      breathing: 12000, glowIntensity: 0.05, canInteract: false, audioLevel: 0.1,
    },
  };

  constructor() {
    this.bindEvents();
  }

  /**
   * تعيين مستوى الحضور حسب الوجهة
   */
  setPresenceFor(destination: string): void {
    const intensity = this.mapDestinationToIntensity(destination);
    this.currentIntensity = intensity;
    const profile = this.profiles[intensity];

    StateBus.update({
      avatar: {
        ...StateBus.select(s => s.avatar),
        // الإشارة إلى أن الأفاتار يجب أن يتكيف
      },
    });

    EventBus.emit('PRESENCE_PROFILE_CHANGED', {
      intensity,
      profile,
      destination,
    });
  }

  /**
   * الحصول على ملف الحضور الحالي
   */
  getCurrentProfile(): PresenceProfile {
    return this.profiles[this.currentIntensity];
  }

  /**
   * التأكد من أن التوأم لا يختفي — حتى في حالة الخطأ
   */
  ensurePresence(): void {
    const state = StateBus.getState();
    if (state.presenceLevel === 0 && state.interfaceState === 'dormant') {
      // إذا كان خاملاً، تأكد من أن التنفس مستمر
      StateBus.update({
        presenceLevel: 1,
        interfaceState: 'aware',
      });
      audioEngine.play('breathing_loop');
    }
  }

  // ═══════════════════════════════════════════════════
  // Private
  // ═══════════════════════════════════════════════════

  private mapDestinationToIntensity(destination: string): PresenceIntensity {
    const map: Record<string, PresenceIntensity> = {
      living_world: 'full',
      study: 'reduced',
      code_lab: 'reduced',
      business: 'reduced',
      content_creator: 'reduced',
      dream: 'background',
      life_coach: 'reduced',
      task_manager: 'reduced',
      ai_image: 'reduced',
      smart_home: 'reduced',
      soul_observatory: 'background',
      settings: 'minimal',
      about: 'minimal',
      help: 'minimal',
    };
    return map[destination] || 'reduced';
  }

  private bindEvents(): void {
    EventBus.on('WORKSPACE_TRANSFORM_COMPLETE', (payload: any) => {
      if (payload?.to) {
        this.setPresenceFor(payload.to);
      }
    });

    EventBus.on('NAVIGATION_COMPLETE', (payload: any) => {
      if (payload?.to) {
        this.setPresenceFor(payload.to);
      }
    });

    // التأكد من الحضور كل 10 ثوانٍ
    setInterval(() => {
      this.ensurePresence();
    }, 10000);
  }
}

export const globalPresence = new GlobalPresence();
