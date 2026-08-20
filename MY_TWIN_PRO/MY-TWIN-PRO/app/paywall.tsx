// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { apiGet, apiPost } from '../lib/httpClient';
import { useAppTheme } from '../engine/colors';
import { useRTL } from '../lib/useRTL';
import { useRouter } from 'expo-router';
import DigitalBeing from '../src/components/conscious/DigitalBeing';
import ShaderBeing from '../src/components/conscious/ShaderBeing';
import { ADMOB } from '../lib/adConfig';
import { googleBilling } from '../lib/googleBilling';
let RewardedAd: any = null, RewardedEventType: any = null, TestIds: any = null;
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
try { const g: any = require('react-native-google-mobile-ads'); RewardedAd = g.RewardedAd; RewardedEventType = g.RewardedEventType; TestIds = g.TestIds; } catch {}

export default function Paywall() {
  const { colors } = useAppTheme(); const rtl = useRTL(); const router = useRouter();
  const [ov, setOv] = useState<any>(null); const [toast, setToast] = useState('');
  const adRef = useRef<any>(null); const adReady = useRef(false);
  const refresh = useCallback(async () => { try { setOv(await apiGet('/api/economy/overview')); } catch {} }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!RewardedAd) return;
    try {
      const ad = RewardedAd.createForAdRequest(ADMOB.useTest ? TestIds.REWARDED : ADMOB.androidRewarded, { requestNonPersonalizedAdsOnly: true });
      ad.addRewardedEventListener?.(RewardedEventType.LOADED, () => { adReady.current = true; });
      ad.addRewardedEventListener?.(RewardedEventType.EARNED_REWARD, async () => { try { await apiPost('/api/economy/ad-reward', {}); setToast('+150 ✨'); refresh(); } catch {} });
      ad.load(); adRef.current = ad;
    } catch {}
  }, []);
  const watchAd = async () => {
    if (adRef.current && adReady.current) { try { adRef.current.show(); return; } catch {} }
    try { await apiPost('/api/economy/ad-reward', {}); setToast('+150 ✨'); refresh(); } catch (e: any) { setToast(String(e?.message || '').slice(0, 40)); }
  };
  const buy = async (t: any) => {
    try {
      const res = await googleBilling.purchase('mytwin_' + t.tier);
      if (res.ok && res.token) {
        const v: any = await apiPost('/api/economy/purchase/verify', { sku: 'mytwin_' + t.tier, token: res.token, tier: t.tier });
        setToast(v?.verified ? '💜 تم التفعيل بتحقق Google' : '✅ تم التفعيل (تحقق غير متاح)');
      } else if (res.error === 'E_CANCELLED') { setToast('أُلغيت العملية'); }
      else { await apiPost('/api/economy/purchase/record', { tier: t.tier, token: 'sandbox_' + Date.now(), sku: 'mytwin_' + t.tier }); setToast('✅ تفعيل ساندبوكس (اختبار)'); }
      refresh();
    } catch (e: any) { setToast(String(e?.message || '').slice(0, 40)); }
  };
  const restore = async () => {
    try {
      const r = await googleBilling.restore();
      if (r && r.length) { await apiPost('/api/economy/purchase/verify', { token: r[0].token, sku: r[0].sku || 'mytwin_premium', tier: 'premium' }); setToast('♻️ تمت الاستعادة'); refresh(); }
      else setToast('لا مشتريات سابقة');
    } catch { setToast('تعذرت الاستعادة'); }
  };
  const startTrial = async () => { try { await apiPost('/api/economy/trial/start', {}); setToast('🎉 3 أيام premium'); refresh(); } catch (e: any) { setToast(String(e?.message || '').slice(0, 40)); } };
  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.text }]}>{rtl.isRTL ? 'ارتقِ بعلاقتك مع توأمك' : 'Elevate your Twin relationship'}</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: colors.accent, fontSize: 16 }}>✕</Text></TouchableOpacity>
      </View>
      {toast !== '' && <Text style={{ color: colors.gold, textAlign: 'center', marginBottom: 6 }}>{toast}</Text>}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ height: 190, alignItems: 'center', marginBottom: 4 }}><ShaderBeing presence={DEMO_PRESENCE} size={180} awaken={1} /></View>
        {(ov?.catalog || []).map((t: any) => {
          const current = ov?.tier === t.tier;
          const isYearly = t.tier === 'yearly';
          return (
            <View key={t.tier} style={[styles.card, { backgroundColor: colors.card, borderColor: current ? colors.accent : colors.border }]}>
              <View style={styles.row}>
                <View>
                  <Text style={[styles.tier, { color: current ? colors.accent : colors.text }]}>{t.tier}{current ? ' ✓' : ''}</Text>
                  <Text style={{ color: colors.gold, fontSize: 13, fontStyle: 'italic', marginTop: 2 }}>{t.philosophy}</Text>
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
              {t.features.map((f: string, i: number) => <Text key={i} style={{ color: colors.textSecondary, fontSize: 12, marginVertical: 2 }}>• {f}</Text>)}
              {t.price > 0 && !current && <TouchableOpacity onPress={() => buy(t)} style={{ marginTop: 8, borderRadius: 12, paddingVertical: 8, alignItems: 'center', backgroundColor: colors.accent }}><Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>{rtl.isRTL ? 'اشترك الآن' : 'Subscribe'}</Text></TouchableOpacity>}
            </View>
          );
        })}
        <TouchableOpacity onPress={startTrial} style={[styles.btn, { backgroundColor: colors.accent }]}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{rtl.isRTL ? '🎁 جرّب premium 3 أيام' : '🎁 Try premium 3 days'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={restore} style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{rtl.isRTL ? '♻️ استعادة المشتريات' : '♻️ Restore purchases'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={watchAd} style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.accent, borderWidth: 1 }]}>
          <Text style={{ color: colors.accent, fontWeight: '700' }}>{rtl.isRTL ? `📺 شاهد إعلانًا (+150) — اليوم ${ov?.ads_today ?? 0}/${ov?.ads_max ?? 5}` : `📺 Watch ad (+150) — ${ov?.ads_today ?? 0}/${ov?.ads_max ?? 5} today`}</Text>
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
});
