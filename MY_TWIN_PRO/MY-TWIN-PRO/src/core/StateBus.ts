/**
 * StateBus v2.0 — حافلة الحالة المركزية للكيان الحي
 * ===================================================
 * العقد الوحيد الذي تكتب فيه: PresenceBridge (حساسات) + living-world (مشاعر/محادثة)
 * + index (ولادة) + WS (طاقة حية)، ويقرأ منه: المنسّق والطبقات والـ Reactor.
 *
 * ضمانات إنتاجية:
 * - حماية NaN: أي رقم غير منتهٍ يُرفض صامتًا (لا يُسمَّمState).
 * - إشعار تفاضلي: المستمعون يُستدعون فقط عند تغيّر فعلي، مع قائمة المفاتيح المتغيرة.
 * - عزل المستمعين: مستمع رامي لا يكسر البث لبقية المستمعين.
 * - API متطابق خلفيًا: getState/patch/subscribe بنفس التواقيع ⇒ صفر كسر للمستهلكين.
 */

export interface StateBusState {
  // ── بيئة/حساسات (يكتبها PresenceBridge + living-world) ──
  ambientLight?: number;   // 0-1
  movement?: number;       // 0-1
  proximity?: number;      // 0-1
  userPresent?: boolean;
  voiceLevel?: number;     // 0-1
  touch?: number;          // 0|1 لمسة حية

  // ── عاطفة/سلوك (buildPresencePatch + EventBus) ──
  emotionValence?: number; // -1..1
  arousal?: number;        // 0-1
  curiosity?: number;      // 0-1
  focus?: number;          // 0-1
  connection?: number;     // 0-1 رابطة
  memoryLevel?: number;    // 0-1 ذاكرة حية
  energy?: number;         // 0-1 طاقة (تُغذى أيضًا من WS)

  // ── حالات المحادثة ──
  thinking?: boolean;
  listening?: boolean;
  speaking?: boolean;

  // ── نظر (setGaze) ──
  gazeX?: number;          // -1..1
  gazeY?: number;          // -1..1
}

export type StateListener = (state: StateBusState, changed: Array<keyof StateBusState>) => void;

const DEFAULTS: StateBusState = {
  ambientLight: 0.5, movement: 0.3, proximity: 0.5, userPresent: false, voiceLevel: 0, touch: 0,
  emotionValence: 0, arousal: 0.3, curiosity: 0.45, focus: 0.5, connection: 0.2, memoryLevel: 0, energy: 0.55,
  thinking: false, listening: false, speaking: false,
  gazeX: 0, gazeY: 0,
};

class StateBus {
  private state: StateBusState;
  private listeners = new Set<StateListener>();

  constructor() { this.state = { ...DEFAULTS }; }

  /** قراءة متزامنة (نفس التوقيع القديم) */
  getState(): StateBusState { return this.state; }

  /** دمج آمن + إشعار تفاضلي */
  patch(p: Partial<StateBusState>): void {
    if (!p || typeof p !== 'object') return;
    const changed: Array<keyof StateBusState> = [];
    const next: StateBusState = { ...this.state };
    (Object.keys(p) as Array<keyof StateBusState>).forEach((k) => {
      const v = (p as any)[k];
      if (typeof v === 'number' && !Number.isFinite(v)) return; // درع NaN
      if ((next as any)[k] !== v) { (next as any)[k] = v; changed.push(k); }
    });
    if (changed.length === 0) return;
    this.state = next;
    this.listeners.forEach((l) => { try { l(this.state, changed); } catch {} });
  }

  /** اشتراك ⇒ دالة إلغاء (يستخدمها المستمعون مستقبلاً بدل الاستطلاع بالفواصل) */
  subscribe(l: StateListener): () => void {
    this.listeners.add(l);
    return () => { this.listeners.delete(l); };
  }

  /** عدد المستمعين (تشخيص) */
  get listenerCount(): number { return this.listeners.size; }

  /** إعادة تهيئة (اختبارات/خروج حساب) */
  reset(): void { this.state = { ...DEFAULTS }; }
}

export const stateBus = new StateBus();
export default stateBus;
