import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutDown } from 'react-native-reanimated';
import { useTwinBrain } from '../hooks/useTwinBrain';
import { EventBus } from '../core/EventBus';
import { SPACE, RADIUS } from '../../src/design/tokens/spacing';
import { useRTL } from '../../lib/useRTL';
import { BookOpen, Briefcase, Moon, Palette, Heart, Code } from 'lucide-react-native';

interface WorkspaceSuggestion {
  type: string;
  icon: typeof BookOpen;
  label_ar: string;
  label_en: string;
  color: string;
  trigger: string;
}

const WORKSPACES: WorkspaceSuggestion[] = [
  { type: 'study', icon: BookOpen, label_ar: 'أريد أن أذاكر', label_en: 'I want to study', color: '#3B82F6', trigger: 'study' },
  { type: 'business', icon: Briefcase, label_ar: 'أعمل على مشروع', label_en: 'Work on a project', color: '#F59E0B', trigger: 'business' },
  { type: 'dream', icon: Moon, label_ar: 'حلمت البارحة', label_en: 'I had a dream', color: '#8B5CF6', trigger: 'dream' },
  { type: 'creative', icon: Palette, label_ar: 'أريد أن أكتب', label_en: 'I want to create', color: '#EC4899', trigger: 'creative' },
  { type: 'life', icon: Heart, label_ar: 'تحدث معي عن حياتي', label_en: 'Talk about life', color: '#10B981', trigger: 'life' },
  { type: 'code', icon: Code, label_ar: 'أريد برمجة', label_en: 'I want to code', color: '#6366F1', trigger: 'code' },
];

export default function WorkspacePortal() {
  const rtl = useRTL();
  const [visible, setVisible] = useState(false);
  const [suggestion, setSuggestion] = useState<WorkspaceSuggestion | null>(null);

  const showSuggestion = useCallback(() => {
    if (visible) return;
    const random = WORKSPACES[Math.floor(Math.random() * WORKSPACES.length)];
    setSuggestion(random);
    setVisible(true);

    setTimeout(() => setVisible(false), 8000);
  }, [visible]);

  useEffect(() => {
    const timer = setTimeout(showSuggestion, 15000);
    const interval = setInterval(showSuggestion, 120000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [showSuggestion]);

  const handleTap = () => {
    if (!suggestion) return;
    EventBus.emit('WORKSPACE_CHANGE_REQUESTED', {
      workspace: suggestion.type,
      confidence: 0.9,
      trigger: 'portal',
    });
    setVisible(false);
  };

  if (!visible || !suggestion) return null;

  const Icon = suggestion.icon;

  return (
    <Animated.View
      entering={SlideInUp.duration(400).springify()}
      exiting={SlideOutDown.duration(300)}
      style={styles.container}
    >
      <TouchableOpacity
        style={[styles.card, { borderColor: suggestion.color + '40' }]}
        onPress={handleTap}
        activeOpacity={0.9}
      >
        <View style={[styles.iconWrap, { backgroundColor: suggestion.color + '20' }]}>
          <Icon size={20} stroke={suggestion.color} />
        </View>
        <Text style={[styles.text, { color: suggestion.color }]}>
          {rtl.isRTL ? suggestion.label_ar : suggestion.label_en}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    backgroundColor: 'rgba(26, 18, 38, 0.9)',
    borderRadius: RADIUS.card,
    borderWidth: 1,
    padding: SPACE.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
