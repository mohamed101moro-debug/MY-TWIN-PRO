import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence,
  withTiming, Easing, FadeIn, FadeOut,
} from 'react-native-reanimated';
import { EventBus } from '../../core/EventBus';
import { SPACE, RADIUS } from '../../design/tokens/spacing';
import { useRTL } from '../../../lib/useRTL';
import { Sparkles } from 'lucide-react-native';

interface SignatureMoment {
  type: string;
  color: string;
  response_ar: string;
  response_en: string;
  timestamp: number;
}

const { width } = Dimensions.get('window');

export default function SignatureMomentOverlay() {
  const rtl = useRTL();
  const [moment, setMoment] = useState<SignatureMoment | null>(null);
  const [visible, setVisible] = useState(false);

  const ringScale = useSharedValue(0.5);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    const unsub = EventBus.on('SIGNATURE_MOMENT', (payload: any) => {
      setMoment(payload as SignatureMoment);
      setVisible(true);

      ringOpacity.value = withSequence(
        withTiming(0.4, { duration: 400 }),
        withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) }),
      );
      ringScale.value = withSequence(
        withTiming(1.5, { duration: 400 }),
        withTiming(2.5, { duration: 800, easing: Easing.out(Easing.ease) }),
      );

      setTimeout(() => setVisible(false), 3500);
    });
    return unsub;
  }, []);

  if (!visible || !moment) return null;

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(600)} style={styles.container}>
      <Animated.View style={[styles.ring, { borderColor: moment.color }, ringStyle]} />
      <Animated.View style={[styles.ring2, { borderColor: moment.color + '60' }, ringStyle]} />

      <View style={[styles.card, { borderColor: moment.color + '40' }]}>
        <View style={[styles.iconWrap, { backgroundColor: moment.color + '20' }]}>
          <Sparkles size={24} stroke={moment.color} />
        </View>
        <Text style={[styles.text, { color: moment.color }]}>
          {rtl.isRTL ? moment.response_ar : moment.response_en}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  ring: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    borderWidth: 1.5,
    alignSelf: 'center',
  },
  ring2: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    borderWidth: 1,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: 'rgba(10, 0, 20, 0.95)',
    borderRadius: RADIUS.card,
    borderWidth: 1,
    padding: SPACE.lg,
    alignItems: 'center',
    gap: SPACE.md,
    maxWidth: 300,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 26,
  },
});
