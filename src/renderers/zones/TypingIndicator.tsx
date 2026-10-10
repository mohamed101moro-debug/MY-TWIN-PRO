import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTwinCoreStore } from '../../../store/useTwinCoreStore';
import { useAppTheme } from '../../../engine/colors';

export default function TypingIndicator() {
  const { colors } = useAppTheme();
  const twinName = useTwinCoreStore((s) => s.twinName) || 'توأمك';
  const twinStyle = useTwinCoreStore((s) => s.twinStyle) || 'supportive';
  const lang = useTwinCoreStore((s) => s.lang) || 'ar';
  const isAr = lang === 'ar';

  const dots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [dots]);

  const personalityLabels: Record<string, { ar: string; en: string }> = {
    supportive: { ar: 'الداعم', en: 'Supportive' },
    coach: { ar: 'المدرب', en: 'Coach' },
    wise: { ar: 'الحكيم', en: 'Wise' },
    fun: { ar: 'المرح', en: 'Fun' },
    calm: { ar: 'الهادئ', en: 'Calm' },
  };
  const personality = personalityLabels[twinStyle] || personalityLabels.supportive;
  const displayName = `${twinName} ${isAr ? personality.ar : personality.en}`;

  return (
    <View style={styles.container}>
      <View style={[styles.bubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.dotsRow}>
          {dots.map((dot, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: colors.accent,
                  opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                  transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
                },
              ]}
            />
          ))}
        </View>
      </View>
      <Text style={[styles.nameTag, { color: colors.textSecondary }]}>{displayName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 12 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  dotsRow: { flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  nameTag: { fontSize: 11, marginTop: 4, fontWeight: '500' },
});
