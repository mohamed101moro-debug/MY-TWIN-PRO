/**
 * EmotionToVisualMapper v2.0 — المصدر الوحيد للحقيقة: مشاعر → معاملات بصرية
 * ============================================================================
 * التكامل:
 * - PresenceEngine.setEmotion() يستدعي getProfile() + profileToPresencePatch()
 *   فيمتلئ PresenceState بالألوان/العيون/السرعات ⇒ DigitalBeing/ShaderBeing يتجسدان فورًا.
 * - blendProfiles() للانتقال الناعم 600ms بين مشعرين (لا قفزات لونية).
 * - valenceToEmotion() يترجم stateBus (emotionValence/arousal/focus) عند غياب نص الشعور.
 * نقي + حتمي + بلا آثار جانبية + بلا دورات استيراد (يستورد الأنواع فقط).
 */
import type { RGB, PresenceState } from './PresenceTypes';

export interface EmotionVisualProfile {
  key: string;
  colorA: RGB; colorB: RGB; eyeColor: RGB;
  energyBias: number;      // يُضاف لطاقة الأساس
  fieldSpeed: number;      // 0.05-2
  turbulence: number;      // 0-1
  orbitality: number;      // 0.2-0.95
  eyeOpenness: number;     // 0-1.1
  pupilSize: number;       // 0-1
  eyeGlow: number;         // 0-1
  warmth: number;          // 0-1
  attention: number;       // 0-1
  anticipation: number;    // 0-1
  breathRate: number;      // 0-1
  pulseRate: number;       // 0-1
  particleDensity: number; // 0-1.5 (كثافة الجسيمات)
  auraIntensity: number;   // 0-1 (شدة الهالة)
  browRaise: number;       // -1..1 (حاجبان — ExpressiveEyes)
  mouthCurve: number;      // -1..1 (فم مستقبلي)
}

export const EMOTION_PROFILES: Record<string, EmotionVisualProfile> = {
  calm: {
    key: 'calm', colorA: { r: 155, g: 111, b: 255 }, colorB: { r: 70, g: 139, b: 255 }, eyeColor: { r: 232, g: 222, b: 255 },
    energyBias: 0, fieldSpeed: 0.4, turbulence: 0.18, orbitality: 0.68,
    eyeOpenness: 0.85, pupilSize: 0.42, eyeGlow: 0.88, warmth: 0.35, attention: 0.5, anticipation: 0.25,
    breathRate: 0.4, pulseRate: 0.4, particleDensity: 1.0, auraIntensity: 0.5, browRaise: 0.05, mouthCurve: 0.3,
  },
  happy: {
    key: 'happy', colorA: { r: 255, g: 179, b: 107 }, colorB: { r: 255, g: 211, b: 122 }, eyeColor: { r: 255, g: 158, b: 74 },
    energyBias: 0.2, fieldSpeed: 0.7, turbulence: 0.3, orbitality: 0.6,
    eyeOpenness: 0.95, pupilSize: 0.55, eyeGlow: 0.95, warmth: 0.8, attention: 0.6, anticipation: 0.5,
    breathRate: 0.6, pulseRate: 0.6, particleDensity: 1.25, auraIntensity: 0.8, browRaise: 0.35, mouthCurve: 0.8,
  },
  curious: {
    key: 'curious', colorA: { r: 176, g: 107, b: 255 }, colorB: { r: 139, g: 92, b: 246 }, eyeColor: { r: 167, g: 139, b: 250 },
    energyBias: 0.1, fieldSpeed: 0.55, turbulence: 0.28, orbitality: 0.75,
    eyeOpenness: 1.0, pupilSize: 0.62, eyeGlow: 0.9, warmth: 0.5, attention: 0.85, anticipation: 0.7,
    breathRate: 0.5, pulseRate: 0.5, particleDensity: 1.15, auraIntensity: 0.7, browRaise: 0.4, mouthCurve: 0.25,
  },
  thinking: {
    key: 'thinking', colorA: { r: 59, g: 91, b: 219 }, colorB: { r: 49, g: 46, b: 129 }, eyeColor: { r: 76, g: 110, b: 245 },
    energyBias: -0.05, fieldSpeed: 0.25, turbulence: 0.15, orbitality: 0.5,
    eyeOpenness: 0.6, pupilSize: 0.38, eyeGlow: 0.7, warmth: 0.3, attention: 0.95, anticipation: 0.3,
    breathRate: 0.3, pulseRate: 0.3, particleDensity: 0.8, auraIntensity: 0.45, browRaise: -0.15, mouthCurve: 0,
  },
  sad: {
    key: 'sad', colorA: { r: 74, g: 144, b: 217 }, colorB: { r: 44, g: 94, b: 138 }, eyeColor: { r: 92, g: 168, b: 224 },
    energyBias: -0.2, fieldSpeed: 0.2, turbulence: 0.1, orbitality: 0.4,
    eyeOpenness: 0.5, pupilSize: 0.35, eyeGlow: 0.5, warmth: 0.15, attention: 0.35, anticipation: 0.1,
    breathRate: 0.25, pulseRate: 0.25, particleDensity: 0.55, auraIntensity: 0.3, browRaise: -0.35, mouthCurve: -0.6,
  },
  surprised: {
    key: 'surprised', colorA: { r: 34, g: 211, b: 238 }, colorB: { r: 103, g: 232, b: 249 }, eyeColor: { r: 34, g: 184, b: 207 },
    energyBias: 0.25, fieldSpeed: 0.9, turbulence: 0.45, orbitality: 0.8,
    eyeOpenness: 1.1, pupilSize: 0.7, eyeGlow: 1.0, warmth: 0.45, attention: 0.9, anticipation: 0.85,
    breathRate: 0.7, pulseRate: 0.8, particleDensity: 1.4, auraIntensity: 0.9, browRaise: 0.6, mouthCurve: -0.15,
  },
  angry: {
    key: 'angry', colorA: { r: 224, g: 49, b: 49 }, colorB: { r: 139, g: 30, b: 18 }, eyeColor: { r: 255, g: 107, b: 107 },
    energyBias: 0.3, fieldSpeed: 1.1, turbulence: 0.6, orbitality: 0.85,
    eyeOpenness: 0.55, pupilSize: 0.3, eyeGlow: 1.0, warmth: 0.1, attention: 0.9, anticipation: 0.6,
    breathRate: 0.8, pulseRate: 0.9, particleDensity: 1.3, auraIntensity: 0.85, browRaise: -0.6, mouthCurve: -0.8,
  },
  sleepy: {
    key: 'sleepy', colorA: { r: 177, g: 151, b: 252 }, colorB: { r: 132, g: 104, b: 242 }, eyeColor: { r: 151, g: 117, b: 250 },
    energyBias: -0.3, fieldSpeed: 0.12, turbulence: 0.06, orbitality: 0.35,
    eyeOpenness: 0.15, pupilSize: 0.3, eyeGlow: 0.35, warmth: 0.4, attention: 0.15, anticipation: 0.05,
    breathRate: 0.2, pulseRate: 0.2, particleDensity: 0.35, auraIntensity: 0.25, browRaise: -0.05, mouthCurve: 0.1,
  },
};

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * Math.max(0, Math.min(1, t));
export const lerpRGB = (a: RGB, b: RGB, t: number): RGB => ({
  r: Math.round(lerp(a.r, b.r, t)), g: Math.round(lerp(a.g, b.g, t)), b: Math.round(lerp(a.b, b.b, t)),
});

/** تطبيع أي نص شعور وارد (AI/حساسات/مستخدم) إلى مفتاح قانوني. */
export function normalizeEmotion(e: string): string {
  const s = String(e || '').toLowerCase();
  if (s.includes('happ') || s.includes('joy') || s.includes('excit') || s.includes('love') || s.includes('caring')) return 'happy';
  if (s.includes('curious') || s.includes('wonder')) return 'curious';
  if (s.includes('think') || s.includes('focus') || s.includes('ponder')) return 'thinking';
  if (s.includes('sad') || s.includes('fear') || s.includes('grief') || s.includes('lonel')) return 'sad';
  if (s.includes('surpr') || s.includes('shock') || s.includes('amaz')) return 'surprised';
  if (s.includes('ang') || s.includes('furi') || s.includes('irrit')) return 'angry';
  if (s.includes('sleep') || s.includes('tired') || s.includes('drows')) return 'sleepy';
  return 'calm';
}

export function getProfile(emotion: string): EmotionVisualProfile {
  return EMOTION_PROFILES[normalizeEmotion(emotion)] ?? EMOTION_PROFILES.calm;
}

/** مزج ناعم بين ملفين (انتقال 600ms بين مشعرين دون قفزات). */
export function blendProfiles(a: EmotionVisualProfile, b: EmotionVisualProfile, t: number): EmotionVisualProfile {
  const k = Math.max(0, Math.min(1, t));
  return {
    key: k < 0.5 ? a.key : b.key,
    colorA: lerpRGB(a.colorA, b.colorA, k), colorB: lerpRGB(a.colorB, b.colorB, k), eyeColor: lerpRGB(a.eyeColor, b.eyeColor, k),
    energyBias: lerp(a.energyBias, b.energyBias, k), fieldSpeed: lerp(a.fieldSpeed, b.fieldSpeed, k),
    turbulence: lerp(a.turbulence, b.turbulence, k), orbitality: lerp(a.orbitality, b.orbitality, k),
    eyeOpenness: lerp(a.eyeOpenness, b.eyeOpenness, k), pupilSize: lerp(a.pupilSize, b.pupilSize, k),
    eyeGlow: lerp(a.eyeGlow, b.eyeGlow, k), warmth: lerp(a.warmth, b.warmth, k),
    attention: lerp(a.attention, b.attention, k), anticipation: lerp(a.anticipation, b.anticipation, k),
    breathRate: lerp(a.breathRate, b.breathRate, k), pulseRate: lerp(a.pulseRate, b.pulseRate, k),
    particleDensity: lerp(a.particleDensity, b.particleDensity, k), auraIntensity: lerp(a.auraIntensity, b.auraIntensity, k),
    browRaise: lerp(a.browRaise, b.browRaise, k), mouthCurve: lerp(a.mouthCurve, b.mouthCurve, k),
  };
}

/** عند غياب نص الشعور: اشتقاقه من valence/arousal/focus (مصدر stateBus في living-world). */
export function valenceToEmotion(valence: number, arousal: number, focus: number, thinking: boolean): string {
  if (thinking || focus > 0.75) return 'thinking';
  if (valence > 0.45) return arousal > 0.65 ? 'happy' : 'calm';
  if (valence < -0.45) return arousal > 0.65 ? 'angry' : 'sad';
  if (arousal > 0.85) return 'surprised';
  if (arousal < 0.2) return 'sleepy';
  return 'calm';
}

/** اختصار تكاملي: valence/arousal → ملف بصري مباشرة (لـ PresenceBridge/الطبقات). */
export function profileFromValence(valence: number, arousal: number, focus: number, thinking: boolean): EmotionVisualProfile {
  return getProfile(valenceToEmotion(valence, arousal, focus, thinking));
}

/** يحوّل الملف إلى رقعة PresenceState تمر عبر المحرك فتقرأها كل الطبقات. */
export function profileToPresencePatch(p: EmotionVisualProfile, intensity = 0.6): Partial<PresenceState> {
  const i = Math.max(0, Math.min(1, intensity));
  return {
    emotion: p.key,
    intensity: i,
    colorA: p.colorA, colorB: p.colorB, eyeColor: p.eyeColor,
    fieldSpeed: p.fieldSpeed * (0.8 + i * 0.4),
    turbulence: Math.min(1, p.turbulence * (0.7 + i * 0.6)),
    orbitality: p.orbitality,
    eyeOpenness: p.eyeOpenness, pupilSize: p.pupilSize, eyeGlow: p.eyeGlow * (0.7 + i * 0.3),
    warmth: p.warmth, attention: p.attention, anticipation: p.anticipation,
    breathing: p.breathRate, pulse: p.pulseRate,
  };
}
