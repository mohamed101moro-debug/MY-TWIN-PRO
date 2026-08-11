import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { unifiedBrainBridge } from '../core/UnifiedBrainBridge';
import { stateBus } from '../core/StateBus';
import { useRTL } from '../../lib/useRTL';
import { useAppTheme } from '../../engine/colors';
import { SPACE, RADIUS } from '../../src/design/tokens/spacing';
import { Clock, MessageCircle, Heart, Target } from 'lucide-react-native';

interface TimelineEntry {
  id: string;
  type: 'conversation' | 'memory' | 'milestone' | 'goal';
  text: string;
  time: string;
  color: string;
  icon: typeof Clock;
}

export default function DailyTimeline() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [visible, setVisible] = useState(false);

  const buildTimeline = useCallback(async () => {
    const timeline: TimelineEntry[] = [];
    const now = new Date();

    try {
      // 1. ذكريات اليوم من TCMA الحقيقية
      const todayMemories = await unifiedBrainBridge.getOnThisDay(2);
      for (const memory of todayMemories) {
        timeline.push({
          id: memory.id,
          type: 'memory',
          text: (memory.expressed_text || memory.content || '').substring(0, 80),
          time: new Date(memory.created_at || memory.timestamp || Date.now()).toLocaleTimeString(rtl.isRTL ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' }),
          color: '#8B5CF6',
          icon: Heart,
        });
      }

      // 2. آخر محادثة
      const recentConversations = await unifiedBrainBridge.getCapabilityMemory('conversation', 1);
      if (recentConversations.length > 0) {
        const last = recentConversations[0];
        timeline.push({
          id: last.id,
          type: 'conversation',
          text: (last.expressed_text || last.content || '').substring(0, 80),
          time: new Date(last.created_at || last.timestamp || Date.now()).toLocaleTimeString(rtl.isRTL ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' }),
          color: colors.accent,
          icon: MessageCircle,
        });
      }

      // 3. حالة العلاقة من StateBus
      const bond = stateBus.getState().relationship.bondLevel;
      if (bond > 30) {
        const phase = bond >= 95 ? 'soulmate' : bond >= 80 ? 'close_friend' : bond >= 40 ? 'friend' : 'familiar';
        timeline.push({
          id: 'relationship',
          type: 'milestone',
          text: rtl.isRTL
            ? `الرابطة: ${phase === 'soulmate' ? 'عميقة جداً' : phase === 'close_friend' ? 'قوية' : 'تنمو'}`
            : `Bond: ${phase === 'soulmate' ? 'Very Deep' : phase === 'close_friend' ? 'Strong' : 'Growing'}`,
          time: now.toLocaleTimeString(rtl.isRTL ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' }),
          color: colors.rose,
          icon: Heart,
        });
      }
    } catch (e) {}

    if (timeline.length > 0) {
      setEntries(timeline);
      setVisible(true);
    }
  }, [rtl.isRTL, colors]);

  useEffect(() => {
    const timer = setTimeout(buildTimeline, 5000);
    const interval = setInterval(buildTimeline, 120000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [buildTimeline]);

  if (!visible || entries.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(500)} exiting={FadeOut.duration(300)} style={styles.container}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{rtl.isRTL ? 'ملخص اليوم' : 'Daily Summary'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {entries.map(entry => {
          const Icon = entry.icon;
          return (
            <View key={entry.id} style={[styles.entry, { backgroundColor: colors.card, borderColor: entry.color + '30' }]}>
              <View style={[styles.entryIcon, { backgroundColor: entry.color + '15' }]}>
                <Icon size={14} stroke={entry.color} />
              </View>
              <Text style={[styles.entryText, { color: colors.text }]} numberOfLines={2}>{entry.text}</Text>
              {entry.time !== '' && (
                <Text style={[styles.entryTime, { color: colors.textSecondary }]}>{entry.time}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm },
  title: { fontSize: 13, fontWeight: '600', marginBottom: SPACE.sm },
  scroll: { gap: SPACE.sm },
  entry: { width: 160, borderRadius: RADIUS.card, borderWidth: 1, padding: SPACE.sm, gap: 6 },
  entryIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  entryText: { fontSize: 12, lineHeight: 16 },
  entryTime: { fontSize: 10 },
});
