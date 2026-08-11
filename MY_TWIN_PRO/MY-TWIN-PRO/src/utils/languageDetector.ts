/**
 * Language Detector — حاسة الكيان الرقمية للغة
 * =============================================
 * يكتشف لغة المستخدم الحقيقية من إعدادات الجهاز.
 * يُمكن الكيان من اختيار الكلمات والأسلوب المناسب.
 */
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';

export type SupportedLanguage = 'ar' | 'en';

// تخزين مؤقت لتجنب إعادة الاكتشاف
let _detectedLanguage: SupportedLanguage | null = null;

/**
 * اكتشاف لغة المستخدم الحقيقية من الجهاز.
 * يستخدم expo-localization كأولوية، ثم I18nManager كاحتياط.
 */
export function detectUserLanguage(): SupportedLanguage {
  // إعادة المخزن المؤقت إن وُجد
  if (_detectedLanguage) return _detectedLanguage;

  try {
    // المحاولة الأولى: expo-localization (الأكثر دقة)
    if (Localization && Localization.getLocales && Localization.getLocales().length > 0) {
      const primaryLocale = Localization.getLocales()[0];
      const languageCode = primaryLocale.languageCode || primaryLocale.languageTag?.split('-')[0];

      if (languageCode === 'ar') {
        _detectedLanguage = 'ar';
        return _detectedLanguage;
      }
    }

    // المحاولة الثانية: I18nManager من React Native
    if (I18nManager && I18nManager.isRTL) {
      _detectedLanguage = 'ar';
      return _detectedLanguage;
    }
  } catch {
    // تجاهل أي خطأ والاعتماد على الاحتياط
  }

  // الاحتياط النهائي: الإنجليزية
  _detectedLanguage = 'en';
  return _detectedLanguage;
}

/**
 * هل اللغة العربية هي لغة المستخدم؟
 */
export function isArabic(): boolean {
  return detectUserLanguage() === 'ar';
}

/**
 * هل اتجاه الكتابة من اليمين لليسار؟
 */
export function isRTL(): boolean {
  return isArabic();
}

/**
 * إعادة تعيين اللغة المخزنة مؤقتاً (عند تغيير اللغة يدوياً)
 */
export function resetLanguage(): void {
  _detectedLanguage = null;
}

/**
 * تعيين اللغة يدوياً (عندما يختار المستخدم لغة مختلفة)
 */
export function setLanguage(lang: SupportedLanguage): void {
  _detectedLanguage = lang;
}

/**
 * الحصول على تحية مناسبة للغة المستخدم
 */
export function getGreeting(lang?: SupportedLanguage) {
  const language = lang || detectUserLanguage();
  const isArabic = language === 'ar';

  return {
    word: isArabic ? 'مرحباً' : 'Hello',
    colors: ['#A855F7', '#7C3AED'],
    transitionSpeed: 1.0,
    fontSize: 28,
    fontWeight: '300' as const,
  };
}
