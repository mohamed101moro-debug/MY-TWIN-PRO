import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { unifiedBrainBridge } from '../../core/UnifiedBrainBridge';
import { stateBus } from '../../../src/core/StateBus';
import { useAppTheme } from '../../../engine/colors';
import { SPACE, RADIUS } from '../../../src/design/tokens/spacing';
import { Calendar, Heart, Sparkles } from 'lucide-react-native';

interface ContextItem {
  id: string;
  type: 'memory' | 'emotion' | 'event';
  text: string;
  color: string;
  icon: typeof Calendar;
}

export default function ContextRibbon() {
  const { colors } = useAppTheme();
  const [items, setItems] = useState<ContextItem[]>([]);
  const [visible, setVisible] = useState(false);

  const fetchContext = useCallback(async () => {
    try {
      const ribbonItems: ContextItem[] = [];

      // 1. ذكريات اليوم من TCMA الحقيقية
      const todayMemories = await unifiedBrainBridge.getOnThisDay(2);
      if (todayMemories.length > 0) {
        ribbonItems.push({
          id: 'today',
          type: 'event',
          text: `في مثل هذا اليوم: ${(todayMemories[0].expressed_text || todayMemories[0].content || '').substring(0, 60)}...`,
          color: colors.gold,
          icon: Calendar,
        });
      }

      // 2. ذكريات مرتبطة بالعاطفة الحالية من StateBus
      const currentEmotion = stateBus.getState().emotion.primaryEmotion;
      const emotionMemories = await unifiedBrainBridge.getCapabilityMemory('emotion', 3);
      const filteredByEmotion = emotionMemories.filter(
        m => m.real_emotion === currentEmotion
      );
      if (filteredByEmotion.length > 0) {
        ribbonItems.push({
          id: 'emotion',
          type: 'emotion',
          text: `آخر مرة شعرت بهذا: ${(filteredByEmotion[0].expressed_text || filteredByEmotion[0].content || '').substring(0, 50)}...`,
          color: colors.rose,
          icon: Heart,
        });
      }

      // 3. أحدث ذكرى حدث
      const recent = await unifiedBrainBridge.getCapabilityMemory('event', 1);
      if (recent.length > 0) {
        ribbonItems.push({
          id: 'recent',
          type: 'memory',
          text: `قبل أيام: ${(recent[0].expressed_text || recent[0].content || '').substring(0, 60)}...`,
          color: colors.accent,
          icon: Sparkles,
        });
      }

      if (ribbonItems.length > 0) {
        setItems(ribbonItems);
        setVisible(true);
      }
    } catch (e) {}
  }, [colors]);

  useEffect(() => {
    const timer = setTimeout(fetchContext, 5000);
    const interval = setInterval(fetchContext, 120000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchContext]);

  if (!visible || items.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.chip, { borderColor: item.color + '40', backgroundColor: colors.card }]}
              activeOpacity={0.8}
            >
              <Icon size={12} stroke={item.color} />
              <Text style={[styles.text, { color: item.color }]} numberOfLines={1}>
                {item.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.sm,
    gap: SPACE.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.xs + 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
    maxWidth: 200,
  },
});
