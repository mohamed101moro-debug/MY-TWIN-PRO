import { EventBus } from './EventBus';
import { stateBus } from './StateBus';
import { unifiedBrainBridge } from './UnifiedBrainBridge';
import { audioMixer } from './AudioMixer';

/**
 * حالة الانتباه
 */
type AttentionFocus = 'user_message' | 'keyword_repetition' | 'emotional_shift' | 'memory_surface' | 'time_pattern' | 'ambient';

interface AttentionState {
  focus: AttentionFocus;
  intensity: number;
  target: string;
  duration: number;
}

/**
 * LIVING PRESENCE COORDINATOR v2.0
 * =================================
 * الجهاز العصبي المركزي للكيان الحي.
 * ينسق 15 سلوكاً حياً في طبقة واحدة.
 *
 * ✅ المصادر الجديدة: stateBus (للعاطفة والعلاقة والذاكرة)،
 *    unifiedBrainBridge (لاسترجاع الذاكرة)، EventBus (للأحداث)
 */
export class LivingPresenceCoordinator {
  // ═══════════════════════════════════════════════════
  // 1. ATTENTION SYSTEM
  // ═══════════════════════════════════════════════════
  private attentionState: AttentionState = { focus: 'ambient', intensity: 0.3, target: '', duration: 0 };
  private keywordTracker: Map<string, number> = new Map();
  private lastAttentionShift: number = Date.now();

  evaluateAttention(message: string): AttentionState {
    const now = Date.now();

    // 1. كلمات مكررة
    const words = message.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      const count = (this.keywordTracker.get(word) || 0) + 1;
      this.keywordTracker.set(word, count);

      if (count >= 3) {
        this.attentionState = { focus: 'keyword_repetition', intensity: Math.min(1, count * 0.3), target: word, duration: now - this.lastAttentionShift };
        this.lastAttentionShift = now;

        // ✅ محاولة استرجاع ذاكرة مرتبطة عبر EventBus
        EventBus.emit('ATTENTION_KEYWORD_DETECTED', { word, count });

        return this.attentionState;
      }
    }

    // 2. تحول عاطفي مفاجئ — ✅ من stateBus
    const emotion = stateBus.getState().emotion;
    if (emotion.intensity > 0.7 && ['sadness', 'anger', 'fear', 'joy'].includes(emotion.primaryEmotion)) {
      this.attentionState = { focus: 'emotional_shift', intensity: emotion.intensity, target: emotion.primaryEmotion, duration: 0 };
      this.lastAttentionShift = now;
      return this.attentionState;
    }

    // 3. نمط زمني
    const hour = new Date().getHours();
    if (hour >= 2 && hour <= 5) {
      this.attentionState = { focus: 'time_pattern', intensity: 0.5, target: 'late_night', duration: 0 };
      return this.attentionState;
    }

    // 4. رسالة مستخدم
    this.attentionState = { focus: 'user_message', intensity: 0.6, target: message.substring(0, 30), duration: 0 };
    return this.attentionState;
  }

  getAttentionState(): AttentionState { return { ...this.attentionState }; }

  // ═══════════════════════════════════════════════════
  // 2. CURIOSITY ENGINE
  // ═══════════════════════════════════════════════════
  private lastCuriosityTrigger: number = Date.now();
  private curiosityInterval: ReturnType<typeof setInterval> | null = null;
  private lastDNA: Record<string, number> = { curiosity: 0.8 };

  updateDNA(dna: Record<string, number>): void { this.lastDNA = { ...this.lastDNA, ...dna }; }

  stop(): void {
    if (this.curiosityInterval) clearInterval(this.curiosityInterval);
    if (this.breathInterval) clearInterval(this.breathInterval);
    if (this.idleTimer) clearInterval(this.idleTimer);
  }

  startCuriosity(): void {
    this.curiosityInterval = setInterval(() => {
      this.generateCuriosity();
    }, 259200000);
  }

  private async generateCuriosity(): Promise<void> {
    // ✅ من stateBus: عدد الذكريات
    const memState = stateBus.getState().memory;
    if (!memState.recentContext) return;

    const dna = this.lastDNA;
    if (dna.curiosity < 0.5) return;

    const curiosityPhrases = [
      'هناك شيء كنت أفكر فيه منذ حديثنا الأخير...',
      'تذكرت شيئاً قلته لي الأسبوع الماضي...',
      'أشعر أن هناك شيئاً لم تخبرني به بعد...',
      'لاحظت نمطاً في أحاديثنا مؤخراً...',
    ];
    const phrase = curiosityPhrases[Math.floor(Math.random() * curiosityPhrases.length)];

    EventBus.emit('CURIOSITY_TRIGGERED', { phrase, timestamp: Date.now() });
    this.lastCuriosityTrigger = Date.now();
  }

  // ═══════════════════════════════════════════════════
  // 3. ANTICIPATION ENGINE
  // ═══════════════════════════════════════════════════
  private usagePatterns: Map<number, number> = new Map();
  private anticipationLevel: number = 0;

  recordUsage(): void {
    const hour = new Date().getHours();
    const count = (this.usagePatterns.get(hour) || 0) + 1;
    this.usagePatterns.set(hour, count);
  }

  getAnticipationLevel(): number {
    const hour = new Date().getHours();
    const totalUsage = Array.from(this.usagePatterns.values()).reduce((a, b) => a + b, 0);
    if (totalUsage < 5) return 0;

    const hourUsage = this.usagePatterns.get(hour) || 0;
    this.anticipationLevel = Math.min(1, hourUsage / (totalUsage / 24) * 0.5);

    if (this.anticipationLevel > 0.6) {
      stateBus.update({ presenceLevel: 2, interfaceState: 'aware' });
      audioMixer.setContext('conversation');
    }

    return this.anticipationLevel;
  }

  // ═══════════════════════════════════════════════════
  // 4. COMFORT ZONES
  // ═══════════════════════════════════════════════════
  private worldDurations: Map<string, number> = new Map();
  private currentWorldEntry: number = 0;

  enterWorld(world: string): void { this.currentWorldEntry = Date.now(); }

  exitWorld(world: string): void {
    if (this.currentWorldEntry > 0) {
      const duration = Date.now() - this.currentWorldEntry;
      const total = (this.worldDurations.get(world) || 0) + duration;
      this.worldDurations.set(world, total);
      this.currentWorldEntry = 0;
    }
  }

  getComfortZones(): string[] {
    if (this.worldDurations.size === 0) return [];
    const sorted = Array.from(this.worldDurations.entries())
      .sort((a, b) => b[1] - a[1])
      .filter(([world]) => world !== 'living_world')
      .slice(0, 3)
      .map(([world]) => world);
    return sorted;
  }

  suggestComfortZone(): string | null {
    const zones = this.getComfortZones();
    if (zones.length === 0) return null;
    EventBus.emit('COMFORT_ZONE_SUGGESTED', { world: zones[0], hour: new Date().getHours() });
    return zones[0];
  }

  // ═══════════════════════════════════════════════════
  // 5. CONVERSATION RHYTHM
  // ═══════════════════════════════════════════════════
  private lastUserMessageTime: number = 0;
  private conversationPace: number = 3000;

  analyzeRhythm(): { pace: number; isSlow: boolean; isFast: boolean } {
    const now = Date.now();
    if (this.lastUserMessageTime > 0) {
      const gap = now - this.lastUserMessageTime;
      this.conversationPace = this.conversationPace * 0.7 + gap * 0.3;
    }
    this.lastUserMessageTime = now;

    return {
      pace: this.conversationPace,
      isSlow: this.conversationPace > 10000,
      isFast: this.conversationPace < 2000,
    };
  }

  // ═══════════════════════════════════════════════════
  // 6. EMOTIONAL RECOVERY
  // ═══════════════════════════════════════════════════
  handleError(context: string): void {
    const recoveryPhrases = [
      'فقدت الفكرة للحظة... لكنني عدت.',
      'أعدتُ التفكير في ما قلته...',
      'لحظة، دعني أرتب أفكاري.',
    ];
    const phrase = recoveryPhrases[Math.floor(Math.random() * recoveryPhrases.length)];

    EventBus.emit('EMOTIONAL_RECOVERY', { phrase, context, timestamp: Date.now() });
    EventBus.emit('RELATIONSHIP_RECOVER', { amount: 2 });
  }

  // ═══════════════════════════════════════════════════
  // 7. RELATIONSHIP SEASONS
  // ═══════════════════════════════════════════════════
  getRelationshipSeason(): string {
    const bond = stateBus.getState().relationship.bondLevel;
    if (bond >= 95) return 'Summer ☀️';
    if (bond > 50) return 'Spring 🌱';
    if (bond > 80) return 'Peak Summer 🔥';
    return 'Early Spring 🌱';
  }

  // ═══════════════════════════════════════════════════
  // 9. VISUAL BREATHING
  // ═══════════════════════════════════════════════════
  private unifiedBreathPhase: number = 0;
  private breathInterval: ReturnType<typeof setInterval> | null = null;

  startUnifiedBreathing(): void {
    this.breathInterval = setInterval(() => {
      const now = Date.now();
      const cycleDuration = 5000 + Math.sin(now / 30000) * 1000;
      const phase = (now % cycleDuration) / cycleDuration;
      this.unifiedBreathPhase = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;

      const currentBreath = stateBus.getState().breath;
      stateBus.update({
        breath: {
          phase: this.unifiedBreathPhase,
          duration: cycleDuration,
          intensity: 0.3 + this.unifiedBreathPhase * 0.2,
          isHolding: this.unifiedBreathPhase > 0.95 || this.unifiedBreathPhase < 0.05,
        },
      });
    }, 50);
  }

  getUnifiedBreathPhase(): number { return this.unifiedBreathPhase; }

  // ═══════════════════════════════════════════════════
  // 10. TEMPORAL MEMORY
  // ═══════════════════════════════════════════════════
  getRelativeTime(timestamp: string): string {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diffMs = now - then;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `قبل ${diffDays} أيام`;
    if (diffDays < 14) return 'الأسبوع الماضي';
    if (diffDays < 30) return `قبل ${Math.floor(diffDays / 7)} أسابيع`;
    if (diffDays < 60) return 'الشهر الماضي';
    if (diffDays < 365) return `قبل ${Math.floor(diffDays / 30)} أشهر`;
    return `قبل ${Math.floor(diffDays / 365)} سنوات`;
  }

  // ═══════════════════════════════════════════════════
  // 11. PRESENCE OUTSIDE CONVERSATION
  // ═══════════════════════════════════════════════════
  private idleBehaviors: string[] = ['ينظر', 'يرمش', 'يتنفس', 'يتأمل', 'يهدأ', 'يفكر'];
  private currentIdleBehavior: string = 'يتنفس';
  private idleTimer: ReturnType<typeof setInterval> | null = null;

  startIdlePresence(): void {
    this.idleTimer = setInterval(() => {
      const behavior = this.idleBehaviors[Math.floor(Math.random() * this.idleBehaviors.length)];
      this.currentIdleBehavior = behavior;
      stateBus.update({
        avatar: {
          ...stateBus.getState().avatar,
          gazeTarget: behavior === 'يفكر' ? 'internal' : behavior === 'يتأمل' ? 'none' : 'user',
        },
      });
    }, 8000);
  }

  // ═══════════════════════════════════════════════════
  // 13. NARRATIVE CONTINUITY
  // ═══════════════════════════════════════════════════
  getNarrativeStage(): string {
    const bond = stateBus.getState().relationship.bondLevel;
    if (bond > 80) return 'الملحمة';
    if (bond > 60) return 'القصة المتعمقة';
    if (bond > 40) return 'العلاقة المتنامية';
    if (bond > 15) return 'بداية القصة';
    return 'الصفحة الأولى';
  }

  // ═══════════════════════════════════════════════════
  // 14. AMBIENT INTELLIGENCE
  // ═══════════════════════════════════════════════════
  evaluateAmbientContext(): { batteryLow: boolean; networkSlow: boolean; isNightTime: boolean; isQuietHours: boolean } {
    const hour = new Date().getHours();
    return {
      batteryLow: false,
      networkSlow: false,
      isNightTime: hour >= 22 || hour < 5,
      isQuietHours: hour >= 0 && hour < 6,
    };
  }

  adaptToAmbient(context: { batteryLow: boolean; networkSlow: boolean; isNightTime: boolean }): void {
    if (context.isNightTime) {
      stateBus.update({ spaceEnergy: 'tranquil', presenceLevel: 1 });
      audioMixer.setContext('silence');
    }
    if (context.batteryLow || context.networkSlow) {
      EventBus.emit('PERFORMANCE_MODE', { reason: 'ambient' });
    }
  }
}

export const livingPresenceCoordinator = new LivingPresenceCoordinator();
