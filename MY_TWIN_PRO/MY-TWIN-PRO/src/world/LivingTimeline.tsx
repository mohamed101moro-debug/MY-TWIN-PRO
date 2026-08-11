import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { unifiedBrainBridge } from '../core/UnifiedBrainBridge';
import { stateBus } from '../core/StateBus';
import { useAppTheme } from '../../engine/colors';
import { useRTL } from '../../lib/useRTL';
import { SPACE, RADIUS } from '../../src/design/tokens/spacing';
import { Clock, MapPin, TrendingUp, Heart, Star } from 'lucide-react-native';

interface TimelineEntry {
  id: string;
  period: string;
  title: string;
  type: 'memory' | 'milestone' | 'goal' | 'emotion' | 'place';
  icon: typeof Clock;
  color: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Clock; color: string }> = {
  memory:    { icon: Clock,      color: '#A855F7' },
  milestone: { icon: TrendingUp, color: '#EC4899' },
  goal:      { icon: Heart,      color: '#10B981' },
  place:     { icon: MapPin,     color: '#3B82F6' },
  emotion:   { icon: Heart,      color: '#F59E0B' },
};

export default function LivingTimeline() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);

  useEffect(() => {
    buildTimeline();
  }, []);

  const buildTimeline = async () => {
    const allEntries: TimelineEntry[] = [];

    try {
      // 1. جلب الذكريات الأساسية من TCMA (تمثل لحظات الحياة)
      const coreMemories = await unifiedBrainBridge.getCoreMemories(8);
      for (const memory of coreMemories) {
        const config = TYPE_CONFIG['memory'];
        allEntries.push({
          id: memory.id,
          period: new Date(memory.created_at || memory.timestamp || Date.now()).toLocaleDateString(rtl.isRTL ? 'ar' : 'en'),
          title: (memory.expressed_text || memory.content || '').substring(0, 80),
          type: 'memory',
          icon: config.icon,
          color: config.color,
        });
      }

      // 2. العالم الأكثر زيارة (من الذاكرة)
      try {
        const mostVisited = await unifiedBrainBridge.getMostVisitedWorld();
        if (mostVisited && mostVisited !== 'living_world') {
          allEntries.push({
            id: 'most_visited',
            period: rtl.isRTL ? 'الأكثر زيارة' : 'Most visited',
            title: mostVisited,
            type: 'place',
            icon: MapPin,
            color: '#3B82F6',
          });
        }
      } catch (e) {}

      // 3. إنجاز الرابطة (إن وجد)
      const bondLevel = stateBus.getState().relationship.bondLevel;
      if (bondLevel >= 50) {
        allEntries.push({
          id: 'bond_milestone',
          period: rtl.isRTL ? 'إنجاز' : 'Milestone',
          title: rtl.isRTL ? `الرابطة وصلت إلى ${bondLevel}%` : `Bond reached ${bondLevel}%`,
          type: 'milestone',
          icon: TrendingUp,
          color: '#EC4899',
        });
      }
    } catch (e) {}

    setEntries(allEntries);
  };

  if (entries.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(500)} style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{rtl.isRTL ? 'رحلة الحياة' : 'Life Journey'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {entries.map(entry => {
          const Icon = entry.icon;
          return (
            <View key={entry.id} style={[styles.entry, { backgroundColor: colors.card, borderColor: entry.color + '30' }]}>
              <View style={[styles.entryIcon, { backgroundColor: entry.color + '15' }]}>
                <Icon size={14} stroke={entry.color} />
              </View>
              <Text style={[styles.entryPeriod, { color: colors.textSecondary }]}>{entry.period}</Text>
              <Text style={[styles.entryText, { color: colors.text }]} numberOfLines={2}>{entry.title}</Text>
            </View>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm },
  title: { fontSize: 14, fontWeight: '600', marginBottom: SPACE.sm },
  scroll: { gap: SPACE.sm },
  entry: { width: 140, borderRadius: RADIUS.card, borderWidth: 1, padding: SPACE.sm, gap: 6 },
  entryIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  entryPeriod: { fontSize: 10 },
  entryText: { fontSize: 12, lineHeight: 16 },
});
