import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { presenceEngine } from '../../core/PresenceBridge';
import { useDeviceContext } from '../../hooks/useDeviceContext';
import { ThemeColors } from '../../../engine/colors';
import AwarenessBackground from './AwarenessBackground';
import EntityWaveform from './EntityWaveform';
import LivingEntity from './LivingEntity';
import DigitalBeing from './DigitalBeing';
import { presenceToEntity } from './useEntityState';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';
/** ConsciousStage v5 — تناغم كامل: جو + جسد volumetric + موجة + وضع طاقة منخفضة + شبكات أمان. */
const DARK = ThemeColors.dark;
function FallbackBeing({ size }: { size: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true); }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 1 + p.value * 0.06 }], opacity: 0.7 + p.value * 0.3 }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ width: size * 0.52, height: size * 0.52, borderRadius: size, backgroundColor: DARK.entityPurple, shadowColor: DARK.entityCyan, shadowRadius: 40, shadowOpacity: 0.6 }, st]} />
      <View style={{ position: 'absolute', width: size * 0.1, height: size * 0.055, borderRadius: 999, backgroundColor: '#FFFFFF' }} />
    </View>
  );
}
class LayerBoundary extends React.Component<{ name: string; fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: any) { try { console.warn('[STAGE]', this.props.name, String(e?.message)); } catch {} }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
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
  const lowPower = dev.batteryLevel < 0.2 && !dev.isCharging;
  const state = presenceToEntity(pres);
  const env = { light: 0.5, noise: 0, motion: 0, listening: !!pres?.listening, camera: false, userNear: !!pres?.userPresent };
  return (
    <View style={[styles.wrap, { backgroundColor: DARK.bg }]} pointerEvents="box-none">
      <LayerBoundary name="background" fallback={<View style={StyleSheet.absoluteFill} />}>
        <AwarenessBackground dark intensity={(0.5 + (pres?.energy ?? 0.5) * 0.5) * Math.max(0.25, awaken)} speaking={!!pres?.speaking} />
      </LayerBoundary>
      <Animated.View style={[styles.center, birthStyle]} pointerEvents="box-none">
        <LayerBoundary name="entity" fallback={<FallbackBeing size={size} />}>
          {pres ? (lowPower
            ? <LivingEntity state={state} size={size} intensity={0.6} speaking={!!pres.speaking} />
            : <DigitalBeing presence={pres} size={size} isDark env={env} maturity={0.85} awaken={awaken} />)
            : <FallbackBeing size={size} />}
        </LayerBoundary>
      </Animated.View>
      <View style={styles.wave} pointerEvents="none">
        <LayerBoundary name="wave" fallback={null}>
          <EntityWaveform active={!!pres?.speaking || !!pres?.listening} />
        </LayerBoundary>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  wave: { position: 'absolute', bottom: 4, left: 0, right: 0, alignItems: 'center' },
});
