import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import DigitalBeing from './DigitalBeing';
import { presenceEngine } from '../../core/PresenceBridge';
import { devicePresenceEngine } from '../../../engine/device/DevicePresenceEngine';
import { useTwinStore } from '../../../store/useTwinStore';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';
/** ConsciousBeing v3 — الموصِّل الحي (index + living-world) + شبكة أمان. */
class BeingBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: any) { try { console.warn('[BEING]', String(e?.message)); } catch {} }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function PulseFallback({ size }: { size: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true); }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 1 + p.value * 0.06 }], opacity: 0.75 + p.value * 0.25 }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size * 0.9, height: size * 0.9, borderRadius: size, backgroundColor: '#06030F', opacity: 0.94 }} />
      <Animated.View style={[{ width: size * 0.4, height: size * 0.4, borderRadius: size, backgroundColor: '#9B6FFF', shadowColor: '#468BFF', shadowRadius: 30, shadowOpacity: 0.6 }, st]} />
      <View style={{ position: 'absolute', flexDirection: 'row', gap: size * 0.12 }}>
        <View style={{ width: size * 0.05, height: size * 0.03, borderRadius: 999, backgroundColor: '#FFFFFF' }} />
        <View style={{ width: size * 0.05, height: size * 0.03, borderRadius: 999, backgroundColor: '#FFFFFF' }} />
      </View>
    </View>
  );
}
export default function ConsciousBeing({ size = 300 }: { size?: number }) {
  const [presence, setPresence] = useState<PresenceState | null>(() => presenceEngine.getSnapshot());
  const [env, setEnv] = useState<any>({ light: 0.5, noise: 0, motion: 0, userNear: false, camera: false, listening: false });
  const [awaken, setAwaken] = useState(0);
  const bond = Number((useTwinStore((s: any) => s.bondLevel ?? s.bond ?? 20) as any) ?? 20);
  useEffect(() => {
    presenceEngine.start();
    const un = presenceEngine.subscribe(setPresence);
    const iv = setInterval(() => {
      try {
        const s: any = devicePresenceEngine.getSensors();
        setEnv({ light: s.lightLevel ?? 0.5, noise: s.audioLevel ?? 0, motion: s.userWalking ? 0.5 : (s.movement ?? 0), userNear: !!s.faceDetected, camera: false, listening: false });
      } catch {}
    }, 700);
    let a = 0;
    const aw = setInterval(() => { a = Math.min(1, a + 0.04); setAwaken(a); if (a >= 1) clearInterval(aw); }, 70);
    return () => { un(); clearInterval(iv); clearInterval(aw); };
  }, []);
  const maturity = Math.max(0.2, Math.min(1, bond / 100));
  return (
    <BeingBoundary fallback={<PulseFallback size={size} />}>
      <DigitalBeing presence={presence as any} size={size} isDark env={env} maturity={maturity} awaken={awaken} />
    </BeingBoundary>
  );
}
