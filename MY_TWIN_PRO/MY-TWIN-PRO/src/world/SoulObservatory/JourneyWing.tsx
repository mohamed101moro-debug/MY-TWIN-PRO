import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { stateBus } from '../../core/StateBus';
import { unifiedBrainBridge } from '../../core/UnifiedBrainBridge';
import { useAppTheme } from '../../../engine/colors';
import { useRTL } from '../../../lib/useRTL';
import { SPACE, RADIUS } from '../../../src/design/tokens/spacing';
import { Clock, Heart, Star, Zap, Award } from 'lucide-react-native';

export default function JourneyWing() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const [chapters, setChapters] = useState<any[]>([]);
  const [firsts, setFirsts] = useState<any[]>([]);
  const [stats, setStats] = useState({ bond: 0, phase: 'stranger', trend: 'stable' });

  useEffect(() => {
    const load = async () => {
      const rel = stateBus.getState().relationship;
      setStats({
        bond: rel.bondLevel,
        phase: rel.bondLevel >= 95 ? 'soulmate' : rel.bondLevel >= 80 ? 'close_friend' : rel.bondLevel >= 40 ? 'friend' : 'stranger',
        trend: 'stable',
      });

      // جلب فصول العلاقة من الذاكرة (ذكريات مهمة)
      try {
        const mems = await unifiedBrainBridge.getCapabilityMemory('journey', 5);
        if (mems.length > 0) {
          setChapters(mems.map((m, i) => ({
            title: (m.expressed_text || m.content || '').substring(0, 60),
            startedAt: m.created_at || m.timestamp || new Date().toISOString(),
          })));
        }
      } catch (e) {}

      // جلب أولى اللحظات
      try {
        const firstMoments = await unifiedBrainBridge.getCapabilityMemory('first', 5);
        if (firstMoments.length > 0) {
          setFirsts(firstMoments.map(m => ({
            title: (m.expressed_text || m.content || '').substring(0, 60),
          })));
        }
      } catch (e) {}
    };
    load();
  }, []);

  const phaseLabels: Record<string, { ar: string; en: string; icon: typeof Heart }> = {
    stranger: { ar: 'غريب', en: 'Stranger', icon: Clock },
    acquaintance: { ar: 'معرفة', en: 'Acquaintance', icon: Star },
    friend: { ar: 'صديق', en: 'Friend', icon: Heart },
    close_friend: { ar: 'صديق مقرب', en: 'Close Friend', icon: Award },
    soulmate: { ar: 'توأم روح', en: 'Soulmate', icon: Zap },
  };

  const phaseInfo = phaseLabels[stats.phase] || phaseLabels.stranger;
  const PhaseIcon = phaseInfo.icon;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.phaseCard, { backgroundColor: colors.accent + '10' }]}>
        <View style={[styles.phaseIcon, { backgroundColor: colors.accent + '20' }]}>
          <PhaseIcon size={28} stroke={colors.accent} />
        </View>
        <Text style={[styles.phaseTitle, { color: colors.text }]}>
          {rtl.isRTL ? phaseInfo.ar : phaseInfo.en}
        </Text>
        <Text style={[styles.phaseBond, { color: colors.accent }]}>{stats.bond}% {rtl.isRTL ? 'رابطة' : 'bond'}</Text>
        <Text style={[styles.phaseTrend, { color: colors.textSecondary }]}>
          {stats.trend === 'growing' ? '↑' : stats.trend === 'declining' ? '↓' : '→'} 
          {rtl.isRTL ? (stats.trend === 'growing' ? 'تنمو' : stats.trend === 'declining' ? 'تتراجع' : 'مستقرة') : stats.trend}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{rtl.isRTL ? 'فصول العلاقة' : 'Relationship Chapters'}</Text>
        {chapters.length > 0 ? (
          chapters.map((chapter, i) => (
            <View key={i} style={styles.chapterItem}>
              <View style={[styles.chapterDot, { backgroundColor: colors.accent }]} />
              <View style={[styles.chapterLine, { backgroundColor: colors.border }]} />
              <View style={styles.chapterContent}>
                <Text style={[styles.chapterTitle, { color: colors.text }]}>{chapter.title}</Text>
                <Text style={[styles.chapterDate, { color: colors.textSecondary }]}>
                  {new Date(chapter.startedAt).toLocaleDateString(rtl.isRTL ? 'ar' : 'en')}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{rtl.isRTL ? 'لم تبدأ الرحلة بعد.' : 'The journey has not started yet.'}</Text>
        )}
      </View>

      {firsts.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{rtl.isRTL ? 'أولى اللحظات' : 'First Moments'}</Text>
          {firsts.map((moment, i) => (
            <View key={i} style={styles.momentItem}>
              <Star size={14} stroke={colors.gold} />
              <Text style={[styles.momentText, { color: colors.text }]}>{moment.title}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACE.lg },
  phaseCard: { alignItems: 'center', borderRadius: RADIUS.card, padding: SPACE.lg, gap: SPACE.sm },
  phaseIcon: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  phaseTitle: { fontSize: 20, fontWeight: '700' },
  phaseBond: { fontSize: 16, fontWeight: '600' },
  phaseTrend: { fontSize: 13 },
  section: { gap: SPACE.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: SPACE.sm },
  chapterItem: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
  chapterDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  chapterLine: { width: 2, height: 30, position: 'absolute', left: 4, top: 14 },
  chapterContent: { flex: 1, paddingBottom: SPACE.md },
  chapterTitle: { fontSize: 14, fontWeight: '600' },
  chapterDate: { fontSize: 11, marginTop: 2 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: SPACE.md },
  momentItem: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingVertical: 6 },
  momentText: { fontSize: 13, flex: 1 },
});
