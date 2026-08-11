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

const API_URL = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL
  : 'https://my-twin-pro-production-b744.up.railway.app';

export class CommercePlugin {
  private initialized = false;

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    try {
      if (typeof initializeIAP === 'function') {
        const ok = await initializeIAP();
        if (ok) {
          this.initialized = true;
          return true;
        }
      }
      await apiGet('/api/billing/health');
      this.initialized = true;
      return true;
    } catch (e) {
      console.warn('[CommercePlugin] فشل التهيئة:', e);
      return false;
    }
  }

  async getProducts(): Promise<PlanInfo[]> {
    try {
      const res = await apiGet('/api/billing/plans');
      const plans = (res?.plans || []).map((p: any) => ({
        tier: (p.tier as PlanTier),
        name: p.name,
        price: p.price,
        messages: p.messages,
        features: p.features,
        isActive: p.isActive,
        expiresAt: p.expiresAt,
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
      if (typeof iapPurchase === 'function') {
        const result: any = await iapPurchase(planId, userId);
        return {
          success: result.success || false,
          tier: (result.tier as PlanTier) || planId,
          message: result.message || '',
          cancelled: result.cancelled || false,
          needsRestore: result.needsRestore || false,
        } as PurchaseResult;
      }

      const res = await fetch(`${API_URL}/api/billing/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, plan_id: planId, platform: 'web' }),
      });
      const data = await res.json();
      return { success: data?.success || false, tier: planId, message: data?.message } as PurchaseResult;
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

  async verifyPurchase(purchaseToken: string, userId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/api/billing/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchase_token: purchaseToken, user_id: userId }),
      });
      const data = await res.json();
      return data?.valid || false;
    } catch (e) {
      return false;
    }
  }

  async getCurrentSubscription(userId: string): Promise<PlanInfo | null> {
    try {
      if (typeof validateSubscriptionStatus === 'function') {
        const status = await validateSubscriptionStatus();
        if (status.tier !== 'free') {
          return {
            tier: status.tier as PlanTier,
            name: status.tier,
            price: 0,
            messages: 0,
            features: [],
            isActive: status.isActive,
            expiresAt: status.expiresAt,
          };
        }
      }

      const res = await apiGet(`/api/billing/status?user_id=${userId}`);
      if (res?.tier) {
        return {
          tier: res.tier as PlanTier,
          name: res.plan_name || res.tier,
          price: 0,
          messages: res.messages_limit || 0,
          features: [],
          isActive: res.is_active ?? true,
          expiresAt: res.expires_at,
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async cancel(userId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/api/billing/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      return data?.success || false;
    } catch (e) {
      return false;
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
