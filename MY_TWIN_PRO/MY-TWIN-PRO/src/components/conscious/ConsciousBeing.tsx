import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useColorScheme } from 'react-native';
import DigitalBeing from './DigitalBeing';
import LivingEntity from './LivingEntity';
import { presenceEngine } from '../../core/PresenceBridge';
import { devicePresenceEngine } from '../../../engine/device/DevicePresenceEngine';
import { useTwinStore } from '../../../store/useTwinStore';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';
/**
 * ConsciousBeing v3 — الموصِّل المحصَّن:
 * - BeingBoundary: أي استثناء رندر ⇒ LivingEntity (صفر كراش، صفر شاشة ميتة)
 * - LowPower: بطارية <15% ⇒ الكيان الخفيف تلقائيًا (استقرار + بطارية)
 * - AppState: خلفية ⇒ المحرك يتوقف (لا استنزاف)؛ عودة ⇒ يستأنف (استمرارية)
 * العقد الخارجي محفوظ: { size } فقط.
 */
class BeingBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: any) { try { console.warn('[BEING]', String(e?.message)); } catch {} }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export default function ConsciousBeing({ size = 300 }: { size?: number }) {
  const scheme = useColorScheme();
  const [presence, setPresence] = useState<PresenceState | null>(() => presenceEngine.getSnapshot());
  const [env, setEnv] = useState<any>({ light: 0.5, noise: 0, motion: 0, userNear: false, camera: false, listening: false });
  const [awaken, setAwaken] = useState(0);
  const [lowPower, setLowPower] = useState(false);
  const bond = Number((useTwinStore((s: any) => s.bondLevel ?? s.bond ?? 20) as any) ?? 20);

  useEffect(() => {
    presenceEngine.start();
    const un = presenceEngine.subscribe(setPresence);
    const iv = setInterval(() => {
      try {
        const s: any = devicePresenceEngine.getSensors();
        setEnv({ light: s.lightLevel ?? 0.5, noise: s.audioLevel ?? 0, motion: s.userWalking ? 0.5 : (s.movement ?? 0), userNear: !!s.faceDetected, camera: false, listening: false });
        setLowPower(!!s.isBatteryLow || (typeof s.deviceBattery === 'number' && s.deviceBattery >= 0 && s.deviceBattery < 15));
      } catch {}
    }, 700);
    let a = 0;
    const aw = setInterval(() => { a = Math.min(1, a + 0.04); setAwaken(a); if (a >= 1) clearInterval(aw); }, 70);
    const onApp = (st: AppStateStatus) => { try { st === 'active' ? presenceEngine.start() : presenceEngine.stop(); } catch {} };
    const sub = AppState.addEventListener('change', onApp);
    return () => { un(); clearInterval(iv); clearInterval(aw); sub.remove(); };
  }, []);

  const maturity = Math.max(0.2, Math.min(1, bond / 100));
  return (
    <BeingBoundary fallback={<LivingEntity presence={presence} size={size} intensity={maturity} />}>
      {lowPower ? (
        <LivingEntity presence={presence} size={size} intensity={maturity} />
      ) : (
        <DigitalBeing presence={presence} size={size} isDark={scheme !== 'light'} env={env} maturity={maturity} userNear={env?.userNear} awaken={awaken} />
      )}
    </BeingBoundary>
  );
}
