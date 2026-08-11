import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  interpolate, Easing, Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLivingTheme } from '../../../engine/living-theme';
import { useTwinState } from '../../../engine/core/TwinState';
import type { ConsciousnessMode } from '../../../engine/core/TwinState';

const { width } = Dimensions.get('window');

const Blob = ({ index, speed, colors, baseSize, pulseType }: {
  index: number; speed: number; colors: [string, string, string]; baseSize: number; pulseType: string;
}) => {
  const pulse = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    const uniqueSpeed = speed * (0.8 + Math.random() * 0.4);
    pulse.value = withRepeat(withTiming(1, { duration: uniqueSpeed, easing: Easing.inOut(Easing.sin) }), -1, true);
    rotate.value = withRepeat(withTiming(360, { duration: uniqueSpeed * 1.5, easing: Easing.linear }), -1, false);
  }, [speed]);

  const animatedStyle = useAnimatedStyle(() => {
    const scaleMultiplier = pulseType === 'fast' ? [0.9, 1.25] :
      pulseType === 'slow' ? [0.95, 1.1] :
      pulseType === 'wave' ? [0.85, 1.2] :
      pulseType === 'scattered' ? [0.8 + (index * 0.1), 1.1 + (index * 0.05)] :
      [0.9, 1.15];
    const scale = interpolate(pulse.value, [0, 1], scaleMultiplier, Extrapolation.CLAMP);
    const opacity = pulseType === 'scattered'
      ? interpolate(pulse.value, [0, 0.5, 1], [0.15, 0.35, 0.15], Extrapolation.CLAMP)
      : interpolate(pulse.value, [0, 1], [0.2, 0.5], Extrapolation.CLAMP);
    const translateX = pulseType === 'scattered' ? interpolate(pulse.value, [0, 1], [-20 * index, 20 * index], Extrapolation.CLAMP) : 0;
    const translateY = pulseType === 'scattered' ? interpolate(pulse.value, [0, 1], [-10, 10], Extrapolation.CLAMP) : 0;
    return {
      transform: [{ scale }, { translateX }, { translateY }, { rotate: `${rotate.value}deg` }] as const,
      opacity,
    };
  });

  const size = width * baseSize * (0.7 + (index * 0.2));
  const position = {
    top: -size * (0.1 + index * 0.15),
    left: index % 2 === 0 ? -size * 0.2 : width - size * 0.8,
  };

  return (
    <Animated.View style={[st.blob, { width: size, height: size, borderRadius: size / 2, top: position.top, left: position.left }, animatedStyle]}>
      <LinearGradient colors={colors} style={st.gradient} start={{ x: 0.2, y: 0.2 }} end={{ x: 0.8, y: 0.8 }} />
    </Animated.View>
  );
};

export const AwarenessBackground = () => {
  const theme = useLivingTheme();
  const mode = useTwinState(s => s.consciousnessMode);
  const config = useMemo(() => {
    const configs: Record<ConsciousnessMode, { speed: number; colors: [string, string, string]; blobCount: number; blobSize: number; pulseType: 'slow' | 'medium' | 'fast' | 'wave' | 'scattered' }> = {
      sleeping:    { speed: 8000, colors: ['#1E1B4B', '#312E81', 'transparent'], blobCount: 1, blobSize: 0.8, pulseType: 'slow' },
      listening:   { speed: 5000, colors: [theme.living.breathingGlow + '20', theme.living.breathingGlow + '10', 'transparent'], blobCount: 2, blobSize: 1.0, pulseType: 'medium' },
      thinking:    { speed: 3000, colors: ['#6366F130', '#818CF820', 'transparent'], blobCount: 2, blobSize: 1.1, pulseType: 'medium' },
      analyzing:   { speed: 6000, colors: ['#3B82F620', '#60A5FA10', 'transparent'], blobCount: 3, blobSize: 1.0, pulseType: 'slow' },
      learning:    { speed: 2000, colors: ['#10B98120', '#34D39910', '#6EE7B705'], blobCount: 4, blobSize: 0.7, pulseType: 'wave' },
      speaking:    { speed: 1500, colors: [theme.living.breathingGlow + '30', theme.living.breathingGlow + '20', 'transparent'], blobCount: 2, blobSize: 1.2, pulseType: 'fast' },
      dreaming:    { speed: 7000, colors: [theme.living.dream + '15', theme.living.dream + '10', '#1E1B4B20'], blobCount: 4, blobSize: 1.3, pulseType: 'scattered' },
      emotional:   { speed: 3500, colors: [theme.living.emotion + '20', theme.living.emotion + '10', 'transparent'], blobCount: 2, blobSize: 1.0, pulseType: 'wave' },
      deep_thinking: { speed: 5000, colors: [theme.living.neuron + '25', theme.living.neuron + '15', '#6366F108'], blobCount: 5, blobSize: 1.0, pulseType: 'slow' },
      searching_memory: { speed: 4000, colors: [theme.living.memory + '20', theme.living.memory + '10', '#6366F105'], blobCount: 3, blobSize: 0.9, pulseType: 'scattered' },
    };
    return configs[mode] || configs.thinking;
  }, [mode, theme]);

  const blobs = useMemo(() =>
    Array.from({ length: config.blobCount }).map((_, i) => (
      <Blob key={i} index={i} speed={config.speed} colors={config.colors} baseSize={config.blobSize} pulseType={config.pulseType} />
    )), [config]);

  return (
    <View style={[st.container, { backgroundColor: theme.colors.bg }]}>
      {blobs}
      <View style={st.overlay} />
    </View>
  );
};

const st = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  blob: { position: 'absolute' },
  gradient: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.03)' },
});
