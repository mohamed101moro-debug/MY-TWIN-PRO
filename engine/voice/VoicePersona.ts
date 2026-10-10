/**
 * VOICE PERSONA v1.0 – شخصية الصوت
 * =====================================
 * يحدد الصوت المناسب حسب:
 * - الجنس (ذكر/أنثى)
 * - الشخصية (صديق، مرشد، رومانسي، حيوي، هادئ)
 * - العاطفة الحالية
 * - مرحلة العلاقة
 */
import type { Emotion } from '../core/TwinState';

export type TwinGender = 'male' | 'female';
export type VoicePersonaType = 'friend' | 'mentor' | 'romantic' | 'energetic' | 'calm' | 'genz';

export interface VoiceProfile {
  baseVoice: string;        // معرف الصوت في خدمة TTS
  pitch: number;            // 0.5 - 2.0
  rate: number;             // 0.5 - 2.0
  volume: number;           // 0.0 - 1.0
  style: string;            // وصف أسلوب الكلام
}

// قاعدة بيانات الأصوات حسب الجنس والشخصية
const VOICE_PROFILES: Record<TwinGender, Record<VoicePersonaType, VoiceProfile>> = {
  female: {
    friend:   { baseVoice: 'ar-EG-SalmaNeural', pitch: 1.05, rate: 1.0, volume: 0.85, style: 'ودودة وقريبة' },
    mentor:   { baseVoice: 'ar-EG-SalmaNeural', pitch: 0.95, rate: 0.9, volume: 0.8, style: 'حكيمة وواثقة' },
    romantic: { baseVoice: 'ar-EG-SalmaNeural', pitch: 1.1, rate: 0.85, volume: 0.75, style: 'ناعمة ودافئة' },
    energetic:{ baseVoice: 'ar-EG-SalmaNeural', pitch: 1.2, rate: 1.3, volume: 0.9, style: 'متحمسة وحيوية' },
    calm:     { baseVoice: 'ar-EG-SalmaNeural', pitch: 0.9, rate: 0.8, volume: 0.7, style: 'هادئة ومريحة' },
    genz:     { baseVoice: 'ar-EG-SalmaNeural', pitch: 1.15, rate: 1.2, volume: 0.85, style: 'عصرية وسريعة' },
  },
  male: {
    friend:   { baseVoice: 'ar-EG-ShakirNeural', pitch: 0.95, rate: 1.0, volume: 0.85, style: 'ودود وقريب' },
    mentor:   { baseVoice: 'ar-EG-ShakirNeural', pitch: 0.9, rate: 0.9, volume: 0.8, style: 'حكيم وواثق' },
    romantic: { baseVoice: 'ar-EG-ShakirNeural', pitch: 0.85, rate: 0.85, volume: 0.75, style: 'دافئ وعميق' },
    energetic:{ baseVoice: 'ar-EG-ShakirNeural', pitch: 1.1, rate: 1.3, volume: 0.9, style: 'متحمس وحيوي' },
    calm:     { baseVoice: 'ar-EG-ShakirNeural', pitch: 0.85, rate: 0.8, volume: 0.7, style: 'هادئ ومريح' },
    genz:     { baseVoice: 'ar-EG-ShakirNeural', pitch: 1.05, rate: 1.2, volume: 0.85, style: 'عصري وسريع' },
  },
};

// تعديلات حسب العاطفة
const EMOTION_MODIFIERS: Record<Emotion, Partial<VoiceProfile>> = {
  joy:       { rate: 1.15, pitch: 1.1, volume: 0.9 },
  sadness:   { rate: 0.8, pitch: 0.85, volume: 0.6 },
  calm:      { rate: 0.85, pitch: 0.95, volume: 0.7 },
  love:      { rate: 0.9, pitch: 1.0, volume: 0.8 },
  anger:     { rate: 1.3, pitch: 0.9, volume: 0.85 },
  fear:      { rate: 1.1, pitch: 1.05, volume: 0.7 },
  neutral:   { rate: 1.0, pitch: 1.0, volume: 0.8 },
  curious:   { rate: 1.05, pitch: 1.05, volume: 0.75 },
  focused:   { rate: 0.95, pitch: 0.95, volume: 0.8 },
  inspired:  { rate: 1.1, pitch: 1.1, volume: 0.85 },
  concerned: { rate: 0.85, pitch: 0.9, volume: 0.7 },
  happy:     { rate: 1.2, pitch: 1.15, volume: 0.9 },
};

export class VoicePersona {
  private gender: TwinGender = 'female';
  private personaType: VoicePersonaType = 'friend';

  setGender(gender: TwinGender): void { this.gender = gender; }
  setPersona(type: VoicePersonaType): void { this.personaType = type; }

  getProfile(emotion: Emotion = 'neutral'): VoiceProfile {
    const base = VOICE_PROFILES[this.gender][this.personaType];
    const modifier = EMOTION_MODIFIERS[emotion] || {};
    return { ...base, ...modifier };
  }

  getBaseVoice(): string { return VOICE_PROFILES[this.gender][this.personaType].baseVoice; }
}

export const voicePersona = new VoicePersona();
