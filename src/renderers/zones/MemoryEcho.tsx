import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing } from 'react-native-reanimated';

interface MemoryEchoProps {
  visible: boolean;
  color?: string;
  size?: number;
}

export default function MemoryEcho({ visible, color = '#A855F7', size = 120 }: MemoryEchoProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    if (visible) {
      opacity.value = withSequence(
        withTiming(0.3, { duration: 300 }),
        withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) }),
      );
      scale.value = withSequence(
        withTiming(1.5, { duration: 300 }),
        withTiming(2.0, { duration: 600, easing: Easing.out(Easing.ease) }),
      );
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.echo,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  echo: {
    position: 'absolute',
    borderWidth: 1.5,
    alignSelf: 'center',
  },
});
