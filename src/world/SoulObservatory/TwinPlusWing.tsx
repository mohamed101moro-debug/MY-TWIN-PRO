import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTwinStore } from '../../../store/useTwinStore';
import { useRTL } from '../../../lib/useRTL';
import { SPACE, RADIUS } from '../../../src/design/tokens/spacing';
import { useAppTheme } from '../../../engine/colors';
import { economyEngine, SoulPointsBalance } from '../../services/EconomyEngine';
import { Crown, Zap, Gift, ArrowRight } from 'lucide-react-native';

export default function TwinPlusWing() {
  const rtl = useRTL();
  const router = useRouter();
  const { colors } = useAppTheme();
  const userId = useTwinStore(state => state.userId);
  const [soulBalance, setSoulBalance] = useState<SoulPointsBalance | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBalance = useCallback(async () => {
    if (!userId) {
      setSoulBalance(null);
      return;
    }
    await economyEngine.initialize(userId);
    setSoulBalance(await economyEngine.getBalance());
  }, [userId]);

  useEffect(() => {
    loadBalance().catch(() => setSoulBalance(null));
  }, [loadBalance]);

  const handleDailyLogin = async () => {
    if (!userId || loading) return;
    setLoading(true);
    try {
      const result = await economyEngine.claimDailyLogin(userId);
      setSoulBalance(await economyEngine.getBalance());
      Alert.alert(
        result.granted ? '☀️' : (rtl.isRTL ? 'تم الاستلام' : 'Already claimed'),
        result.granted
          ? (rtl.isRTL ? `+5 نقاط تفاعل محلية. الرصيد: ${result.total}` : `+5 local engagement points. Balance: ${result.total}`)
          : (rtl.isRTL ? 'حصلت على مكافأة اليوم بالفعل.' : 'Today’s reward has already been claimed.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const openPaywall = () => router.push('/paywall');

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: `${colors.rose}20` }]}><Crown size={32} color={colors.rose} /></View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>{rtl.isRTL ? 'اقتصاد العلاقة' : 'Relationship Economy'}</Text>
        <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
          {rtl.isRTL ? 'النقاط تفاعل محلي؛ الاشتراكات والاستحقاقات يؤكدها الخادم والمتجر فقط.' : 'Points are local engagement; subscriptions and entitlements are verified by the server and store.'}
        </Text>
      </View>

      <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: `${colors.gold}40` }]}>
        <View style={styles.balanceRow}>
          <Zap size={21} color={colors.gold} />
          <Text style={[styles.balanceValue, { color: colors.gold }]}>{soulBalance?.total ?? '—'}</Text>
          <Text style={[styles.balanceLabel, { color: colors.gold }]}>Soul Points</Text>
        </View>
        <Text style={[styles.balanceSub, { color: colors.textSecondary }]}>
          {rtl.isRTL
            ? `+${soulBalance?.earned_today ?? 0} اليوم | ${soulBalance?.lifetime ?? 0} إجمالي مكتسب`
            : `+${soulBalance?.earned_today ?? 0} today | ${soulBalance?.lifetime ?? 0} earned lifetime`}
        </Text>
      </View>

      <TouchableOpacity style={[styles.dailyLoginBtn, { backgroundColor: `${colors.success}12` }]} onPress={handleDailyLogin} disabled={loading || !userId} accessibilityRole="button" accessibilityState={{ disabled: loading || !userId }}>
        <Gift size={18} color={colors.success} />
        <Text style={[styles.dailyLoginText, { color: colors.success }]}>
          {loading ? (rtl.isRTL ? 'جارٍ التحديث…' : 'Updating…') : (rtl.isRTL ? 'مكافأة اليوم: +5 نقاط' : 'Daily reward: +5 points')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.paywallBtn, { backgroundColor: colors.accent }]} onPress={openPaywall} accessibilityRole="button">
        <Text style={styles.paywallText}>{rtl.isRTL ? 'عرض الخطط والاشتراك' : 'View plans and subscribe'}</Text>
        <ArrowRight size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SPACE.md, paddingBottom: SPACE.xl },
  hero: { alignItems: 'center', paddingVertical: SPACE.lg, gap: SPACE.sm },
  heroIcon: { width: 68, height: 68, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EC489920' },
  heroTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  heroSub: { fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 330 },
  balanceCard: { borderRadius: RADIUS.card, borderWidth: 1, padding: SPACE.md, alignItems: 'center', marginTop: SPACE.sm },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  balanceValue: { fontSize: 28, fontWeight: '800' },
  balanceLabel: { fontSize: 16, fontWeight: '600' },
  balanceSub: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  dailyLoginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, padding: SPACE.md, borderRadius: RADIUS.sm, marginTop: SPACE.md },
  dailyLoginText: { fontSize: 14, fontWeight: '600' },
  paywallBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, padding: SPACE.md, borderRadius: RADIUS.sm, marginTop: SPACE.md },
  paywallText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
