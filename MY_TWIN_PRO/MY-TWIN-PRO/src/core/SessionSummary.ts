import { livingSession, SessionState } from './LivingSession';
import { journeyRecorder } from './JourneyRecorder';
import { stateBus } from './StateBus';
import { unifiedBrainBridge } from './UnifiedBrainBridge';
import { EventBus } from './EventBus';

/**
 * ملخص الجلسة
 */
export interface SessionSummaryData {
  sessionId: string;
  title: string;
  identity: string;
  weather: string;
  durationMin: number;
  worldsVisited: string[];
  emotionalJourney: string;
  dominantEmotion: string;
  bondDelta: number;
  sacredMoments: number;
  depthScore: number;
  productivityScore: number;
  summaryText: string;
  highlightMoment: string;
}

/**
 * SESSION SUMMARY BUILDER v2.0
 * =============================
 * يبني ملخصاً غنياً للجلسة بعد انتهائها.
 * يستخدمه التوأم لاحقاً للتذكر والتحليل.
 *
 * ✅ المصادر الجديدة: StateBus (للرابطة)، UnifiedBrainBridge (لتخزين الذاكرة)
 */
export class SessionSummary {
  /**
   * بناء ملخص كامل للجلسة
   */
  build(): SessionSummaryData | null {
    const session = livingSession.getCurrent();
    if (!session) return null;

    const journey = journeyRecorder.getSummary();
    const durationMs = Date.now() - session.startedAt - session.totalPausedMs;
    const durationMin = Math.round(durationMs / 60000);
    
    // ✅ من StateBus: مستوى الرابطة الحالي
    const currentBond = stateBus.getState().relationship.bondLevel;
    const bondDelta = currentBond - session.bondAtStart;

    const summary: SessionSummaryData = {
      sessionId: session.id,
      title: this.generateTitle(session),
      identity: session.identity,
      weather: session.weather,
      durationMin,
      worldsVisited: journey.worldsVisited,
      emotionalJourney: this.buildEmotionalJourney(session),
      dominantEmotion: journey.dominantEmotion,
      bondDelta,
      sacredMoments: session.sacredMoments.length,
      depthScore: session.depthScore,
      productivityScore: this.calculateProductivity(session, journey),
      summaryText: this.generateSummaryText(session, durationMin, journey),
      highlightMoment: this.findHighlightMoment(session),
    };

    // حفظ في الذاكرة طويلة المدى عبر الجسر الموحد
    this.saveSummary(summary);

    // إصدار حدث
    EventBus.emit('SESSION_SUMMARY_READY', summary);

    return summary;
  }

  // ═══════════════════════════════════════════════════
  // Private
  // ═══════════════════════════════════════════════════

  private generateTitle(session: SessionState): string {
    const hour = new Date(session.startedAt).getHours();
    const timeOfDay = hour < 12 ? 'صباحية' : hour < 18 ? 'بعد الظهر' : 'مسائية';
    const identityLabels: Record<string, string> = {
      study: 'جلسة دراسة', creative: 'جلسة إبداعية', business: 'جلسة أعمال',
      reflection: 'جلسة تأمل', silent: 'جلسة هادئة', general: 'جلسة',
    };
    return `${identityLabels[session.identity] || 'جلسة'} ${timeOfDay}`;
  }

  private buildEmotionalJourney(session: SessionState): string {
    const arc = session.emotionalArc;
    if (arc.length < 3) return 'مستقر';

    const first = arc[0].emotion;
    const last = arc[arc.length - 1].emotion;

    if (first === 'anxiety' && last === 'calm') return 'قلق → هدوء';
    if (first === 'sadness' && last === 'calm') return 'حزن → اطمئنان';
    if (first === 'neutral' && last === 'joy') return 'حياد → فرح';
    if (first === 'focused' && last === 'focused') return 'تركيز مستمر';

    return `${first} → ${last}`;
  }

  private calculateProductivity(session: SessionState, journey: { worldsVisited: string[]; totalSteps: number; dominantEmotion: string }): number {
    let score = 0.5;
    if (journey.worldsVisited.includes('study')) score += 0.2;
    if (journey.worldsVisited.includes('code_lab')) score += 0.2;
    if (journey.worldsVisited.includes('business')) score += 0.15;
    if (session.sacredMoments.length > 0) score += 0.1;
    return Math.min(1, score);
  }

  private generateSummaryText(session: SessionState, durationMin: number, journey: { worldsVisited: string[]; totalSteps: number; dominantEmotion: string }): string {
    const worlds = journey.worldsVisited.filter(w => w !== 'living_world');
    let text = `جلسة ${session.identity} استمرت ${durationMin} دقيقة. `;
    if (worlds.length > 0) text += `زار ${worlds.length} عوالم: ${worlds.join('، ')}. `;
    if (session.sacredMoments.length > 0) text += `شهدت ${session.sacredMoments.length} لحظات مهمة. `;
    text += `الجو العام كان ${session.weather}.`;
    return text;
  }

  private findHighlightMoment(session: SessionState): string {
    if (session.sacredMoments.length > 0) {
      return session.sacredMoments[session.sacredMoments.length - 1].title;
    }
    const arc = session.emotionalArc;
    if (arc.length < 2) return '';
    const peak = arc.reduce((max, p) => p.intensity > max.intensity ? p : max, arc[0]);
    return `ذروة عاطفية: ${peak.emotion} (${Math.round(peak.intensity * 100)}%)`;
  }

  private async saveSummary(summary: SessionSummaryData): Promise<void> {
    try {
      // ✅ عبر الجسر الموحد: تخزين الذاكرة في الـ Backend
      await unifiedBrainBridge.storeMemory(
        'event',
        summary.summaryText,
        75,
        summary.weather,
        ['session_summary']
      );
    } catch (e) {
      // فشل صامت — الجلسة لا تزال صالحة
    }
  }
}

export const sessionSummary = new SessionSummary();
