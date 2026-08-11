import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { useTwinState } from '../../../engine/core/TwinState';
import { useLivingTheme } from '../../../engine/living-theme';

export const SpeakingWave = ({ barCount = 5 }: { barCount?: number }) => {
  const theme = useLivingTheme();
  const isSpeaking = useTwinState(s => s.isSpeaking);
  const bars = useRef(Array.from({ length: barCount }, () => new Animated.Value(0.3))).current;

  useEffect(() => {
    if (isSpeaking) {
      const loops = bars.map((b, i) =>
        Animated.loop(Animated.sequence([
          Animated.delay(i * 100),
          Animated.timing(b, { toValue: 1, duration: theme.motion.waveDuration / 4, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(b, { toValue: 0.3, duration: theme.motion.waveDuration / 4, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]))
      );
      Animated.parallel(loops).start();
      return () => loops.forEach(l => l.stop());
    } else {
      bars.forEach(b => b.setValue(0.3));
    }
  }, [isSpeaking, theme.motion.waveDuration]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 30, gap: 3 }}>
      {bars.map((b, i) => (
        <Animated.View key={i} style={{
          width: 4, borderRadius: 2,
          backgroundColor: theme.living.breathingGlow,
          height: 20, opacity: b,
          transform: [{ scaleY: b }],
        }} />
      ))}
    </View>
  );
};
