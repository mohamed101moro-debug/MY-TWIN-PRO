import React, { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { presenceBridge, presenceEngine } from '../../core/PresenceBridge';
import { stateBus } from '../../core/StateBus';
import { apiGet } from '../../../lib/httpClient';
import { useAppTheme } from '../../../engine/colors';
import { useTwinStore } from '../../../store/useTwinStore';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';
import DigitalBeing, { } from './DigitalBeing';
import type { BeingEnv } from './BeingEnv';
export default function ConsciousBeing({ size = 360, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const { isDark } = useAppTheme();
  const userId = useTwinStore(s => s.userId) || '';
  const [presence, setPresence] = useState<PresenceState>(() => presenceEngine.getSnapshot());
  const [env, setEnv] = useState<BeingEnv>({ light: 0.5, noise: 0.3, motion: 0, camera: false, userNear: false, listening: false });
  const [maturity, setMaturity] = useState(0.35);
  useEffect(() => {
    presenceBridge.start();
    const unsub = presenceEngine.subscribe((next) => setPresence(next));
    const iv = setInterval(() => {
      const s = stateBus.getState();
      setEnv({ light: (s as any).ambientLight ?? 0.5, noise: (s as any).voiceLevel ?? 0.3, motion: (s as any).movement ?? 0, camera: false, userNear: ((s as any).proximity ?? 0) > 0.5, listening: !!(s as any).listening });
    }, 600);
    return () => { unsub(); clearInterval(iv); };
  }, []);
  // ✅ التطور المرئي من اقتصاد العلاقة الخلفي
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const load = async () => {
      try {
        const d: any = await apiGet(`/api/twin/state?user_id=${userId}`);
        if (alive && d) {
          const bond = Number(d.bond_depth ?? 0.1);
          const harmony = Number(d?.soul_state?.resonance?.harmony ?? 0.2);
          setMaturity(Math.max(0.15, Math.min(1, 0.25 + bond * 0.6 + harmony * 0.4)));
        }
      } catch {}
    };
    load();
    const iv = setInterval(load, 60000);
    return () => { alive = false; clearInterval(iv); };
  }, [userId]);
  return (
    <View pointerEvents="none" style={[styles.container, { width: size, height: size }, style]}>
      <DigitalBeing presence={presence} size={size} isDark={isDark} env={env} maturity={maturity} />
    </View>
  );
}
const styles = StyleSheet.create({ container: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' } });
