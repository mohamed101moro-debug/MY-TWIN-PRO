import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
  withRepeat, withSequence, Easing,
} from 'react-native-reanimated';
import { usePresence } from '../hooks/usePresence';
import { useBondLevel } from '../hooks/useBondLevel';
import { useEmotionalState } from '../hooks/useEmotionalState';

export default function SoulPulseRing() {
  const presence = usePresence();
  const bond = useBondLevel();
  const emotion = useEmotionalState();

  const ringOpacity = useSharedValue(0);
  const ringScale = useSharedValue(1);

  useEffect(() => {
    const interval = setInterval(() => {
      ringOpacity.value = withSequence(
        withTiming(0.08 + bond.bondLevel * 0.02, { duration: 800, easing: Easing.out(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.in(Easing.sin) }),
      );
      ringScale.value = withSequence(
        withTiming(1.3, { duration: 800, easing: Easing.out(Easing.sin) }),
        withTiming(1.0, { duration: 1500, easing: Easing.in(Easing.sin) }),
      );
    }, 6000 + Math.random() * 4000);

    return () => clearInterval(interval);
  }, [bond.bondLevel]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          borderColor: emotion.valence === 'positive' ? '#B8A0D0' : '#6B8AB0',
        },
        ringStyle,
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    alignSelf: 'center',
  },
});
