import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from './theme';
interface EntityWaveformProps { active?: boolean; bars?: number; }
function WaveBar({ index, active, color }: { index: number; active: boolean; color: string }) {
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    progress.value = active
      ? withRepeat(withTiming(1, { duration: 420 + index * 46, easing: Easing.inOut(Easing.sin) }), -1, true)
      : withTiming(0, { duration: 260 });
  }, [active, index]);
  const style = useAnimatedStyle(() => ({
    height: 4 + progress.value * (10 + ((index * 7) % 18)),
    opacity: active ? 0.55 + progress.value * 0.45 : 0.35,
    transform: [{ scaleX: active ? 1 : 0.78 }],
  }));
  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}
export function EntityWaveform({ active = false, bars = 15 }: EntityWaveformProps) {
  const theme = useTheme();
  return (
    <View accessible accessibilityLabel={active ? 'Twin is speaking' : 'Twin is quiet'} style={styles.container}>
      {Array.from({ length: bars }).map((_, index) => (
        <WaveBar key={index} index={index} active={active} color={index % 3 === 0 ? theme.entityCyan : theme.primaryLight} />
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2, marginBottom: 4 },
  bar: { width: 3, minHeight: 4, borderRadius: 4, shadowColor: '#9D50BB', shadowOpacity: 0.8, shadowRadius: 5, elevation: 3 },
});
export default EntityWaveform;
