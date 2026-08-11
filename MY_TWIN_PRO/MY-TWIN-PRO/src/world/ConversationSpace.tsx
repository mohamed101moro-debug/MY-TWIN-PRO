import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEmotionalState } from '../hooks/useEmotionalState';
import { stateBus } from '../core/StateBus';
import { useAppTheme } from '../../engine/colors';
import { SPACE, RADIUS } from '../../src/design/tokens/spacing';

interface ConversationSpaceProps {
  children: React.ReactNode;
  isThinking?: boolean;
  isWriting?: boolean;
}

export default function ConversationSpace({
  children,
  isThinking = false,
  isWriting = false,
}: ConversationSpaceProps) {
  const { colors } = useAppTheme();
  const emotion = useEmotionalState();
  const spaceOpacity = useRef(new Animated.Value(1)).current;
  const memoryGlow = useRef(new Animated.Value(0)).current;
  const behaviorBg = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = stateBus.on('behavior:decision', (_event: string, data: any) => {
      if (data.behavior === 'empathetic_comfort') {
        Animated.timing(behaviorBg, { toValue: 0.8, duration: 500, useNativeDriver: true }).start();
      } else if (data.behavior === 'reflective_silence') {
        Animated.timing(behaviorBg, { toValue: 0.2, duration: 1000, useNativeDriver: true }).start();
      } else {
        Animated.timing(behaviorBg, { toValue: 0, duration: 500, useNativeDriver: true }).start();
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = stateBus.on('MEMORY_SURFACED', () => {
      memoryGlow.setValue(1);
      Animated.timing(memoryGlow, { toValue: 0, duration: 2000, useNativeDriver: true }).start();
    });
    return unsubscribe;
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: spaceOpacity }]}>
      <Animated.View style={[styles.behaviorOverlay, { backgroundColor: colors.accent, opacity: behaviorBg }]} />

      <View style={[styles.personalSpace, { borderBottomColor: colors.border }]}>
        <View style={styles.personalItem}>
          <Text style={[styles.personalLabel, { color: colors.textSecondary }]}>اليوم</Text>
          <Text style={[styles.personalValue, { color: colors.accent }]}>
            {emotion.valence === 'positive' ? 'مشرق' : emotion.valence === 'negative' ? 'متقلب' : 'عادي'}
          </Text>
        </View>
        <View style={styles.personalItem}>
          <Text style={[styles.personalLabel, { color: colors.textSecondary }]}>الطاقة</Text>
          <Text style={[styles.personalValue, { color: colors.accent }]}>{Math.round(emotion.intensity * 100)}%</Text>
        </View>
        <View style={styles.personalItem}>
          <Text style={[styles.personalLabel, { color: colors.textSecondary }]}>المزاج</Text>
          <Text style={[styles.personalValue, { color: colors.accent }]}>{emotion.primaryEmotion || 'neutral'}</Text>
        </View>
      </View>

      <Animated.View style={[styles.memoryRibbon, { backgroundColor: colors.accent + '15', opacity: memoryGlow }]}>
        <Text style={[styles.memoryText, { color: colors.accent }]}>📖 من ذكرياتنا...</Text>
      </Animated.View>

      <View style={styles.conversationContent}>
        {children}
      </View>

      <View style={styles.contextIndicators}>
        <View style={[styles.contextDot, { backgroundColor: colors.accent, opacity: 0.8 }]} />
        <View style={[styles.contextDot, { backgroundColor: colors.accent, opacity: 0.5 }]} />
        <View style={[styles.contextDot, { backgroundColor: colors.accent, opacity: 0.3 }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACE.md,
  },
  behaviorOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  personalSpace: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACE.xs,
    marginBottom: SPACE.sm,
    borderBottomWidth: 0.5,
    zIndex: 1,
  },
  personalItem: {
    alignItems: 'center',
  },
  personalLabel: {
    fontSize: 10,
  },
  personalValue: {
    fontSize: 12,
  },
  memoryRibbon: {
    borderRadius: RADIUS.sm,
    padding: SPACE.sm,
    marginBottom: SPACE.sm,
    zIndex: 1,
  },
  memoryText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  conversationContent: {
    flex: 1,
    zIndex: 1,
  },
  contextIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACE.sm,
  },
  contextDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
