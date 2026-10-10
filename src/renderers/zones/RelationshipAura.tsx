import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing } from 'react-native-reanimated';
import { stateBus, STATE_EVENTS } from '../../../src/core/StateBus';
import { useAppTheme } from '../../../engine/colors';

interface RelationshipAuraProps {
  size?: number;
}

const PHASE_AURA: Record<string, { color: string; rings: number; pulseSpeed: number; glowIntensity: number }> = {
  stranger:       { color: '#4B5563', rings: 1, pulseSpeed: 8000, glowIntensity: 0.05 },
  acquaintance:   { color: '#6366F1', rings: 1, pulseSpeed: 6000, glowIntensity: 0.10 },
  friend:         { color: '#8B5CF6', rings: 2, pulseSpeed: 4500, glowIntensity: 0.18 },
  close_friend:   { color: '#A855F7', rings: 2, pulseSpeed: 3500, glowIntensity: 0.28 },
  soulmate:       { color: '#EC4899', rings: 3, pulseSpeed: 2500, glowIntensity: 0.40 },
};

function getPhaseFromBond(bondLevel: number): string {
  if (bondLevel >= 95) return 'soulmate';
  if (bondLevel >= 80) return 'close_friend';
  if (bondLevel >= 60) return 'friend';
  if (bondLevel >= 20) return 'acquaintance';
  return 'stranger';
}

export default function RelationshipAura({ size = 200 }: RelationshipAuraProps) {
  const { colors } = useAppTheme();
  const [phase, setPhase] = useState<string>('stranger');

  const updatePhase = () => {
    const bondLevel = stateBus.getState().relationship.bondLevel;
    setPhase(getPhaseFromBond(bondLevel));
  };

  useEffect(() => {
    updatePhase();
    const unsub = stateBus.on(STATE_EVENTS.BOND_CHANGED, updatePhase);
    const interval = setInterval(updatePhase, 10000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  const config = PHASE_AURA[phase] || PHASE_AURA.stranger;

  const ringsRef = useRef(
    Array.from({ length: 3 }, () => ({
      opacity: useSharedValue(0),
      scale: useSharedValue(0.7),
    }))
  );
  const rings = ringsRef.current.slice(0, config.rings);

  useEffect(() => {
    rings.forEach((ring, i) => {
      ring.opacity.value = withRepeat(
        withTiming(config.glowIntensity, { duration: config.pulseSpeed, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
      ring.scale.value = withRepeat(
        withTiming(1.0 + i * 0.15, { duration: config.pulseSpeed * (1 + i * 0.2), easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    });
  }, [phase]);

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      {rings.map((ring, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              width: size * (0.7 + i * 0.25),
              height: size * (0.7 + i * 0.25),
              borderRadius: size * (0.7 + i * 0.25) / 2,
              borderColor: config.color + '60',
            },
            useAnimatedStyle(() => ({
              opacity: ring.opacity.value,
              transform: [{ scale: ring.scale.value }],
            })),
          ]}
        />
      ))}
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
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
