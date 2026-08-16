import React, { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { presenceBridge, presenceEngine } from '../../core/PresenceBridge';
import { stateBus } from '../../core/StateBus';
import { useAppTheme } from '../../../engine/colors';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';
import DigitalBeing, { type BeingEnv } from './DigitalBeing';
export default function ConsciousBeing({ size = 360, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const { isDark } = useAppTheme();
  const [presence, setPresence] = useState<PresenceState>(() => presenceEngine.getSnapshot());
  const [env, setEnv] = useState<BeingEnv>({ light: 0.5, noise: 0.3, motion: 0, camera: false, userNear: false, listening: false });
  useEffect(() => {
    presenceBridge.start();
    const unsub = presenceEngine.subscribe((next) => setPresence(next));
    const iv = setInterval(() => {
      const s = stateBus.getState();
      setEnv({
        light: (s as any).ambientLight ?? 0.5,
        noise: (s as any).voiceLevel ?? 0.3,
        motion: (s as any).movement ?? 0,
        camera: false,
        userNear: ((s as any).proximity ?? 0) > 0.5,
        listening: !!(s as any).listening,
      });
    }, 600);
    return () => { unsub(); clearInterval(iv); };
  }, []);
  return (
    <View pointerEvents="none" style={[styles.container, { width: size, height: size }, style]}>
      <DigitalBeing presence={presence} size={size} isDark={isDark} env={env} />
    </View>
  );
}
const styles = StyleSheet.create({ container: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' } });
