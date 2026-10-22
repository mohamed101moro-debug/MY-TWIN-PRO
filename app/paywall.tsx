import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { apiGet } from '../lib/httpClient';
import { useAppTheme } from '../engine/colors';
import { useRTL } from '../lib/useRTL';
import { useRouter } from 'expo-router';
import DigitalBeing from '../src/components/conscious/DigitalBeing';
import ShaderBeing from '../src/components/conscious/ShaderBeing';
import { purchaseSubscription, restorePurchases } from '../lib/iapService';
import { useTwinStore } from '../store/useTwinStore';
const DEMO_PRESENCE: any = {
  emotion: 'calm',
  energy: 0.72,
  fieldSpeed: 0.42,
  turbulence: 0.2,
  orbitality: 0.68,
  fieldRadius: 1,
  fieldOpacity: 0.88,
  breathing: 0.5,
  pulse: 0.35,
  eyeOpenness: 0.86,
  eyeGlow: 0.9,
  pupilSize: 0.42,
  gazeX: 0,
  gazeY: 0,
  warmth: 0.45,
  attention: 0.62,
  anticipation: 0.3,
  voiceLevel: 0.05,
  colorA: { r: 155, g: 111, b: 255 },
  colorB: { r: 70, g: 139, b: 255 },
  eyeColor: { r: 232, g: 222, b: 255 },
};
export default function Paywall() {
  const { colors } = useAppTheme(); const rtl = useRTL(); const router = useRouter();
  const userId = useTwinStore((state: any) => state.userId);
  const [ov, setOv] = useState<any>(null); const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true); setLoadError(false);
    try {
      const result = await apiGet('/api/economy/overview');
      if (!Array.isArray(result?.catalog)) throw new Error('pricing catalog unavailable');
      setOv(result);
    } catch {
      setOv(null); setLoadError(true);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const buy = async (t: any) => {
    try {
      const result = await purchaseSubscription(t.tier, userId);
      setToast(result.message || (result.success ? 'تم تفعيل الاشتراك.' : 'تعذر تفعيل الاشتراك.'));
      if (result.success) await refresh();
    } catch (e: any) { setToast(String(e?.message || '').slice(0, 40)); }
  };
  const restore = async () => {
    try {
      const result = await restorePurchases(userId);
      setToast(result.message || (result.success ? 'تمت استعادة الاشتراك.' : 'لا توجد مشتريات فعّالة.'));
      if (result.success) await refresh();
    } catch { setToast('تعذرت الاستعادة'); }
  };
  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.text }]}>{rtl.isRTL ? 'ارتقِ بعلاقتك مع توأمك' : 'Elevate your Twin relationship'}</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: colors.accent, fontSize: 16 }}>✕</Text></TouchableOpacity>
      </View>
      {toast !== '' && <Text style={{ color: colors.gold, textAlign: 'center', marginBottom: 6 }}>{toast}</Text>}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ height: 190, alignItems: 'center', marginBottom: 4 }}><ShaderBeing presence={DEMO_PRESENCE} size={180} awaken={1} /></View>
        {loading ? (
          <View style={styles.stateBox} accessibilityRole="progressbar"><ActivityIndicator color={colors.accent} /><Text style={{ color: colors.textSecondary, marginTop: 10 }}>{rtl.isRTL ? 'جارٍ تحميل الخطط…' : 'Loading plans…'}</Text></View>
        ) : loadError ? (
          <View style={styles.stateBox}><Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{rtl.isRTL ? 'تعذر تحميل الأسعار والخطط. لم يتم بدء أي عملية شراء.' : 'Plans could not be loaded. No purchase has been started.'}</Text><TouchableOpacity onPress={refresh} style={[styles.retryBtn, { backgroundColor: colors.accent }]} accessibilityRole="button"><Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{rtl.isRTL ? 'إعادة المحاولة' : 'Try again'}</Text></TouchableOpacity></View>
        ) : (ov?.catalog || []).length === 0 ? (
          <View style={styles.stateBox}><Text style={{ color: colors.textSecondary }}>{rtl.isRTL ? 'لا توجد خطط متاحة حالياً.' : 'No plans are currently available.'}</Text></View>
        ) : (ov?.catalog || []).map((t: any) => {
          const current = ov?.tier === t.tier;
          const isYearly = t.tier === 'yearly';
          return (
            <View key={t.tier} style={[styles.card, { backgroundColor: colors.card, borderColor: current ? colors.accent : colors.border }]}>
              <View style={styles.row}>
                <View>
                  <Text style={[styles.tier, { color: current ? colors.accent : colors.text }]}>{rtl.isRTL ? (t.name_ar || t.tier) : (t.name_en || t.tier)}{current ? ' ✓' : ''}</Text>
                  <Text style={{ color: colors.gold, fontSize: 13, fontStyle: 'italic', marginTop: 2 }}>{rtl.isRTL ? t.philosophy : (t.philosophy_en || t.philosophy)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 16 }}>
                    {t.price === 0 ? (rtl.isRTL ? 'مجاني' : 'Free') : `$${t.price}`}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                    {t.period === 'forever' ? '' : t.period === 'year' ? (rtl.isRTL ? '/سنة' : '/year') : t.period === '6months' ? (rtl.isRTL ? '/6 أشهر' : '/6mo') : (rtl.isRTL ? '/شهر' : '/mo')}
                  </Text>
                  {isYearly && <Text style={{ color: colors.success, fontSize: 11, marginTop: 2 }}>{rtl.isRTL ? `= $12.50/شهر (وفّر $29.89)` : `= $12.50/mo (save $29.89)`}</Text>}
                </View>
              </View>
              {(rtl.isRTL ? t.features : (t.features_en || t.features)).map((f: string, i: number) => <Text key={i} style={{ color: colors.textSecondary, fontSize: 12, marginVertical: 2 }}>• {f}</Text>)}
              {t.price > 0 && !current && <TouchableOpacity disabled={Platform.OS !== 'android'} onPress={() => buy(t)} style={{ marginTop: 8, borderRadius: 12, paddingVertical: 8, alignItems: 'center', backgroundColor: Platform.OS === 'android' ? colors.accent : colors.border, opacity: Platform.OS === 'android' ? 1 : 0.65 }}><Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>{Platform.OS !== 'android' ? (rtl.isRTL ? 'الاشتراك غير متاح على iOS حالياً' : 'Purchases are not available on iOS yet') : (rtl.isRTL ? 'اشترك الآن' : 'Subscribe')}</Text></TouchableOpacity>}
            </View>
          );
        })}
        <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center', marginHorizontal: 20, marginTop: 6, lineHeight: 16 }}>
          {rtl.isRTL ? 'تُعالج عمليات الشراء والتجديد والإلغاء عبر Google Play. راجع السعر النهائي ومدة التجديد في نافذة المتجر قبل التأكيد.' : 'Purchases, renewals and cancellation are managed through Google Play. Review the final localized price and renewal period in the store sheet before confirming.'}
        </Text>
        <TouchableOpacity disabled={!userId || loading} onPress={restore} style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, opacity: !userId || loading ? 0.6 : 1 }]} accessibilityRole="button" accessibilityState={{ disabled: !userId || loading }}>
          <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{rtl.isRTL ? '♻️ استعادة المشتريات' : '♻️ Restore purchases'}</Text>
        </TouchableOpacity>
        {ov?.referral_code ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 10 }}>
            {rtl.isRTL ? `كود الإحالة: ${ov.referral_code} — ادعُ صديقًا ولكما 500` : `Referral: ${ov.referral_code} — invite & both get 500`}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 50 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800' },
  card: { marginHorizontal: 16, marginBottom: 10, borderRadius: 18, borderWidth: 1, padding: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  tier: { fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },
  btn: { marginHorizontal: 16, marginTop: 10, borderRadius: 16, padding: 14, alignItems: 'center' },
  stateBox: { alignItems: 'center', padding: 24, marginHorizontal: 16, borderRadius: 16 },
  retryBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12 },
});
