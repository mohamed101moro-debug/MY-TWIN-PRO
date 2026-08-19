import React, { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import DigitalBeing from './DigitalBeing';
import { presenceEngine } from '../../core/PresenceBridge';
import { devicePresenceEngine } from '../../../engine/device/DevicePresenceEngine';
import { useTwinStore } from '../../../store/useTwinStore';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';
/** ConsciousBeing v2 — الموصِّل الحي: يشغّل المحرك، يشترك فيه، يبني env، ويوقظ الكيان تدريجيًا. */
export default function ConsciousBeing({ size = 300 }: { size?: number }) {
  const scheme = useColorScheme();
  const [presence, setPresence] = useState<PresenceState>(() => presenceEngine.getSnapshot());
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
    <DigitalBeing
      presence={presence}
      size={size}
      isDark={scheme !== 'light'}
      env={env}
      maturity={maturity}
      userNear={env?.userNear}
      awaken={awaken}
    />
  );
}
