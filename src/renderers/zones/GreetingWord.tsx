import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { useRTL } from '../../../lib/useRTL';

interface GreetingWordProps {
  word: string;
  colors: string[];
  transitionSpeed: number;
  fontSize: number;
  fontWeight: '300' | '400' | '500';
  onComplete?: () => void;
}

export default function GreetingWord({
  word,
  colors,
  transitionSpeed,
  fontSize,
  fontWeight,
  onComplete,
}: GreetingWordProps) {
  const rtl = useRTL();
  const colorIndex = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });

    const totalColors = colors.length;
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % totalColors;
      colorIndex.value = withTiming(currentIndex, {
        duration: transitionSpeed,
        easing: Easing.inOut(Easing.ease),
      });
    }, transitionSpeed + 200);

    const timer = setTimeout(() => {
      clearInterval(interval);
      onComplete?.();
    }, 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const index = colorIndex.value;
    const fromIndex = Math.floor(index) % colors.length;
    const toIndex = (fromIndex + 1) % colors.length;
    const progress = index - Math.floor(index);

    const color = interpolateColor(
      progress,
      [0, 1],
      [colors[fromIndex], colors[toIndex]]
    );

    return { color, opacity: opacity.value };
  });

  return (
    <Animated.Text
      style={[
        styles.greeting,
        {
          fontSize,
          fontWeight,
          textAlign: rtl.isRTL ? 'right' : 'left',
          writingDirection: rtl.writingDirection,
        },
        animatedStyle,
      ]}
    >
      {word}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  greeting: {
    letterSpacing: 2,
  },
});
