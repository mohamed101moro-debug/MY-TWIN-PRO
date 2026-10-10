import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { unifiedBrainBridge } from '../core/UnifiedBrainBridge';
import { useRTL } from '../../lib/useRTL';
import { SPACE, RADIUS } from '../../src/design/tokens/spacing';
import { BookOpen, Heart, Star, Cloud, Zap } from 'lucide-react-native';

/**
 * هيكل الذاكرة الموحد (متوافق مع TCMA)
 */
interface MemoryEntry {
  id: string;
  type: string;
  content: string;
  expressed_text?: string;
  real_emotion?: string;
  age: 'fresh' | 'recent' | 'stable' | 'core' | 'legacy';
  importance: number;
  timestamp: string;
  created_at?: string;
}

const MEMORY_ICONS: Record<string, typeof BookOpen> = {
  study: BookOpen,
  learning: BookOpen,
  emotion: Heart,
  achievement: Star,
  dream: Cloud,
  general: Zap,
  conversation: Zap,
};

const MEMORY_COLORS: Record<string, string> = {
  fresh:  '#10B981',
  recent: '#3B82F6',
  stable: '#A855F7',
  core:   '#EC4899',
  legacy: '#F59E0B',
};

export default function MemoryForest() {
  const rtl = useRTL();
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCore = async () => {
      try {
        setLoading(true);
        // ✅ اتصال حقيقي مع TCMA عبر UnifiedBrainBridge.getCoreMemories
        const coreMemories = await unifiedBrainBridge.getCoreMemories(12);
        
        if (coreMemories.length > 0) {
          const mapped: MemoryEntry[] = coreMemories.map(m => {
            // تحديد العمر بناءً على الأهمية (منطق TCMA)
            const importance = m.importance || 50;
            let age: MemoryEntry['age'] = 'recent';
            if (importance >= 90) age = 'legacy';
            else if (importance >= 80) age = 'core';
            else if (importance >= 50) age = 'stable';
            else age = 'recent';
            
            // تحديد النوع من المحتوى أو العاطفة
            let type = 'general';
            const content = (m.expressed_text || m.content || '').toLowerCase();
            if (content.includes('درس') || content.includes('ذاكر') || content.includes('study')) type = 'study';
            else if (m.real_emotion === 'joy' || m.real_emotion === 'love') type = 'emotion';
            else if (content.includes('حلم') || content.includes('dream')) type = 'dream';
            else if (importance >= 80) type = 'achievement';
            
            return {
              id: m.id,
              type,
              content: m.expressed_text || m.content || '',
              expressed_text: m.expressed_text,
              real_emotion: m.real_emotion,
              age,
              importance,
              timestamp: m.created_at || m.timestamp || new Date().toISOString(),
              created_at: m.created_at,
            };
          });
          setMemories(mapped);
        }
      } catch (e) {
        // فشل صامت — غابة الذكريات تبقى مخفية
      } finally {
        setLoading(false);
      }
    };
    loadCore();
  }, []);

  if (loading || memories.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.container}>
      <Text style={styles.title}>{rtl.isRTL ? 'غابة الذكريات' : 'Memory Forest'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {memories.map(memory => {
          const isSelected = selected === memory.id;
          const ageColor = MEMORY_COLORS[memory.age] || '#A855F7';
          const MemoryIcon = MEMORY_ICONS[memory.type] || Star;

          return (
            <TouchableOpacity
              key={memory.id}
              style={[styles.tree, isSelected && { borderColor: ageColor }]}
              onPress={() => setSelected(isSelected ? null : memory.id)}
              activeOpacity={0.7}
            >
              {/* تاج الشجرة = أيقونة + لون العمر */}
              <View style={[styles.crown, { backgroundColor: ageColor + '20', borderColor: ageColor }]}>
                <MemoryIcon size={18} stroke={ageColor} />
              </View>
              {/* الجذع = خط */}
              <View style={[styles.trunk, { backgroundColor: ageColor }]} />
              {/* الجذور = خطوط صغيرة */}
              <View style={styles.roots}>
                {[0, 1, 2].map(i => (
                  <View key={i} style={[styles.root, { backgroundColor: ageColor + '60' }]} />
                ))}
              </View>
              {/* شارة الأهمية */}
              {memory.importance >= 80 && (
                <View style={[styles.importanceBadge, { backgroundColor: ageColor + '30' }]}>
                  <Star size={8} stroke={ageColor} />
                </View>
              )}
              {/* التفاصيل عند الاختيار */}
              {isSelected && (
                <View style={styles.details}>
                  <Text style={styles.detailText} numberOfLines={2}>{memory.content}</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailAge}>{rtl.isRTL ? 'العمر:' : 'Age:'} {memory.age}</Text>
                    {memory.real_emotion && (
                      <Text style={styles.detailEmotion}>
                        {memory.real_emotion === 'joy' ? '😊' : memory.real_emotion === 'sadness' ? '😢' : memory.real_emotion === 'love' ? '💜' : ''}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm },
  title: { color: '#A78BFA', fontSize: 14, fontWeight: '600', marginBottom: SPACE.sm },
  scroll: { gap: SPACE.md, paddingBottom: SPACE.sm },
  tree: {
    alignItems: 'center',
    gap: 2,
    width: 80,
    backgroundColor: 'rgba(26,18,38,0.6)',
    borderRadius: RADIUS.sm,
    padding: SPACE.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  crown: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  trunk: { width: 3, height: 16, borderRadius: 2 },
  roots: { flexDirection: 'row', gap: 8, marginTop: -2 },
  root: { width: 2, height: 8, borderRadius: 1 },
  importanceBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: { marginTop: 6, alignItems: 'center' },
  detailText: { color: '#E8E0F0', fontSize: 10, textAlign: 'center', lineHeight: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  detailAge: { color: '#6B5B8A', fontSize: 9 },
  detailEmotion: { fontSize: 10 },
});
