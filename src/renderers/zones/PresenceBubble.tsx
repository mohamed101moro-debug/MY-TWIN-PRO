import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { RADIUS } from '../../../src/design/tokens/spacing';

export default function PresenceBubble({ breathPhase, presenceLevel }: { breathPhase: number; presenceLevel: number }) {
  const bubbleStyle = useAnimatedStyle(() => {
    const scale = interpolate(breathPhase, [0, 0.5, 1], [0.85, 1.05, 0.85]);
    const opacity = 0.2 + presenceLevel * 0.06;
    return { transform: [{ scale }], opacity };
  });

  return <Animated.View style={[styles.bubble, bubbleStyle]} />;
}

const styles = StyleSheet.create({
  bubble: {
    width: 120, height: 120, borderRadius: RADIUS.avatar,
    borderWidth: 1.5, borderColor: 'rgba(180,160,200,0.3)',
    position: 'absolute', alignSelf: 'center',
  },
});
