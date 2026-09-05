import React, { useEffect, useMemo, useState } from 'react';
import { AppState, AppStateStatus, useColorScheme } from 'react-native';
import ConsciousStage from './ConsciousStage';
import LivingEntity from './LivingEntity';
import { presenceEngine } from '../../core/PresenceBridge';
import { stateBus } from '../../core/StateBus';
import { devicePresenceEngine } from '../../../engine/device/DevicePresenceEngine';
import { snapshotFromSensors } from '../../../engine/presence/EnvironmentalReactor';
import { buildVisualState } from '../../../engine/presence/VisualState';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';
/** ConsciousBeing v4 — مصدر واحد: presence(محرك) + env(حساسات موحدة /4) ⇒ vs ⇒ Stage. */
class BeingBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: any) { try { console.warn('[BEING]', String(e?.message)); } catch {} }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export default function ConsciousBeing({ size = 300 }: { size?: number }) {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const [presence, setPresence] = useState<PresenceState | null>(() => presenceEngine.getSnapshot());
  const [env, setEnv] = useState<any>(null);
  const [awaken, setAwaken] = useState(0);
  const [lowPower, setLowPower] = useState(false);
  useEffect(() => {
    presenceEngine.start();
    const un = presenceEngine.subscribe(setPresence);
    const iv = setInterval(() => {
      try {
        const s: any = devicePresenceEngine.getSensors();
        const st: any = stateBus.getState();
        setEnv(snapshotFromSensors(s, { listening: !!st.listening, speaking: !!st.speaking, thinking: !!st.thinking, camera: !!st.camera }));
        setLowPower(!!s.isBatteryLow || (typeof s.deviceBattery === 'number' && s.deviceBattery >= 0 && s.deviceBattery < 15));
      } catch {}
    }, 600);
    let a = 0;
    const aw = setInterval(() => { a = Math.min(1, a + 0.04); setAwaken(a); if (a >= 1) clearInterval(aw); }, 70);
    const onApp = (st: AppStateStatus) => { try { if (st === 'active') presenceEngine.start(); else presenceEngine.stop(); } catch {} };
    const sub = AppState.addEventListener('change', onApp);
    return () => { un(); clearInterval(iv); clearInterval(aw); sub.remove(); };
  }, []);
  const vs = useMemo(() => buildVisualState(presence, env ?? undefined, awaken), [presence, env, awaken]);
  const fallback = <LivingEntity presence={presence} size={size} intensity={0.7} />;
  return (
    <BeingBoundary fallback={fallback}>
      {lowPower ? fallback : (
        <ConsciousStage size={size} presence={presence} vs={vs} env={env ?? undefined} isDark={isDark} awaken={awaken} />
      )}
    </BeingBoundary>
  );
}
