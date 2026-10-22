/**
 * AWARENESS ENGINE v1.0 — محرك الوعي
 * =====================================
 * يدير مستوى وعي التوأم: الانتباه، الثقة، البحث في الذاكرة.
 * يعمل كطبقة متوسطة بين الحضور والسلوك.
 *
 * التكامل:
 *   - يقرأ ويكتب عبر useTwinState (AwarenessLevel, attention, confidence)
 *   - يصدر الأحداث عبر stateBus القديم
 *   - يستدعيه BehaviorEngine
 *   - يتصل بـ PresenceEngine عند تغير الوعي
 */

import { useTwinState, AwarenessLevel } from '../core/TwinState';
import { stateBus, STATE_EVENTS } from '../../src/core/StateBus';

// ═══════════════════════════════════════════════════════
// خصائص كل مستوى وعي
// ═══════════════════════════════════════════════════════
interface AwarenessProfile {
  attention: number;      // 0 – 100
  confidence: number;     // 0 – 100
  memorySearchDepth: number; // 0.0 – 1.0
  processingSpeed: number;   // 0.0 – 1.0
  label: string;
}

const AWARENESS_PROFILES: Record<AwarenessLevel, AwarenessProfile> = {
  Dormant:      { attention: 5,   confidence: 30, memorySearchDepth: 0.0, processingSpeed: 0.05, label: 'خامل' },
  Aware:        { attention: 45,  confidence: 60, memorySearchDepth: 0.2, processingSpeed: 0.30, label: 'واعي' },
  Focused:      { attention: 80,  confidence: 75, memorySearchDepth: 0.6, processingSpeed: 0.70, label: 'مركز' },
  DeepThinking: { attention: 95,  confidence: 85, memorySearchDepth: 0.9, processingSpeed: 0.90, label: 'تفكير عميق' },
  Flow:         { attention: 100, confidence: 95, memorySearchDepth: 1.0, processingSpeed: 1.00, label: 'منساب' },
  Conscious:    { attention: 90,  confidence: 90, memorySearchDepth: 0.8, processingSpeed: 0.85, label: 'واعي بالكامل' },
};

export class AwarenessEngine {
  private currentProfile: AwarenessProfile;
  private confidenceHistory: number[] = [];
  private readonly MAX_HISTORY = 20;

  constructor() {
    this.currentProfile = AWARENESS_PROFILES.Aware;
  }

  /**
   * تحديث مستوى الوعي
   */
  update(level: AwarenessLevel | string): void {
    // السماح بأسماء مبسطة من BehaviorEngine
    const normalized = this.normalizeLevel(level);
    if (!normalized) return;

    const store = useTwinState.getState();
    const previousLevel = store.awarenessLevel;

    if (previousLevel === normalized) return;

    const profile = AWARENESS_PROFILES[normalized];
    store.setAwarenessLevel(normalized);
    store.setAttention(profile.attention);
    store.setConfidence(profile.confidence);

    this.currentProfile = profile;

    // تتبع الثقة
    this.confidenceHistory.push(profile.confidence);
    if (this.confidenceHistory.length > this.MAX_HISTORY) {
      this.confidenceHistory = this.confidenceHistory.slice(-this.MAX_HISTORY);
    }

    // إصدار الحدث
    stateBus.emit(STATE_EVENTS.AWARENESS_CHANGED, {
      from: previousLevel,
      to: normalized,
      profile,
    });
  }

  /**
   * تعزيز الثقة (بعد تفاعل إيجابي)
   */
  boostConfidence(amount: number): void {
    const store = useTwinState.getState();
    const newConfidence = Math.min(100, store.confidence + amount);
    store.setConfidence(newConfidence);
  }

  /**
   * خفض الثقة (عند الخطأ)
   */
  reduceConfidence(amount: number): void {
    const store = useTwinState.getState();
    const newConfidence = Math.max(10, store.confidence - amount);
    store.setConfidence(newConfidence);
  }

  /**
   * هل التوأم واثق بما يكفي للرد؟
   */
  isConfident(threshold: number = 50): boolean {
    return useTwinState.getState().confidence >= threshold;
  }

  /**
   * هل التوأم في حالة وعي تسمح بالتفكير العميق؟
   */
  canDeepThink(): boolean {
    const level = useTwinState.getState().awarenessLevel;
    return level === 'DeepThinking' || level === 'Flow' || level === 'Conscious';
  }

  /**
   * هل التوأم في حالة وعي تسمح بالبحث في الذاكرة؟
   */
  canSearchMemory(): boolean {
    return this.currentProfile.memorySearchDepth > 0.3;
  }

  /**
   * قراءة الملف الحالي
   */
  getProfile(): AwarenessProfile {
    return { ...this.currentProfile };
  }

  getAttention(): number {
    return this.currentProfile.attention;
  }

  getConfidence(): number {
    return useTwinState.getState().confidence;
  }

  /**
   * متوسط الثقة خلال آخر 10 تفاعلات
   */
  getAverageConfidence(): number {
    if (this.confidenceHistory.length === 0) return 50;
    const sum = this.confidenceHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.confidenceHistory.length);
  }

  /**
   * اتجاه الثقة: تتصاعد أم تتناقص
   */
  getConfidenceTrend(): 'rising' | 'falling' | 'stable' {
    if (this.confidenceHistory.length < 3) return 'stable';
    const recent = this.confidenceHistory.slice(-5);
    const diff = recent[recent.length - 1] - recent[0];
    if (diff > 5) return 'rising';
    if (diff < -5) return 'falling';
    return 'stable';
  }

  // ═══════════════════════════════════════════
  // Private
  // ═══════════════════════════════════════════

  private normalizeLevel(level: string): AwarenessLevel | null {
    const direct = AWARENESS_PROFILES[level as AwarenessLevel];
    if (direct) return level as AwarenessLevel;

    // أسماء بديلة من BehaviorEngine
    const aliases: Record<string, AwarenessLevel> = {
      listening: 'Aware',
      thinking: 'Focused',
      speaking: 'Flow',
      processing: 'DeepThinking',
      searching: 'Focused',
      idle: 'Aware',
      sleeping: 'Dormant',
    };

    return aliases[level] || null;
  }
}

export const awarenessEngine = new AwarenessEngine();
