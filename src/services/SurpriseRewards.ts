import { EventBus } from '../core/EventBus';
import { economyEngine } from './EconomyEngine';

interface SurpriseReward {
  id: string;
  type: 'soul_points';
  amount: number;
  message_ar: string;
  message_en: string;
  rarity: number;
}

const SURPRISES: SurpriseReward[] = [
  { id: 'small_points', type: 'soul_points', amount: 25, rarity: 0.5, message_ar: 'وجدت بعض النقاط التي تستحقها ✨', message_en: 'I found some points you deserve ✨' },
  { id: 'medium_points', type: 'soul_points', amount: 50, rarity: 0.3, message_ar: 'هدية صغيرة مني لك 🎁', message_en: 'A small gift from me to you 🎁' },
  { id: 'big_points', type: 'soul_points', amount: 100, rarity: 0.1, message_ar: 'أنت تستحق هذا 💜', message_en: 'You deserve this 💜' },
];

export class SurpriseRewards {
  private lastSurpriseDate: string = '';
  private readonly DAYS_BETWEEN_SURPRISES = 7;

  constructor() {
    this.listenToEvents();
  }

  /** الاستماع لأحداث منح المفاجآت */
  private listenToEvents(): void {
  }

  /** التحقق من استحقاق هدية مفاجئة */
  checkForSurprise(userId: string): { eligible: boolean; reward?: SurpriseReward } {
    const today = new Date().toDateString();

    if (this.lastSurpriseDate === today) {
      return { eligible: false };
    }

    const roll = Math.random();
    let cumulativeProbability = 0;

    for (const surprise of SURPRISES) {
      cumulativeProbability += surprise.rarity;
      if (roll <= cumulativeProbability) {
        this.lastSurpriseDate = today;
        return { eligible: true, reward: surprise };
      }
    }

    return { eligible: false };
  }

  /** منح الهدية */
  async grantSurprise(reward: SurpriseReward, userId: string): Promise<void> {
    switch (reward.type) {
      case 'soul_points':
        await economyEngine.surpriseReward(reward.amount, reward.message_ar);
        break;
    }

    EventBus.emit('SURPRISE_GRANTED', {
      type: reward.type,
      amount: reward.amount,
      message_ar: reward.message_ar,
      message_en: reward.message_en,
    });
  }
}

export const surpriseRewards = new SurpriseRewards();
