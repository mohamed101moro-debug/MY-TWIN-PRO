import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { unifiedBrainBridge } from '../../core/UnifiedBrainBridge';
import { stateBus } from '../../core/StateBus';
import { useAppTheme } from '../../../engine/colors';
import { useRTL } from '../../../lib/useRTL';
import { SPACE, RADIUS } from '../../../src/design/tokens/spacing';
import { Activity, Clock, MapPin, TrendingUp, Heart } from 'lucide-react-native';

export default function LifeReflectionWing() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const [stats, setStats] = useState({
    sessions: 0,
    bond: 0,
    memories: 0,
    mostVisited: '',
    topCapability: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const bond = stateBus.getState().relationship.bondLevel;
        const memoryCount = await unifiedBrainBridge.getMemoryCount();
        const mostVisited = await unifiedBrainBridge.getMostVisitedWorld();
        const topCap = await unifiedBrainBridge.getMostUsedCapability();

        setStats({
          sessions: 0,
          bond,
          memories: memoryCount,
          mostVisited: mostVisited || (rtl.isRTL ? 'الرئيسية' : 'Living World'),
          topCapability: topCap || (rtl.isRTL ? 'الدراسة' : 'Study'),
        });
      } catch (e) {
        setStats({
          sessions: 0,
          bond: stateBus.getState().relationship.bondLevel,
          memories: 0,
          mostVisited: rtl.isRTL ? 'الرئيسية' : 'Living World',
          topCapability: rtl.isRTL ? 'الدراسة' : 'Study',
        });
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const items = [
    { icon: Activity, label: rtl.isRTL ? 'جلسات' : 'Sessions', value: stats.sessions, color: colors.accent },
    { icon: Heart, label: rtl.isRTL ? 'رابطة' : 'Bond', value: `${stats.bond}%`, color: colors.rose },
    { icon: Clock, label: rtl.isRTL ? 'ذكريات' : 'Memories', value: stats.memories, color: colors.success },
    { icon: MapPin, label: rtl.isRTL ? 'الأكثر زيارة' : 'Most Visited', value: stats.mostVisited, color: '#3B82F6' },
    { icon: TrendingUp, label: rtl.isRTL ? 'أكثر قدرة' : 'Top Capability', value: stats.topCapability, color: colors.gold },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>{rtl.isRTL ? 'تأمل الحياة' : 'Life Reflection'}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{rtl.isRTL ? 'هذا ما أراه في رحلتنا.' : 'This is what I see in our journey.'}</Text>
      <View style={styles.grid}>
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <View key={i} style={[styles.card, { backgroundColor: colors.card, borderColor: item.color + '30' }]}>
              <Icon size={22} stroke={item.color} />
              <Text style={[styles.value, { color: item.color }]}>{item.value}</Text>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACE.md },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 12, marginBottom: SPACE.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, justifyContent: 'center' },
  card: { width: '45%', borderRadius: RADIUS.card, borderWidth: 1, padding: SPACE.md, alignItems: 'center', gap: 6 },
  value: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 11, textAlign: 'center' },
});
