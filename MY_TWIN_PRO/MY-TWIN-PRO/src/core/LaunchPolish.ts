import { Platform, AccessibilityInfo } from 'react-native';
import { EventBus } from './EventBus';
import { StateBus } from './StateBus';

/**
 * إعدادات الصقل النهائي
 */
interface PolishConfig {
  enableHaptics: boolean;
  enableMicroAnimations: boolean;
  enableBlurEffects: boolean;
  enableShadows: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  batteryOptimization: boolean;
  offlineMode: boolean;
}

/**
 * LAUNCH POLISH
 * ==============
 * Micro Animations، Haptics، Accessibility، Performance.
 * آخر طبقة قبل الإطلاق.
 */
export class LaunchPolish {
  private config: PolishConfig = {
    enableHaptics: true,
    enableMicroAnimations: true,
    enableBlurEffects: true,
    enableShadows: Platform.OS === 'ios',
    reduceMotion: false,
    highContrast: false,
    batteryOptimization: true,
    offlineMode: false,
  };

  constructor() {
    this.detectAccessibility();
    this.bindEvents();
  }

  /**
   * تطبيق الإعدادات
   */
  apply(): void {
    // إعلام النظام بالإعدادات
    EventBus.emit('POLISH_CONFIG_UPDATED', this.config);
    StateBus.update({ isDegraded: this.config.offlineMode });
  }

  /**
   * الحصول على الإعدادات الحالية
   */
  getConfig(): Readonly<PolishConfig> {
    return { ...this.config };
  }

  /**
   * تفعيل وضع الأداء العالي
   */
  enablePerformanceMode(): void {
    this.config.enableBlurEffects = false;
    this.config.enableShadows = false;
    this.config.enableMicroAnimations = false;
    this.config.batteryOptimization = true;
    this.apply();
  }

  /**
   * تفعيل وضع التجربة الكاملة
   */
  enableFullExperience(): void {
    this.config.enableBlurEffects = true;
    this.config.enableShadows = Platform.OS === 'ios';
    this.config.enableMicroAnimations = true;
    this.config.batteryOptimization = false;
    this.apply();
  }

  /**
   * تفعيل وضع إمكانية الوصول
   */
  enableAccessibilityMode(): void {
    this.config.reduceMotion = true;
    this.config.highContrast = true;
    this.config.enableMicroAnimations = false;
    this.apply();
  }

  // ═══════════════════════════════════════════════════
  // Private
  // ═══════════════════════════════════════════════════

  private async detectAccessibility(): Promise<void> {
    try {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      const screenReader = await AccessibilityInfo.isScreenReaderEnabled();

      if (reduceMotion || screenReader) {
        this.enableAccessibilityMode();
      }
    } catch (e) {}
  }

  private bindEvents(): void {
    EventBus.on('APP_BACKGROUND', () => {
      // تفعيل توفير البطارية عند الخلفية
      this.enablePerformanceMode();
    });

    EventBus.on('APP_FOREGROUND', () => {
      // استعادة التجربة الكاملة عند العودة
      if (!this.config.reduceMotion) {
        this.enableFullExperience();
      }
    });

    // مراقبة تغيرات إمكانية الوصول
    AccessibilityInfo.addEventListener('reduceMotionChanged', (reduceMotion) => {
      if (reduceMotion) {
        this.enableAccessibilityMode();
      }
    });
  }
}

export const launchPolish = new LaunchPolish();
