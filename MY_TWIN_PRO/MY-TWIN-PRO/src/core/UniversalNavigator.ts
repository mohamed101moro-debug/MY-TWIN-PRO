import { EventBus } from './EventBus';
import { StateBus } from './StateBus';
import { audioEngine } from './AudioEngine';
import { audioMixer } from './AudioMixer';

/**
 * وجهات الملاحة المدعومة
 */
export type NavigationDestination =
  | 'living_world'
  | 'soul_observatory'
  | 'genesis'
  | 'study'
  | 'code_lab'
  | 'business'
  | 'content_creator'
  | 'dream'
  | 'life_coach'
  | 'task_manager'
  | 'ai_image'
  | 'smart_home';

/**
 * إعدادات الانتقال
 */
interface TransitionConfig {
  from: NavigationDestination;
  to: NavigationDestination;
  visualDuration: number;
  audioTrack: string;
  energyShift: string;
  consciousnessNote: string;
}

/**
 * UNIVERSAL NAVIGATOR
 * ====================
 * يدير كل انتقالات التطبيق بشكل موحد.
 * كل انتقال له: بصري، صوتي، طاقة، وعي.
 *
 * ليس مجرد navigate(). إنه تحول حي للمساحة.
 */
export class UniversalNavigator {
  private currentDestination: NavigationDestination = 'living_world';
  private history: NavigationDestination[] = [];
  private isTransitioning: boolean = false;

  /**
   * الانتقال إلى وجهة جديدة
   */
  async navigateTo(destination: NavigationDestination): Promise<void> {
    if (this.isTransitioning || destination === this.currentDestination) return;

    const from = this.currentDestination;
    this.isTransitioning = true;
    this.history.push(from);

    const config = this.getTransitionConfig(from, destination);

    // 1. مرحلة التوقع (Anticipate)
    StateBus.update({
      interfaceState: 'thinking',
      spaceEnergy: 'focused',
    });
    EventBus.emit('NAVIGATION_ANTICIPATE', { from, to: destination });

    // 2. صوت الانتقال
    if (config.audioTrack) {
      audioEngine.play(config.audioTrack);
      audioMixer.setContext(config.energyShift);
    }

    // 3. التحول البصري
    EventBus.emit('WORKSPACE_TRANSFORM_START', { from, to: destination, reason: 'navigation' });

    // 4. تحول الطاقة
    StateBus.update({ spaceEnergy: config.energyShift as any });

    // 5. انتظار مدة الانتقال
    await this.delay(config.visualDuration);

    // 6. اكتمال الانتقال
    this.currentDestination = destination;
    this.isTransitioning = false;

    EventBus.emit('WORKSPACE_TRANSFORM_COMPLETE', { to: destination });
    EventBus.emit('NAVIGATION_COMPLETE', { from, to: destination, note: config.consciousnessNote });

    // 7. الاستقرار
    StateBus.update({
      interfaceState: 'aware',
      spaceEnergy: 'warm',
    });
  }

  /**
   * العودة للوجهة السابقة
   */
  async goBack(): Promise<void> {
    if (this.history.length === 0) return;
    const previous = this.history.pop()!;
    await this.navigateTo(previous);
    // إزالة الإضافة المزدوجة
    this.history.pop();
  }

  /**
   * الوجهة الحالية
   */
  getCurrentDestination(): NavigationDestination {
    return this.currentDestination;
  }

  /**
   * هل هناك انتقال جارٍ؟
   */
  getIsTransitioning(): boolean {
    return this.isTransitioning;
  }

  // ═══════════════════════════════════════════════════
  // Private
  // ═══════════════════════════════════════════════════

  private getTransitionConfig(from: NavigationDestination, to: NavigationDestination): TransitionConfig {
    // العودة للعالم الحي
    if (to === 'living_world') {
      return {
        from, to,
        visualDuration: 600,
        audioTrack: 'workspace_exit',
        energyShift: 'warm',
        consciousnessNote: 'العودة إلى المنزل',
      };
    }

    // فتح مرصد الروح
    if (to === 'soul_observatory') {
      return {
        from, to,
        visualDuration: 900,
        audioTrack: 'eyes_open',
        energyShift: 'tranquil',
        consciousnessNote: 'الدخول إلى العقل',
      };
    }

    // الانتقال إلى قدرة
    const capabilityConfigs: Record<string, TransitionConfig> = {
      study: { from, to, visualDuration: 700, audioTrack: 'workspace_enter', energyShift: 'focused', consciousnessNote: 'الدخول إلى عالم الدراسة' },
      code_lab: { from, to, visualDuration: 600, audioTrack: 'workspace_enter', energyShift: 'focused', consciousnessNote: 'الدخول إلى معمل المطور' },
      business: { from, to, visualDuration: 700, audioTrack: 'workspace_enter', energyShift: 'focused', consciousnessNote: 'الدخول إلى عالم الأعمال' },
      content_creator: { from, to, visualDuration: 650, audioTrack: 'workspace_enter', energyShift: 'energetic', consciousnessNote: 'الدخول إلى الاستوديو الإبداعي' },
      dream: { from, to, visualDuration: 900, audioTrack: 'workspace_enter', energyShift: 'tranquil', consciousnessNote: 'الدخول إلى عالم الأحلام' },
      life_coach: { from, to, visualDuration: 800, audioTrack: 'workspace_enter', energyShift: 'warm', consciousnessNote: 'الدخول إلى مدرب الحياة' },
      task_manager: { from, to, visualDuration: 500, audioTrack: 'workspace_enter', energyShift: 'focused', consciousnessNote: 'الدخول إلى مدير المهام' },
      ai_image: { from, to, visualDuration: 600, audioTrack: 'workspace_enter', energyShift: 'energetic', consciousnessNote: 'الدخول إلى معمل الصور' },
      smart_home: { from, to, visualDuration: 600, audioTrack: 'workspace_enter', energyShift: 'warm', consciousnessNote: 'الدخول إلى المنزل الذكي' },
    };

    return capabilityConfigs[to] || {
      from, to,
      visualDuration: 600,
      audioTrack: 'workspace_enter',
      energyShift: 'warm',
      consciousnessNote: `الانتقال إلى ${to}`,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const universalNavigator = new UniversalNavigator();
