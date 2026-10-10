import { apiGet } from '../../lib/httpClient';
import {
  initializeIAP,
  purchaseSubscription as iapPurchase,
  restorePurchases as iapRestore,
  validateSubscriptionStatus,
  disconnectIAP,
  PRODUCT_IDS,
} from '../../lib/iapService';

export type PlanTier = 'free' | 'plus' | 'premium' | 'pro' | 'yearly';

export interface PlanInfo {
  tier: PlanTier;
  name: string;
  price: number;
  messages: number;
  features: string[];
  isActive: boolean;
  expiresAt?: string;
}

export interface PurchaseResult {
  success: boolean;
  tier?: PlanTier;
  message?: string;
  cancelled?: boolean;
  needsRestore?: boolean;
}

export class CommercePlugin {
  private initialized = false;

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    try {
      this.initialized = await initializeIAP();
      return this.initialized;
    } catch (e) {
      console.warn('[CommercePlugin] فشل التهيئة:', e);
      return false;
    }
  }

  async getProducts(): Promise<PlanInfo[]> {
    try {
      const res = await apiGet('/api/economy/pricing');
      const plans = (res?.catalog || []).map((p: any) => ({
        tier: (p.tier as PlanTier),
        name: p.tier,
        price: p.price,
        messages: p.gating?.messages_per_day ?? 0,
        features: p.features,
        isActive: false,
      }));
      return plans;
    } catch (e) {
      return [];
    }
  }

  async purchase(planId: PlanTier, userId: string): Promise<PurchaseResult> {
    const productId = PRODUCT_IDS[planId as keyof typeof PRODUCT_IDS];
    if (!productId) {
      return { success: false, message: `معرف منتج غير صالح: ${planId}` };
    }

    try {
      const result: any = await iapPurchase(planId, userId);
      return {
        success: result.success === true,
        tier: result.success === true ? result.tier as PlanTier : undefined,
        message: result.message || '',
        cancelled: result.cancelled === true,
        needsRestore: result.needsRestore === true,
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'فشل الشراء' };
    }
  }

  async restorePurchases(userId: string): Promise<PurchaseResult> {
    try {
      if (typeof iapRestore === 'function') {
        const result: any = await iapRestore(userId);
        return {
          success: result.success || false,
          tier: (result.tier as PlanTier),
          message: result.message || '',
          cancelled: result.cancelled || false,
          needsRestore: result.needsRestore || false,
        } as PurchaseResult;
      }
      return { success: false, message: 'الاستعادة غير متاحة على هذا الجهاز' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async getCurrentSubscription(userId: string): Promise<PlanInfo | null> {
    try {
      if (!userId) return null;
      const status = await validateSubscriptionStatus();
      return {
        tier: status.tier as PlanTier,
        name: status.tier,
        price: 0,
        messages: 0,
        features: [],
        isActive: status.isActive,
        expiresAt: status.expiresAt,
      };
    } catch (e) {
      return null;
    }
  }

  onPurchaseUpdate(callback: (result: PurchaseResult) => void): () => void {
    const { EventBus } = require('../core/EventBus');
    return EventBus.on('SUBSCRIPTION_UPDATED', callback);
  }

  disconnect(): void {
    if (typeof disconnectIAP === 'function') {
      disconnectIAP();
    }
  }
}

export const commercePlugin = new CommercePlugin();
