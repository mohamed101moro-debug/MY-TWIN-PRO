import { stateBus } from './StateBus';
import { unifiedBrainBridge } from './UnifiedBrainBridge';

/**
 * إعدادات الصوت النهائية
 */
export interface VoiceProfile {
  baseVoice: string;
  pitch: number;
  rate: number;
  volume: number;
  pause: number;
  emotion: string;
  personality: string;
  gender: string;
}

/**
 * VOICE PERSONALITY CONTROLLER v2.0
 * ==================================
 * يربط شخصية الصوت بالعاطفة والعلاقة والشخصية.
 * يحدد كيف يتكلم التوأم بناءً على:
 *   - العاطفة الحالية (من StateBus — المصدر الوحيد)
 *   - مرحلة العلاقة (من StateBus.relationship)
 *   - شخصية التوأم (من UnifiedBrainBridge آخر استجابة)
 */
export class VoicePersonalityController {
  private gender: 'male' | 'female' = 'female';
  private lastDNA: Record<string, number> = {
    empathy: 0.85, curiosity: 0.8, humor: 0.5, initiative: 0.6,
    reflection: 0.9, logic: 0.75, creativity: 0.8, calmness: 0.85,
  };

  private baseProfiles: Record<string, VoiceProfile> = {
    friend:    { baseVoice: 'ar-EG-SalmaNeural', pitch: 1.05, rate: 1.0, volume: 0.85, pause: 0.5, emotion: 'neutral', personality: 'friend', gender: 'female' },
    mentor:    { baseVoice: 'ar-EG-SalmaNeural', pitch: 0.95, rate: 0.9,  volume: 0.8,  pause: 0.8, emotion: 'calm', personality: 'mentor', gender: 'female' },
    romantic:  { baseVoice: 'ar-EG-SalmaNeural', pitch: 1.1,  rate: 0.85, volume: 0.75, pause: 0.7, emotion: 'loving', personality: 'romantic', gender: 'female' },
    energetic: { baseVoice: 'ar-EG-SalmaNeural', pitch: 1.2,  rate: 1.3,  volume: 0.9,  pause: 0.2, emotion: 'excited', personality: 'energetic', gender: 'female' },
    calm:      { baseVoice: 'ar-EG-SalmaNeural', pitch: 0.9,  rate: 0.8,  volume: 0.7,  pause: 0.9, emotion: 'calm', personality: 'calm', gender: 'female' },
  };

  constructor() {
    // الاستماع لآخر DNA من أي تحديث للـ StateBus
    stateBus.subscribe((state, _prev) => {
      if (state.relationship) {
        // تحديث DNA من آخر استجابة موحدة (مخزنة في UnifiedBrainBridge)
        const lastResponse = (unifiedBrainBridge as any).lastResponse;
        if (lastResponse?.twin_state_update?.personality_dna) {
          this.lastDNA = lastResponse.twin_state_update.personality_dna;
        }
      }
    });
  }

  setGender(gender: 'male' | 'female'): void {
    this.gender = gender;
    // تحديث الأصوات حسب الجنس
    const voiceMap: Record<string, string> = {
      female: 'ar-EG-SalmaNeural',
      male: 'ar-SA-HamedNeural',
    };
    const baseVoice = voiceMap[gender] || 'ar-EG-SalmaNeural';
    for (const key of Object.keys(this.baseProfiles)) {
      this.baseProfiles[key].baseVoice = baseVoice;
      this.baseProfiles[key].gender = gender;
    }
  }

  /**
   * تحديث DNA من استجابة موحدة (يُستدعى من LivingWorld بعد كل رد)
   */
  updateDNA(dna: Record<string, number>): void {
    this.lastDNA = { ...this.lastDNA, ...dna };
  }

  /**
   * الحصول على إعدادات الصوت الحالية
   */
  getProfile(): VoiceProfile {
    // ✅ من StateBus: العاطفة الحالية
    const currentState = stateBus.getState();
    const emotion = currentState.emotion.primaryEmotion;
    const intensity = currentState.emotion.intensity;

    // ✅ من StateBus: مرحلة العلاقة
    const bondLevel = currentState.relationship.bondLevel;
    const phase = bondLevel >= 95 ? 'soulmate' : bondLevel >= 80 ? 'close_friend' : bondLevel >= 60 ? 'friend' : 'stranger';

    // ✅ من الذاكرة المحلية: DNA (يُحدث عبر updateDNA من LivingWorld)
    const dna = this.lastDNA;

    // تحديد الشخصية الأساسية
    let baseProfile = this.baseProfiles.friend;

    // اختيار الشخصية حسب العاطفة والعلاقة
    if (emotion === 'sadness' || emotion === 'fear' || emotion === 'anger') {
      baseProfile = this.baseProfiles.calm;
    } else if (phase === 'close_friend' || phase === 'soulmate') {
      baseProfile = this.baseProfiles.friend;
    } else if (emotion === 'joy' || emotion === 'happy') {
      baseProfile = this.baseProfiles.energetic;
    } else if (dna.empathy > 0.9) {
      baseProfile = this.baseProfiles.romantic;
    } else if (dna.logic > 0.8) {
      baseProfile = this.baseProfiles.mentor;
    }

    // تعديل حسب شدة العاطفة
    const adjustedProfile: VoiceProfile = {
      ...baseProfile,
      rate: baseProfile.rate * (1 - intensity * 0.2),  // عاطفة أعلى = أبطأ
      pitch: baseProfile.pitch * (1 + intensity * 0.1), // عاطفة أعلى = حدة أعلى
      volume: baseProfile.volume * (1 - intensity * 0.1), // عاطفة أعلى = أخفض
      pause: baseProfile.pause * (1 + intensity * 0.3),   // عاطفة أعلى = توقف أطول
    };

    return adjustedProfile;
  }

  /**
   * الحصول على نص منطوق بسيط (لـ expo-speech)
   */
  getExpoSpeechConfig(): { rate: number; pitch: number; language: string } {
    const profile = this.getProfile();
    return { rate: profile.rate, pitch: profile.pitch, language: 'ar' };
  }
}

export const voicePersonalityController = new VoicePersonalityController();
