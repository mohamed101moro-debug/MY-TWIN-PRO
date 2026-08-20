import { NativeModules } from 'react-native';
/** غلاف الجسر الأصلي BillingModule (Kotlin) — بلا أي مكتبة RN خارجية. */
const BM: any = (NativeModules as any).BillingModule || null;
export interface BillingResult { ok: boolean; token?: string; sku?: string; error?: string; }
export const googleBilling = {
  /** هل الجسر الناتيڤ موجود؟ */
  available: !!BM,
  async init(): Promise<boolean> {
    if (!BM?.startConnection) return false;
    try { return !!(await BM.startConnection()); } catch { return false; }
  },
  async purchase(sku: string): Promise<BillingResult> {
    if (!BM?.launchBillingFlow) return { ok: false, error: 'native-method-missing' };
    try {
      await BM.startConnection?.();
      const token: string = await BM.launchBillingFlow(sku);
      try { await BM.acknowledgePurchase?.(token); } catch {}
      return { ok: !!token, token, sku };
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) };
    }
  },
  async restore(): Promise<Array<{ token: string; sku: string }>> {
    if (!BM?.queryPurchases) return [];
    try {
      await BM.startConnection?.();
      const list = await BM.queryPurchases();
      return Array.isArray(list) ? list : [];
    } catch { return []; }
  },
};
export default googleBilling;
