import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../../engine/colors';

interface ThinkingPhase {
  phase: string;
  progress: number;
  label: string;
}

interface ThinkingIndicatorProps {
  phase: ThinkingPhase | null;
  lang?: string; // مقبول للتوافق مع الاستدعاءات
}

export default function ThinkingIndicator({ phase }: ThinkingIndicatorProps) {
  const { colors } = useAppTheme();

  if (!phase) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.accent + '30' }]}>
      <Text style={[styles.label, { color: colors.accent }]}>{phase.label}</Text>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${phase.progress * 100}%`,
              backgroundColor: colors.accent,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 16,
    gap: 8,
    marginVertical: 4,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  track: {
    height: 3,
    borderRadius: 2,
  },
  fill: {
    height: 3,
    borderRadius: 2,
  },
});
