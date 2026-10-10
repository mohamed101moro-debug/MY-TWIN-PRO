import { NativeModules, Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

/** واجهة منخفضة المستوى لجسر Google Play Billing v8. */
const BM: any = (NativeModules as any).BillingModule || null;

export interface BillingPurchase {
  token: string;
  sku: string;
  purchaseState: number;
  isAcknowledged: boolean;
}

export interface BillingResult {
  ok: boolean;
  token?: string;
  sku?: string;
  isAcknowledged?: boolean;
  error?: string;
}

async function obfuscatedAccountId(userId: string): Promise<string> {
  if (!userId) throw new Error('authenticated user required');
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `mytwin:${userId}`,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
}

export const googleBilling = {
  available: Platform.OS === 'android' && !!BM,

  async init(): Promise<boolean> {
    if (!BM?.startConnection || Platform.OS !== 'android') return false;
    try { return !!(await BM.startConnection()); } catch { return false; }
  },

  async purchase(sku: string, userId: string): Promise<BillingResult> {
    if (!BM?.launchBillingFlow || Platform.OS !== 'android') {
      return { ok: false, error: 'google-play-billing-unavailable' };
    }
    try {
      await BM.startConnection?.();
      const accountId = await obfuscatedAccountId(userId);
      const purchase: any = await BM.launchBillingFlow(sku, accountId);
      const token = String(purchase?.token || '');
      const productId = String(purchase?.sku || sku);
      const isPurchased = Number(purchase?.purchaseState) === 1;
      return {
        ok: Boolean(token) && isPurchased,
        token: token || undefined,
        sku: productId,
        isAcknowledged: Boolean(purchase?.isAcknowledged),
        error: isPurchased ? undefined : 'purchase-not-completed',
      };
    } catch (error: any) {
      return { ok: false, error: String(error?.code || error?.message || error) };
    }
  },

  async acknowledge(token: string): Promise<boolean> {
    if (!BM?.acknowledgePurchase || !token) return false;
    try { return !!(await BM.acknowledgePurchase(token)); } catch { return false; }
  },

  async restore(): Promise<BillingPurchase[]> {
    if (!BM?.queryPurchases || Platform.OS !== 'android') return [];
    try {
      await BM.startConnection?.();
      const list = await BM.queryPurchases();
      if (!Array.isArray(list)) return [];
      return list
        .filter((purchase: any) => Boolean(purchase?.token && purchase?.sku))
        .map((purchase: any) => ({
          token: String(purchase.token),
          sku: String(purchase.sku),
          purchaseState: Number(purchase.purchaseState),
          isAcknowledged: Boolean(purchase.isAcknowledged),
        }));
    } catch { return []; }
  },

  async disconnect(): Promise<void> {
    if (!BM?.endConnection) return;
    try { await BM.endConnection(); } catch {}
  },
};

export default googleBilling;
