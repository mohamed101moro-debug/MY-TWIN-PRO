import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { presenceEngine } from '../../../engine/presence/PresenceEngine';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';
import { useDeviceContext } from '../../hooks/useDeviceContext';
import AwarenessBackground from './AwarenessBackground';
import EntityWaveform from './EntityWaveform';
import LivingEntity from './LivingEntity';
import { presenceToEntity } from './useEntityState';
/** المسرح الواعي v2 — ولادة تدريجية + خلفية حية + كيان سلوكي + موجة صوت. */
export default function ConsciousStage({ size = 280 }: { size?: number }) {
  const [pres, setPres] = useState<PresenceState | null>(null);
  const [awaken, setAwaken] = useState(0);
  const dev = useDeviceContext();
  const birth = useSharedValue(0);
  useEffect(() => {
    birth.value = withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) });
    let a = 0; const iv = setInterval(() => { a = Math.min(1, a + 0.04); setAwaken(a); if (a >= 1) clearInterval(iv); }, 70);
    return () => clearInterval(iv);
  }, []);
  const birthStyle = useAnimatedStyle(() => ({ opacity: birth.value, transform: [{ scale: 0.62 + birth.value * 0.38 }] }));
  useEffect(() => {
    presenceEngine.start();
    const un = presenceEngine.subscribe((s) => setPres({ ...s }));
    return () => { un(); };
  }, []);
  const state = presenceToEntity(pres);
  const energy = pres?.energy ?? 0.5;
  const nightBoost = dev.environmentMode === 'night' ? 0.08 : 0;
  const batteryCalm = dev.batteryLevel < 0.2 ? 0.25 : 0;
  const intensity = Math.max(0.35, Math.min(1.15, 0.55 + energy * 0.45 + nightBoost - batteryCalm));
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <AwarenessBackground intensity={intensity * Math.max(0.25, awaken)} speaking={!!pres?.speaking} />
      <Animated.View style={[styles.center, birthStyle]} pointerEvents="box-none">
        <LivingEntity state={state} size={size} intensity={Math.max(0.4, Math.min(1, intensity))} speaking={!!pres?.speaking} />
      </Animated.View>
      <View style={styles.wave} pointerEvents="none">
        <EntityWaveform active={!!pres?.speaking || !!pres?.listening} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  wave: { position: 'absolute', bottom: 4, left: 0, right: 0, alignItems: 'center' },
});
