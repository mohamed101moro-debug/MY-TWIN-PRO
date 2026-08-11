import { commercePlugin, PlanTier, PurchaseResult } from './CommercePlugin';
import { EventBus } from '../core/EventBus';
import { StateBus } from '../core/StateBus';

const TIER_CAPABILITIES: Record<PlanTier, string[]> = {
  free: ['chat', 'weather', 'search', 'translate', 'summarize'],
  plus: ['chat', 'study', 'content', 'dreams', 'proactive'],
  premium: ['chat', 'study', 'code', 'business', 'coach', 'content', 'dreams', 'proactive', 'deep_search', 'shadow_mode'],
  pro: ['chat', 'study', 'code', 'business', 'coach', 'content', 'dreams', 'smart_home', 'proactive', 'deep_search', 'shadow_mode'],
  yearly: ['all'],
};

export class SubscriptionService {
  private currentTier: PlanTier = 'free';
  private capabilities: string[] = [];
  private isInitialized = false;

  async initialize(userId: string): Promise<void> {
    if (this.isInitialized) return;
    await commercePlugin.initialize();
    const subscription = await commercePlugin.getCurrentSubscription(userId);
    if (subscription?.isActive) {
      this.currentTier = subscription.tier;
    } else {
      this.currentTier = 'free';
    }
    this.capabilities = TIER_CAPABILITIES[this.currentTier] || TIER_CAPABILITIES.free;
    this.isInitialized = true;
    EventBus.emit('SUBSCRIPTION_INITIALIZED', { tier: this.currentTier, capabilities: this.capabilities });
  }

  async purchase(planId: PlanTier, userId: string): Promise<PurchaseResult> {
    const result = await commercePlugin.purchase(planId, userId);
    if (result.success) {
      this.currentTier = planId;
      this.capabilities = TIER_CAPABILITIES[planId] || TIER_CAPABILITIES.free;
      EventBus.emit('SUBSCRIPTION_UPDATED', { tier: this.currentTier, capabilities: this.capabilities });
    }
    return result;
  }

  async restore(userId: string): Promise<PurchaseResult> {
    const result = await commercePlugin.restorePurchases(userId);
    if (result.success && result.tier) {
      this.currentTier = result.tier;
      this.capabilities = TIER_CAPABILITIES[result.tier] || TIER_CAPABILITIES.free;
      EventBus.emit('SUBSCRIPTION_RESTORED', { tier: this.currentTier, capabilities: this.capabilities });
    }
    return result;
  }

  /** ✅ ترقية مؤقتة لمدة محدودة (للمفاجآت) */
  async upgradeForDuration(userId: string, tier: PlanTier, days: number): Promise<boolean> {
    try {
      const { apiPost } = require('../../lib/httpClient');
      const res = await apiPost('/api/billing/upgrade-temporary', {
        user_id: userId,
        tier: tier,
        duration_days: days,
      });
      if (res?.success) {
        this.currentTier = tier;
        this.capabilities = TIER_CAPABILITIES[tier] || TIER_CAPABILITIES.free;
        EventBus.emit('SUBSCRIPTION_UPDATED', { tier: this.currentTier, capabilities: this.capabilities });
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[Subscription] Temporary upgrade failed:', e);
      return false;
    }
  }

  canUseCapability(capability: string): boolean {
    if (this.capabilities.includes('all')) return true;
    return this.capabilities.includes(capability);
  }

  getCurrentTier(): PlanTier { return this.currentTier; }
  getCapabilities(): string[] { return [...this.capabilities]; }
  isPremium(): boolean { return this.currentTier !== 'free'; }

  async cancel(userId: string): Promise<boolean> {
    const success = await commercePlugin.cancel(userId);
    if (success) {
      this.currentTier = 'free';
      this.capabilities = TIER_CAPABILITIES.free;
      EventBus.emit('SUBSCRIPTION_CANCELLED', {});
    }
    return success;
  }
}

export const subscriptionService = new SubscriptionService();
