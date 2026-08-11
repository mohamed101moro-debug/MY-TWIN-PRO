import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { unifiedBrainBridge } from '../../core/UnifiedBrainBridge';
import { stateBus } from '../../../src/core/StateBus';
import { useAppTheme } from '../../../engine/colors';

const SOUL_COLORS: Record<string, string> = {
  friend: '#A855F7',
  mentor: '#3B82F6',
  study_partner: '#10B981',
  guide: '#F59E0B',
  listener: '#8B5CF6',
  collaborator: '#EC4899',
  protector: '#6366F1',
  mirror: '#14B8A6',
  cheerleader: '#F97316',
  observer: '#A855F7',
  companion: '#8B5CF6',
  confidant: '#EC4899',
  soul_partner: '#EC4899',
  explorer: '#10B981',
};

export default function SoulPulse() {
  const { colors } = useAppTheme();
  const [role, setRole] = useState('observer');
  const [harmony, setHarmony] = useState(0.5);
  const [syncLevel, setSyncLevel] = useState('moderate');
  
  const color = SOUL_COLORS[role] || colors.accent;
  const pulseOpacity = useSharedValue(0.1);
  const pulseScale = useSharedValue(0.8);

  useEffect(() => {
    const loadSoul = async () => {
      try {
        const twinState = await unifiedBrainBridge.getTwinState();
        const soul = twinState?.soul_state || {};
        setRole(soul.core?.role || 'observer');
        setHarmony(soul.resonance?.harmony || 0.5);
        setSyncLevel(soul.resonance?.sync_level || 'moderate');
      } catch (e) {
        setRole('observer');
        setHarmony(0.5);
        setSyncLevel('moderate');
      }
    };
    loadSoul();
  }, []);

  useEffect(() => {
    const speed = 4000 - harmony * 2000;
    const intensity = 0.1 + harmony * 0.25;

    pulseOpacity.value = withRepeat(
      withTiming(intensity, { duration: speed, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    pulseScale.value = withRepeat(
      withTiming(1.0 + harmony * 0.2, { duration: speed, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [harmony]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.ring,
          { borderColor: color, width: 180, height: 180, borderRadius: 90 },
          ringStyle,
        ]}
      />
      <Animated.View style={[styles.core, { backgroundColor: color, opacity: pulseOpacity }]}>
        <View style={styles.innerDot} />
      </Animated.View>
      {syncLevel === 'complete' && (
        <View style={styles.particles}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.particle,
                { backgroundColor: color, transform: [{ rotate: `${i * 120}deg` }] },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  core: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  particles: {
    position: 'absolute',
    width: 200,
    height: 200,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    top: 0,
    left: '50%',
    marginLeft: -2,
  },
});
