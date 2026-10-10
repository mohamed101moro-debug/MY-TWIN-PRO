import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight } from 'react-native-reanimated';
import { unifiedBrainBridge } from '../core/UnifiedBrainBridge';
import { stateBus } from '../core/StateBus';
import { useRTL } from '../../lib/useRTL';
import { useAppTheme } from '../../engine/colors';
import { SPACE, RADIUS } from '../../src/design/tokens/spacing';
import { BookOpen, Briefcase, Moon, Sparkles, ArrowRight } from 'lucide-react-native';

interface QuickAction {
  id: string;
  text: string;
  icon: typeof BookOpen;
  color: string;
  action: () => void;
  priority: 'high' | 'medium' | 'low';
}

export default function QuickActions() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [visible, setVisible] = useState(false);

  const generateActions = useCallback(async () => {
    const generated: QuickAction[] = [];

    try {
      // 1. هل هناك جلسة دراسة سابقة؟
      const studyMemories = await unifiedBrainBridge.getCapabilityMemory('study', 3);
      if (studyMemories.length > 0) {
        const lastStudy = studyMemories[0];
        generated.push({
          id: 'continue_study',
          text: rtl.isRTL
            ? `أكمل ${(lastStudy.expressed_text || lastStudy.content || '').substring(0, 30)}...`
            : `Continue ${(lastStudy.expressed_text || lastStudy.content || '').substring(0, 30)}...`,
          icon: BookOpen,
          color: '#3B82F6',
          action: () => {},
          priority: 'high',
        });
      }

      // 2. هل هناك مشروع قيد العمل؟
      const projectMemories = await unifiedBrainBridge.getCapabilityMemory('business', 1);
      if (projectMemories.length > 0) {
        generated.push({
          id: 'continue_project',
          text: rtl.isRTL ? 'نكمل مشروعنا؟' : 'Continue our project?',
          icon: Briefcase,
          color: colors.gold,
          action: () => {},
          priority: 'high',
        });
      }

      // 3. هل حان وقت check-in؟
      const bond = stateBus.getState().relationship.bondLevel;
      if (bond > 50) {
        generated.push({
          id: 'check_in',
          text: rtl.isRTL ? 'كيف تشعر اليوم؟' : 'How are you feeling today?',
          icon: Sparkles,
          color: colors.accent,
          action: () => {},
          priority: 'medium',
        });
      }

      // 4. هل الوقت ليلاً؟ اقترح Dream
      const hour = new Date().getHours();
      if (hour >= 21 || hour < 5) {
        generated.push({
          id: 'dream_time',
          text: rtl.isRTL ? 'هل تريد أن تحكي لي حلمك؟' : 'Want to tell me your dream?',
          icon: Moon,
          color: '#8B5CF6',
          action: () => {},
          priority: 'low',
        });
      }
    } catch (e) {}

    if (generated.length > 0) {
      setActions(generated.slice(0, 3));
      setVisible(true);
    }
  }, [rtl.isRTL, colors]);

  useEffect(() => {
    const timer = setTimeout(generateActions, 3000);
    const interval = setInterval(generateActions, 90000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [generateActions]);

  if (!visible || actions.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={styles.container}>
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <Animated.View key={action.id} entering={SlideInRight.delay(index * 100).duration(300)}>
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: action.color + '30' }]}
              onPress={action.action}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, { backgroundColor: action.color + '15' }]}>
                <Icon size={18} stroke={action.color} />
              </View>
              <Text style={[styles.text, { color: colors.text }]} numberOfLines={1}>{action.text}</Text>
              <ArrowRight size={16} stroke={action.color} opacity={0.5} />
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm, gap: SPACE.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderRadius: RADIUS.card, borderWidth: 1, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm + 2 },
  iconWrap: { width: 36, height: 36, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  text: { flex: 1, fontSize: 14, fontWeight: '500' },
});
