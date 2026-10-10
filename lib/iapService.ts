/** مسار اشتراكات Android الوحيد: Google Play → تحقق الخادم → الإقرار بعد التفعيل الذري. */
import { apiGet, apiPost } from './httpClient';
import { BillingPurchase, googleBilling } from './googleBilling';

export const PRODUCT_IDS: Record<string, string> = {
  plus: 'mytwin_plus_monthly',
  premium: 'mytwin_premium_monthly',
  pro: 'mytwin_pro_semiannual',
  yearly: 'mytwin_yearly_annual',
};

const TIER_BY_PRODUCT = Object.fromEntries(
  Object.entries(PRODUCT_IDS).map(([tier, productId]) => [productId, tier]),
) as Record<string, string>;

let initialized = false;

export async function initializeIAP(): Promise<boolean> {
  if (initialized) return true;
  initialized = await googleBilling.init();
  return initialized;
}

export async function purchaseSubscription(
  tier: string,
  userId: string,
): Promise<{ success: boolean; tier?: string; message?: string }> {
  const productId = PRODUCT_IDS[tier];
  if (!productId) return { success: false, message: 'خطة الاشتراك غير معروفة.' };
  if (!userId) return { success: false, message: 'سجّل الدخول قبل الشراء.' };
  if (!(await initializeIAP())) return { success: false, message: 'متجر Google Play غير متاح على هذا الجهاز.' };

  const purchase = await googleBilling.purchase(productId, userId);
  if (!purchase.ok || !purchase.token) {
    if (purchase.error?.includes('CANCEL')) return { success: false, message: 'أُلغيت العملية.' };
    if (purchase.error?.includes('E_PENDING')) return { success: false, message: 'الشراء معلّق؛ لن تُفعّل المزايا حتى يؤكد المتجر الدفع.' };
    return { success: false, message: purchase.error || 'تعذر إتمام الشراء.' };
  }

  let verified: any;
  try {
    verified = await apiPost('/api/economy/purchase/verify', {
      sku: purchase.sku || productId,
      token: purchase.token,
    });
  } catch (error: any) {
    // Keep the token pending locally with Google; do not grant local entitlement or acknowledge it.
    return { success: false, message: error?.message || 'تعذر التحقق من الشراء. أعد المحاولة من استعادة المشتريات.' };
  }
  if (!verified?.success || verified?.verified !== true || verified?.tier !== tier) {
    return { success: false, message: 'لم يؤكد الخادم الاستحقاق؛ لم تُفعّل الخطة.' };
  }

  if (!purchase.isAcknowledged) {
    const acknowledged = await googleBilling.acknowledge(purchase.token);
    if (!acknowledged) {
      console.warn('[IAP] Entitlement committed, but acknowledgement needs retry through restore flow.');
    }
  }
  updateLocalTier(verified.tier);
  return { success: true, tier: verified.tier, message: 'تم التحقق وتفعيل الاشتراك.' };
}

export async function restorePurchases(
  userId: string,
): Promise<{ success: boolean; tier?: string; count: number; message?: string }> {
  if (!userId) return { success: false, count: 0, message: 'سجّل الدخول لاستعادة مشترياتك.' };
  if (!(await initializeIAP())) return { success: false, count: 0, message: 'متجر Google Play غير متاح.' };

  const purchases: BillingPurchase[] = await googleBilling.restore();
  let restoredTier: string | undefined;
  let count = 0;
  for (const purchase of purchases) {
    if (purchase.purchaseState !== 1) continue;
    const tier = TIER_BY_PRODUCT[purchase.sku];
    if (!tier) continue;
    try {
      const verified: any = await apiPost('/api/economy/purchase/verify', {
        sku: purchase.sku,
        token: purchase.token,
      });
      if (verified?.success && verified?.verified === true) {
        count += 1;
        restoredTier = verified.tier;
        updateLocalTier(verified.tier);
        if (!purchase.isAcknowledged) await googleBilling.acknowledge(purchase.token);
      }
    } catch (error) {
      console.warn('[IAP] A restored purchase could not be verified yet.');
    }
  }

  const status = await validateSubscriptionStatus();
  updateLocalTier(status.tier);
  return status.isActive
    ? { success: true, tier: status.tier || restoredTier, count }
    : { success: false, count, message: 'لم يعثر الخادم على اشتراك فعّال لهذا الحساب.' };
}

export async function validateSubscriptionStatus(): Promise<{
  tier: string;
  isActive: boolean;
  expiresAt?: string;
}> {
  try {
    const result = await apiGet('/api/billing/status');
    const tier = String(result?.tier || 'free');
    updateLocalTier(tier);
    return {
      tier,
      isActive: result?.is_active === true,
      expiresAt: result?.expires_at || undefined,
    };
  } catch (error) {
    console.warn('[IAP] Server subscription status is unavailable; keeping server as authority.');
    return { tier: 'free', isActive: false };
  }
}

export async function disconnectIAP(): Promise<void> {
  initialized = false;
  await googleBilling.disconnect();
}

function updateLocalTier(tier: string): void {
  try {
    const { useTwinCoreStore } = require('../store/useTwinCoreStore');
    useTwinCoreStore.getState().setTier(tier as any);
  } catch (error) {
    console.warn('[IAP] Could not synchronize the local tier; the server remains authoritative.');
  }
}
