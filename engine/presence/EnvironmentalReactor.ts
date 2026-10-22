/**
 * EnvironmentalReactor v2.0 — الحساسات + المحادثة → معدِّلات بصرية موحّدة
 * ========================================================================
 * التكامل (من واقع الملفات الحية):
 * - normalizeLight/normalizeMotion بنفس معادلات PresenceBridge وliving-world تمامًا
 *   (log10(light+1)/4 ⇒ اتساق تام بين كل مصادر البيانات).
 * - snapshotFromSensors() يحوّل ناتج DevicePresenceEngine.getSensors() إلى EnvSnapshot.
 * - reactToEnvironment() يطبّق عتبات التصميم (Low Light/Bright/Loud/Soft/Near/Motion/Camera).
 * - applyModsToPatch() يدمج المعدِّلات داخل رقعة PresenceState القادمة من
 *   EmotionToVisualMapper ⇒ المحرك/المنسّق يقرآن كائنًا واحدًا نهائيًا (كيان واحد، لا تأثيرات متفرقة).
 * نقي + حتمي + بلا آثار جانبية.
 */
import type { PresenceState } from './PresenceTypes';

export interface EnvSnapshot {
  ambientLight?: number;  // 0-1 مُطبَّع
  noise?: number;         // 0-1 مستوى الصوت البيئي
  motion?: number;        // 0-1 حركة الجهاز/المستخدم
  proximity?: number;     // 0-1 قرب المستخدم
  userPresent?: boolean;  // وجه مكتشف خلال آخر 20ث
  camera?: boolean;       // الكاميرا مفعلة الآن
  listening?: boolean;    // يصغي (ميكروفون مفتوح)
  speaking?: boolean;     // يتحدث الآن
  thinking?: boolean;     // يعالج الآن
  night?: boolean;        // وضع الليل
}

export interface EnvMods {
  glowMul: number;       // مضاعف توهج الهالة/النواة
  tremble: number;       // اهتزاز الغشاء 0-1 (ضوضاء عالية)
  transparency: number;  // شفافية الغشاء 0-1 (إضاءة ساطعة)
  haloSpread: number;    // تمدد الهالة × (قرب/حركة)
  gazeLock: boolean;     // قفل النظر نحو الكاميرا
  eyeGlow: number;       // تعزيز توهج العيون (ظلام/قرب/إصغاء)
  particleCalm: number;  // إبطاء الجسيمات 0-1 (هدوء/تركيز)
  breathSlow: number;    // إبطاء التنفس 0-1 (ليل/نعاس)
}

export const DEFAULT_MODS: EnvMods = {
  glowMul: 1, tremble: 0, transparency: 0, haloSpread: 1,
  gazeLock: false, eyeGlow: 0, particleCalm: 0, breathSlow: 0,
};

const c01 = (n: unknown, fb = 0): number => { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb; };

/** نفس معادلة PresenceBridge حرفيًا ⇒ لا انحراف بين المصادر */
export const normalizeLight = (raw: number | null | undefined): number =>
  raw == null ? 0.5 : raw > 1 ? c01(Math.log10(Math.max(1, raw) + 1) / 4) : c01(raw);

/** نفس منطق living-world/PresenceBridge للمovement */
export const normalizeMotion = (s: any): number =>
  s?.userWalking ? 0.7 : s?.userStationary ? 0.05 : c01(s?.movement ?? 0.3);

/** يحوّل ناتج DevicePresenceEngine.getSensors() + حالة المحادثة إلى EnvSnapshot موحّد */
export function snapshotFromSensors(s: any, conv: { listening?: boolean; speaking?: boolean; thinking?: boolean; camera?: boolean } = {}): EnvSnapshot {
  return {
    ambientLight: normalizeLight(s?.lightLevel),
    noise: c01(s?.audioLevel),
    motion: normalizeMotion(s),
    proximity: s?.faceDetected ? 0.85 : 0.5,
    userPresent: !!s?.faceDetected,
    camera: !!conv.camera,
    listening: !!conv.listening,
    speaking: !!conv.speaking,
    thinking: !!conv.thinking,
    night: !!s?.isNightTime,
  };
}

/** عتبات التصميم المرجعي (صف Environmental Reactions) */
export function reactToEnvironment(e: EnvSnapshot): EnvMods {
  const m: EnvMods = { ...DEFAULT_MODS };
  const light = c01(e.ambientLight, 0.5);
  const noise = c01(e.noise);
  const motion = c01(e.motion);
  const prox = c01(e.proximity);

  // Low Light ⇒ هالة خافتة + عيون متوهجة
  if (light < 0.25) { m.glowMul = 0.75; m.eyeGlow = 0.8; }
  // Bright Light ⇒ هالة ساطعة + غشاء أكثر شفافية
  else if (light > 0.8) { m.glowMul = 1.2; m.transparency = 0.25; }

  // Loud Noise ⇒ اهتزاز + عيون متسعة (إلا إن كان هو المتحدث)
  if (noise > 0.6 && !e.speaking) { m.tremble = 0.6; m.eyeGlow = Math.max(m.eyeGlow, 0.4); }
  // Soft Voice ⇒ هالة ناعمة + عيون مركزة + جسيمات هادئة
  else if (noise < 0.25 && e.listening) { m.eyeGlow = Math.max(m.eyeGlow, 0.35); m.particleCalm = Math.max(m.particleCalm, 0.5); }

  // Motion Detected ⇒ هالة متحركة + نظر حر
  if (motion > 0.65) m.haloSpread = 1.15;

  // User Near ⇒ هالة متمددة + عيون متصلة
  if (prox > 0.7 || e.userPresent) { m.haloSpread = Math.max(m.haloSpread, 1.1); m.eyeGlow = Math.max(m.eyeGlow, 0.3); }

  // Camera On ⇒ العيون تنظر للكاميرا
  if (e.camera) m.gazeLock = true;

  // Listening ⇒ تركيز: جسيمات أهدأ وهالة أضيق قليلًا
  if (e.listening) { m.particleCalm = Math.max(m.particleCalm, 0.35); m.haloSpread = Math.min(m.haloSpread, 0.97); }

  // Thinking ⇒ تركيز عميق: جسيمات أبطأ بلا اهتزاز
  if (e.thinking) { m.particleCalm = Math.max(m.particleCalm, 0.3); m.tremble = 0; }

  // Night ⇒ تنفس أبطأ وجسيمات أهدأ (ميل للنوم)
  if (e.night) { m.breathSlow = Math.max(m.breathSlow, 0.45); m.particleCalm = Math.max(m.particleCalm, 0.4); }

  return m;
}

/** يدمج المعدِّلات داخل رقعة PresenceState (القادمة من EmotionToVisualMapper) ⇒ كائن بصري واحد نهائي */
export function applyModsToPatch(patch: Partial<PresenceState>, m: EnvMods): Partial<PresenceState> {
  const out: Partial<PresenceState> = { ...patch };
  if (typeof out.turbulence === 'number') out.turbulence = Math.min(1, out.turbulence * (0.8 + m.tremble * 0.8));
  if (typeof out.fieldOpacity === 'number') out.fieldOpacity = Math.max(0.15, out.fieldOpacity * (1 - m.transparency * 0.5));
  if (typeof out.eyeGlow === 'number') out.eyeGlow = Math.min(1, out.eyeGlow * (0.85 + m.eyeGlow * 0.5));
  if (typeof out.breathing === 'number') out.breathing = Math.max(0.1, out.breathing * (1 - m.breathSlow * 0.4));
  if (typeof out.fieldRadius === 'number') out.fieldRadius = Math.min(1.7, out.fieldRadius * m.haloSpread);
  if (m.gazeLock) { out.gazeX = 0; out.gazeY = 0; }
  return out;
}
