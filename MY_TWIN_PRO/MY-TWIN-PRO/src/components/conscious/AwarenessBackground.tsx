import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './theme';
const { width, height } = Dimensions.get('window');
const PARTICLES = [
  { left: 0.10, top: 0.18, size: 2, delay: 0 }, { left: 0.82, top: 0.20, size: 1.5, delay: 700 },
  { left: 0.18, top: 0.42, size: 1.2, delay: 1400 }, { left: 0.90, top: 0.48, size: 2, delay: 2100 },
  { left: 0.12, top: 0.72, size: 1.5, delay: 900 }, { left: 0.76, top: 0.78, size: 1.2, delay: 1700 },
  { left: 0.48, top: 0.12, size: 1.2, delay: 2500 }, { left: 0.60, top: 0.88, size: 1.8, delay: 3200 },
];
export interface AwarenessBackgroundProps { intensity?: number; speaking?: boolean; }
export const AwarenessBackground = ({ intensity = 1, speaking = false }: AwarenessBackgroundProps) => {
  const theme = useTheme();
  const pulse = useSharedValue(0);
  const orbit = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: speaking ? 1800 : 4200, easing: Easing.inOut(Easing.sin) }), -1, true);
    orbit.value = withRepeat(withTiming(1, { duration: speaking ? 8500 : 18000, easing: Easing.linear }), -1, false);
  }, [speaking]);
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.22, 0.50]) * intensity,
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.94, 1.16]) }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.18, 0.42]) * intensity,
    transform: [{ rotate: `${interpolate(orbit.value, [0, 1], [0, 360])}deg` }, { scale: interpolate(pulse.value, [0, 1], [0.96, 1.04]) }],
  }));
  return (
    <View pointerEvents="none" style={[styles.container, { backgroundColor: theme.bg }]}>
      <Animated.View style={[styles.bloom, { shadowColor: theme.entityPurple }, bloomStyle]}>
        <LinearGradient colors={[theme.auraGlow, theme.accentGlow, 'transparent']} locations={[0, 0.42, 1]} style={styles.gradient} />
      </Animated.View>
      <Animated.View style={[styles.ring, { borderColor: theme.entityPurple }, ringStyle]} />
      <Animated.View style={[styles.ringInner, { borderColor: theme.entityCyan }, ringStyle]} />
      {PARTICLES.map((particle, index) => (
        <Particle key={index} {...particle} color={index % 2 ? theme.entityCyan : theme.primaryLight} />
      ))}
      <View style={[styles.vignette, { borderColor: theme.border }]} />
    </View>
  );
};
function Particle({ left, top, size, delay, color }: { left: number; top: number; size: number; delay: number; color: string }) {
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withRepeat(withTiming(1, { duration: 2600 + delay, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [delay]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(drift.value, [0, 1], [0.16, 0.78]),
    transform: [{ translateY: interpolate(drift.value, [0, 1], [4, -8]) }, { scale: interpolate(drift.value, [0, 1], [0.7, 1.2]) }],
  }));
  return <Animated.View style={[styles.particle, { left: width * left, top: height * top, width: size, height: size, borderRadius: size, backgroundColor: color, shadowColor: color }, style]} />;
}
const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  bloom: { position: 'absolute', width: width * 1.45, height: width * 1.45, borderRadius: width, top: height * 0.08, left: -width * 0.22, shadowOpacity: 0.75, shadowRadius: 72, elevation: 12 },
  gradient: { flex: 1, borderRadius: width },
  ring: { position: 'absolute', width: width * 1.1, height: width * 0.72, borderRadius: width, borderWidth: 1, top: height * 0.22, left: -width * 0.05 },
  ringInner: { position: 'absolute', width: width * 0.92, height: width * 0.54, borderRadius: width, borderWidth: 1, top: height * 0.27, left: width * 0.04 },
  particle: { position: 'absolute', shadowOpacity: 0.9, shadowRadius: 5, elevation: 4 },
  vignette: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderRadius: 32, opacity: 0.12 },
});
export default AwarenessBackground;
