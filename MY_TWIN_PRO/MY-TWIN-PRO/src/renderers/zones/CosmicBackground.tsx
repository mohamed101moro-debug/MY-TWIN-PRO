import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { DURATION } from '../../../src/design/tokens/motion';

const ENERGY_GLOW: Record<string, string> = {
  tranquil: '#1a1030', warm: '#2a1a20', focused: '#1a2030',
  energetic: '#201a30', mysterious: '#0a0a20', protective: '#1a201a',
  tense: '#201010', serene: '#1a2020',
};

export default function CosmicBackground({ breathPhase, spaceEnergy }: { breathPhase: number; spaceEnergy: string }) {
  const glowOpacity = useSharedValue(0.3);
  const bgColor = ENERGY_GLOW[spaceEnergy] || ENERGY_GLOW.tranquil;

  useEffect(() => {
    glowOpacity.value = withTiming(0.2 + breathPhase * 0.15, {
      duration: DURATION.ambient,
      easing: Easing.inOut(Easing.ease),
    });
  }, [breathPhase]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glow, { backgroundColor: bgColor }, glowStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#050510' },
  glow: { ...StyleSheet.absoluteFillObject, opacity: 0.3 },
});
