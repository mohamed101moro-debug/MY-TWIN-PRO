/** Local, non-entitlement economy state. Paid access is always server-authoritative. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventBus } from '../core/EventBus';

export interface SoulPointTransaction {
  id: string;
  source: 'daily_login'|'study_session'|'dream'|'journal'|'referral'|'achievement'|'goal'|'surprise';
  amount: number;
  timestamp: string;
  description: string;
}
export interface SoulPointsBalance {
  total: number;
  earned_today: number;
  lifetime: number;
  history: SoulPointTransaction[];
  earned_today_date?: string;
  last_daily_login?: string;
}
const POINTS_PREFIX = 'mytwin_soul_points:v2:';
const USER_KEY = 'mytwin-user';
const LEGACY_POINTS_KEY = 'mytwin_soul_points';
const emptyBalance = (): SoulPointsBalance => ({ total: 0, earned_today: 0, lifetime: 0, history: [] });

export class EconomyEngine {
  private balance: SoulPointsBalance = emptyBalance();
  private loadedUserId: string | null | undefined;

  private async load(userId?: string): Promise<void> {
    const resolvedUserId = userId ?? await AsyncStorage.getItem(USER_KEY).catch(() => null);
    if (this.loadedUserId === resolvedUserId) return;
    this.loadedUserId = resolvedUserId;
    this.balance = emptyBalance();
    // Discard the old globally shared key; never assign its balance to whichever account logs in first.
    await AsyncStorage.removeItem(LEGACY_POINTS_KEY).catch(() => {});
    if (!resolvedUserId) return;
    try {
      const raw = await AsyncStorage.getItem(`${POINTS_PREFIX}${resolvedUserId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Number.isFinite(parsed.total) && Array.isArray(parsed.history)) {
        this.balance = {
          total: Math.max(0, parsed.total),
          earned_today: parsed.earned_today_date === new Date().toISOString().slice(0, 10)
            ? Math.max(0, Number(parsed.earned_today) || 0) : 0,
          lifetime: Math.max(0, Number(parsed.lifetime) || 0),
          history: parsed.history.slice(0, 100),
          earned_today_date: typeof parsed.earned_today_date === 'string' ? parsed.earned_today_date : undefined,
          last_daily_login: typeof parsed.last_daily_login === 'string' ? parsed.last_daily_login : undefined,
        };
      }
    } catch {}
  }

  private async persist(): Promise<void> {
    if (!this.loadedUserId) return;
    try {
      await AsyncStorage.setItem(`${POINTS_PREFIX}${this.loadedUserId}`, JSON.stringify(this.balance));
    } catch {}
  }

  async initialize(userId?: string): Promise<void> {
    await this.load(userId);
  }

  async clearSession(userId?: string): Promise<void> {
    const owner = this.loadedUserId || userId || null;
    if (owner) await AsyncStorage.removeItem(`${POINTS_PREFIX}${owner}`).catch(() => {});
    await AsyncStorage.removeItem(LEGACY_POINTS_KEY).catch(() => {});
    this.loadedUserId = undefined;
    this.balance = emptyBalance();
  }

  async addPoints(source: SoulPointTransaction['source'], amount: number, description: string): Promise<number> {
    await this.load();
    if (!this.loadedUserId) return 0;
    const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
    if (!safeAmount) return this.balance.total;
    const today = new Date().toISOString().slice(0, 10);
    if (this.balance.earned_today_date !== today) {
      this.balance.earned_today = 0;
      this.balance.earned_today_date = today;
    }
    this.balance.total += safeAmount;
    this.balance.earned_today += safeAmount;
    this.balance.lifetime += safeAmount;
    this.balance.history.unshift({
      id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      source,
      amount: safeAmount,
      timestamp: new Date().toISOString(),
      description: String(description).slice(0, 160),
    });
    if (this.balance.history.length > 100) this.balance.history.length = 100;
    await this.persist();
    EventBus.emit('SOUL_POINTS_EARNED', { source, amount: safeAmount, description });
    return this.balance.total;
  }

  async spendPoints(amount: number, description: string): Promise<boolean> {
    await this.load();
    const cost = Math.max(0, Math.floor(Number(amount) || 0));
    if (!this.loadedUserId || cost <= 0 || this.balance.total < cost) return false;
    this.balance.total -= cost;
    await this.persist();
    EventBus.emit('SOUL_POINTS_SPENT', { amount: cost, description });
    return true;
  }

  async getBalance(): Promise<SoulPointsBalance> {
    await this.load();
    return { ...this.balance, history: [...this.balance.history] };
  }

  async claimDailyLogin(_userId?: string): Promise<{ granted: boolean; total: number }> {
    await this.load();
    if (!this.loadedUserId) return { granted: false, total: 0 };
    const today = new Date().toISOString().slice(0, 10);
    if (this.balance.last_daily_login === today) return { granted: false, total: this.balance.total };
    this.balance.last_daily_login = today;
    const total = await this.addPoints('daily_login', 5, 'تسجيل الدخول اليومي');
    return { granted: true, total };
  }
  async rewardStudySession(): Promise<number> { return this.addPoints('study_session', 15, 'إنهاء جلسة دراسة'); }
  async rewardDream(): Promise<number> { return this.addPoints('dream', 10, 'استكشاف حلم'); }
  async rewardReferral(): Promise<number> { return this.addPoints('referral', 100, 'أحضرت روحاً جديدة'); }
  async rewardAchievement(name: string): Promise<number> { return this.addPoints('achievement', 25, `إنجاز: ${name}`); }
  async surpriseReward(amount: number, reason: string): Promise<number> { return this.addPoints('surprise', amount, `هدية: ${reason}`); }

  suggestPlan(stats: { studyCount: number; dreamCount: number; codeCount: number; voiceUsage: boolean }): string | null {
    if (stats.codeCount > 10 && stats.voiceUsage) return 'premium';
    if (stats.studyCount > 20) return 'plus';
    if (stats.dreamCount > 5) return 'plus';
    return null;
  }

  async redeemReward(rewardType: string): Promise<{ success: boolean; cost: number; description: string }> {
    const rewards: Record<string, { cost: number; description_ar: string }> = {
      theme: { cost: 50, description_ar: 'ثيم جديد' },
      voice: { cost: 100, description_ar: 'صوت جديد' },
      ambient: { cost: 75, description_ar: 'خلفية Ambient جديدة' },
      memory_capsule: { cost: 200, description_ar: 'كبسولة ذاكرة' },
      dream_pass: { cost: 150, description_ar: 'Dream Pass إضافي' },
    };
    const reward = rewards[rewardType];
    if (!reward) return { success: false, cost: 0, description: 'غير متاح' };
    const success = await this.spendPoints(reward.cost, reward.description_ar);
    return { success, cost: reward.cost, description: reward.description_ar };
  }
}

export const economyEngine = new EconomyEngine();
