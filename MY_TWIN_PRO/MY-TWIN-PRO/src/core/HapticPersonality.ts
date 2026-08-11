import { EventBus } from './EventBus';
import { Platform } from 'react-native';

/**
 * أنواع الاهتزازات
 */
type HapticPattern = 'single' | 'double' | 'long' | 'rhythmic' | 'soft' | 'warning';

interface HapticConfig {
  pattern: HapticPattern;
  intensity: number; // 1-10
  duration: number; // ms
}

/**
 * HAPTIC PERSONALITY
 * ===================
 * كل اهتزاز له معنى.
 * Memory → نبضة واحدة
 * Signature Moment → نبضتان
 * Dream → اهتزاز طويل
 * Error → اهتزاز تحذيري
 */
export class HapticPersonality {
  private enabled: boolean = true;
  private patterns: Record<string, HapticConfig> = {
    memory: { pattern: 'single', intensity: 3, duration: 80 },
    memory_surfaced: { pattern: 'double', intensity: 2, duration: 50 },
    signature_moment: { pattern: 'double', intensity: 5, duration: 100 },
    dream: { pattern: 'long', intensity: 2, duration: 300 },
    celebration: { pattern: 'rhythmic', intensity: 4, duration: 200 },
    thinking: { pattern: 'soft', intensity: 1, duration: 30 },
    silence: { pattern: 'soft', intensity: 1, duration: 40 },
    error: { pattern: 'warning', intensity: 6, duration: 60 },
    message_sent: { pattern: 'single', intensity: 2, duration: 40 },
    message_received: { pattern: 'soft', intensity: 1, duration: 30 },
  };

  constructor() { this.bindEvents(); }

  enable(): void { this.enabled = true; }
  disable(): void { this.enabled = false; }

  trigger(type: string): void {
    if (!this.enabled) return;
    const config = this.patterns[type] || this.patterns['soft'];
    this.executeHaptic(config);
  }

  private executeHaptic(config: HapticConfig): void {
    if (Platform.OS === 'web') return;

    try {
      // يمكن استخدام react-native-haptic-feedback هنا
      // لكننا نستخدم EventBus لإعلام الطبقة العليا
      EventBus.emit('HAPTIC_TRIGGER', config);
    } catch (e) {}
  }

  private bindEvents(): void {
    EventBus.on('MEMORY_SURFACED', () => this.trigger('memory_surfaced'));
    EventBus.on('MEMORY_CREATED', () => this.trigger('memory'));
    EventBus.on('SIGNATURE_MOMENT', () => this.trigger('signature_moment'));
    EventBus.on('AI_START_THINKING', () => this.trigger('thinking'));
    EventBus.on('SILENCE_START', () => this.trigger('silence'));
    EventBus.on('USER_SEND_MESSAGE', () => this.trigger('message_sent'));
    EventBus.on('AI_FINISH_THINKING', () => this.trigger('message_received'));
  }
}

export const hapticPersonality = new HapticPersonality();
