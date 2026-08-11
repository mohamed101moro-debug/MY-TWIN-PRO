import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { stateBus } from '../../../src/core/StateBus';
import { useAppTheme } from '../../../engine/colors';

const { width, height } = Dimensions.get('window');

export default function ConnectionField({ visible = true }: { visible?: boolean }) {
  const { colors } = useAppTheme();
  
  const opacityValues = useRef(
    Array.from({ length: 6 }, () => useSharedValue(0))
  ).current;

  const scaleValues = useRef(
    Array.from({ length: 6 }, () => useSharedValue(0.5))
  ).current;

  const [particles] = useState(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: height * 0.3 + Math.random() * height * 0.2,
    }))
  );

  useEffect(() => {
    if (!visible) return;

    // ✅ من StateBus: مستوى الرابطة الحقيقي
    const bondLevel = stateBus.getState().relationship.bondLevel;
    const maxParticles = Math.floor(bondLevel / 20);

    particles.forEach((_, i) => {
      if (i >= maxParticles) return;

      opacityValues[i].value = withDelay(
        i * 500,
        withRepeat(
          withSequence(
            withTiming(0.15, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.05, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          true,
        ),
      );

      scaleValues[i].value = withDelay(
        i * 500,
        withRepeat(
          withSequence(
            withTiming(1.2, { duration: 2500 }),
            withTiming(0.8, { duration: 2500 }),
          ),
          -1,
          true,
        ),
      );
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={p.id}
          style={[
            styles.particle,
            {
              left: p.x,
              top: p.y,
              backgroundColor: colors.accent,
              opacity: opacityValues[i],
              transform: [{ scale: scaleValues[i] }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
