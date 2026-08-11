import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { unifiedBrainBridge } from '../../core/UnifiedBrainBridge';
import { useAppTheme } from '../../../engine/colors';
import { useRTL } from '../../../lib/useRTL';
import { SPACE, RADIUS } from '../../../src/design/tokens/spacing';
import { Heart, Star, Cloud, Zap, BookOpen } from 'lucide-react-native';

interface MemoryEntry {
  id: string;
  type: string;
  content: string;
  age: 'fresh' | 'recent' | 'stable' | 'core' | 'legacy';
  importance: number;
  confidence: number;
  created_at: string;
}

const MEMORY_ICONS: Record<string, typeof BookOpen> = {
  study: BookOpen, emotion: Heart, achievement: Star, dream: Cloud, general: Zap,
};

const AGE_COLORS: Record<string, string> = {
  fresh: '#10B981', recent: '#3B82F6', stable: '#A855F7', core: '#EC4899', legacy: '#F59E0B',
};

const AGE_LABELS: Record<string, { ar: string; en: string }> = {
  fresh: { ar: 'جديدة', en: 'Fresh' },
  recent: { ar: 'حديثة', en: 'Recent' },
  stable: { ar: 'مستقرة', en: 'Stable' },
  core: { ar: 'أساسية', en: 'Core' },
  legacy: { ar: 'خالدة', en: 'Legacy' },
};

export default function ForestWing() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, core: 0, life: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const total = await unifiedBrainBridge.getMemoryCount();
        const coreMemories = await unifiedBrainBridge.getCoreMemories(30);
        const mapped: MemoryEntry[] = coreMemories.map((m: any) => {
          const imp = m.importance || 50;
          let age: MemoryEntry['age'] = 'recent';
          if (imp >= 90) age = 'legacy';
          else if (imp >= 80) age = 'core';
          else if (imp >= 50) age = 'stable';
          let type = 'general';
          const content = (m.expressed_text || m.content || '').toLowerCase();
          if (content.includes('درس') || content.includes('ذاكر')) type = 'study';
          else if (m.real_emotion === 'joy' || m.real_emotion === 'love') type = 'emotion';
          else if (content.includes('حلم') || content.includes('dream')) type = 'dream';
          else if (imp >= 80) type = 'achievement';
          return {
            id: m.id,
            type,
            content: m.expressed_text || m.content || '',
            age,
            importance: imp,
            confidence: m.confidence || 0.7,
            created_at: m.created_at || m.timestamp || new Date().toISOString(),
          };
        });
        setMemories(mapped);
        setStats({
          total,
          core: mapped.filter(m => m.importance >= 80).length,
          life: mapped.filter(m => m.importance >= 90).length,
        });
      } catch (e) {
        setStats({ total: 0, core: 0, life: 0 });
      }
    };
    load();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.accent + '20' }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{rtl.isRTL ? 'ذكريات' : 'Memories'}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.rose + '20' }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.core}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{rtl.isRTL ? 'أساسية' : 'Core'}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.gold + '20' }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.life}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{rtl.isRTL ? 'حياة' : 'Life'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.forestGrid}>
        {memories.length > 0 ? (
          memories.map(memory => {
            const isSelected = selected === memory.id;
            const ageColor = AGE_COLORS[memory.age] || colors.accent;
            const MemoryIcon = MEMORY_ICONS[memory.type] || Star;
            const ageLabel = AGE_LABELS[memory.age] || { ar: '', en: '' };

            return (
              <TouchableOpacity
                key={memory.id}
                style={[styles.tree, { backgroundColor: colors.card }, isSelected && { borderColor: ageColor, backgroundColor: ageColor + '10' }]}
                onPress={() => setSelected(isSelected ? null : memory.id)}
              >
                <View style={[styles.treeCrown, { backgroundColor: ageColor + '20', borderColor: ageColor }]}>
                  <MemoryIcon size={20} stroke={ageColor} />
                </View>
                <View style={[styles.treeTrunk, { backgroundColor: ageColor }]} />
                <View style={styles.treeRoots}>
                  {[0, 1, 2].map(i => (
                    <View key={i} style={[styles.treeRoot, { backgroundColor: ageColor + '60' }]} />
                  ))}
                </View>
                <Text style={[styles.treeAge, { color: colors.textSecondary }]}>{rtl.isRTL ? ageLabel.ar : ageLabel.en}</Text>
                {isSelected && (
                  <View style={styles.treeDetails}>
                    <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={3}>{memory.content}</Text>
                    <Text style={[styles.detailConfidence, { color: colors.textSecondary }]}>
                      {rtl.isRTL ? 'ثقة:' : 'Confidence:'} {Math.round(memory.confidence * 100)}%
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{rtl.isRTL ? 'لا توجد ذكريات بعد.' : 'No memories yet.'}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACE.lg },
  statsRow: { flexDirection: 'row', gap: SPACE.sm },
  statCard: { flex: 1, borderRadius: RADIUS.card, padding: SPACE.md, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11 },
  forestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, justifyContent: 'center' },
  tree: { alignItems: 'center', gap: 2, width: 90, borderRadius: RADIUS.sm, padding: SPACE.sm, borderWidth: 1, borderColor: 'transparent' },
  treeCrown: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  treeTrunk: { width: 3, height: 20, borderRadius: 2 },
  treeRoots: { flexDirection: 'row', gap: 10, marginTop: -2 },
  treeRoot: { width: 2, height: 10, borderRadius: 1 },
  treeAge: { fontSize: 9, marginTop: 4 },
  treeDetails: { marginTop: 6, alignItems: 'center', width: 80 },
  detailText: { fontSize: 10, textAlign: 'center', lineHeight: 14 },
  detailConfidence: { fontSize: 9, marginTop: 4 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: SPACE.xl },
});
