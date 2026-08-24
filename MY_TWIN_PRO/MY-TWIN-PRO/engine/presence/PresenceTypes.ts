/**
 * PresenceTypes v2.0 — العقد النوعي الموحّد لحضور الكيان الحي
 * ============================================================
 * هذا الملف هو "الدستور" الذي تقرأ منه وتكتب فيه كل الطبقات:
 * - PresenceEngine (يكتب) • EmotionToVisualMapper (يكتب عبر profileToPresencePatch)
 * - DigitalBeing/ShaderBeing/ConsciousBeing (تقرأ) • PresenceBridge (يعيد التصدير)
 * v2: كل الحقول اختيارية ⇒ صفر كسر للتوافق الخلفي مع أي مستهلك قديم.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface PresenceState {
  // ── العاطفة الأساسية ──
  emotion?: string;           // 'happy'|'curious'|'thinking'|'sad'|'surprised'|'angry'|'sleepy'|'calm'
  intensity?: number;         // 0-1 شدة العاطفة

  // ── الطاقة والنشاط ──
  energy?: number;            // 0-1 مستوى الطاقة العام
  pulse?: number;             // 0-1 نبض النواة/القلب
  breathing?: number;         // 0-1 إيقاع التنفس

  // ── العيون (أقوى عنصر بصري) ──
  eyeOpenness?: number;       // 0-1.1 درجة الفتح (رمش/نعاس/دهشة)
  eyeGlow?: number;           // 0-1 توهج القزحية
  pupilSize?: number;         // 0-1 اتساع البؤبؤ (ضوء/فضول)
  gazeX?: number;             // -1..1 نظر أفقي
  gazeY?: number;             // -1..1 نظر عمودي

  // ── الدفء والارتباط ──
  warmth?: number;            // 0-1 دفء عاطفي
  attention?: number;         // 0-1 انتباه
  anticipation?: number;      // 0-1 ترقّب/فضول

  // ── الصوت والمحادثة ──
  voiceLevel?: number;        // 0-1 مستوى الصوت أثناء النطق
  speaking?: boolean;
  listening?: boolean;
  thinking?: boolean;

  // ── المجال الحي (الغشاء/الهالة) ──
  fieldSpeed?: number;        // 0.05-2 سرعة دوران المجال
  turbulence?: number;        // 0-1 اضطراب العضوية
  orbitality?: number;        // 0.2-0.95 ميل المدارات
  fieldRadius?: number;       // 0.5-1.7 اتساع المجال
  fieldOpacity?: number;      // 0-1 شفافية المجال

  // ── الألوان (هوية الكون الداكن) ──
  colorA?: RGB;               // أساسي (بنفسجي 155,111,255)
  colorB?: RGB;               // ثانوي (أزرق 70,139,255)
  eyeColor?: RGB;             // قزحية (232,222,255)

  // ── البيئة/الحضور ──
  userPresent?: boolean;      // المستخدم قريب (وجه/لمس)
  micro?: string;             // تعبير دقيق عابر (head_nod/membrane_shiver)
}

/** alias توثيقي للكيان الحي v2 — نفس العقد، كل الحقول اختيارية */
export type PresenceStateV2 = PresenceState;
