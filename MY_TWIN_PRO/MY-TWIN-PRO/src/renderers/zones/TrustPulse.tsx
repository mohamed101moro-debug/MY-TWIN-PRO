import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { stateBus, STATE_EVENTS } from '../../../src/core/StateBus';
import { useAppTheme } from '../../../engine/colors';

interface TrustPulseProps {
  size?: number;
}

export default function TrustPulse({ size = 16 }: TrustPulseProps) {
  const { colors } = useAppTheme();
  const [trustValue, setTrustValue] = useState(50);
  const pulseOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(0.5);

  useEffect(() => {
    const updateTrust = () => {
      const state = stateBus.getState();
      const bond = state.relationship.bondLevel;
      // يمكن تطويره ليأخذ trust_model من UnifiedResponse مستقبلاً
      setTrustValue(bond);
    };

    updateTrust();
    const unsub = stateBus.on(STATE_EVENTS.BOND_CHANGED, updateTrust);
    return () => unsub();
  }, []);

  // نبض عند تغير الثقة
  useEffect(() => {
    pulseOpacity.value = withSequence(
      withTiming(0.6, { duration: 400 }),
      withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) }),
    );
    pulseScale.value = withSequence(
      withTiming(2.5, { duration: 400 }),
      withTiming(3.5, { duration: 800, easing: Easing.out(Easing.ease) }),
    );
  }, [trustValue]);

  const getColor = () => {
    if (trustValue >= 80) return colors.success;
    if (trustValue >= 60) return colors.accent;
    if (trustValue >= 40) return colors.gold;
    return '#6B7280';
  };

  const color = getColor();
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <>
      <Animated.View
        style={[
          styles.pulse,
          {
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            borderColor: color,
          },
          animatedStyle,
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          styles.core,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  core: {
    position: 'absolute',
    alignSelf: 'center',
  },
  pulse: {
    position: 'absolute',
    borderWidth: 1.5,
    alignSelf: 'center',
  },
});
