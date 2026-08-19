import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { presenceEngine } from '../../../engine/presence/PresenceEngine';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';
import { useDeviceContext } from '../../../hooks/useDeviceContext';
import AwarenessBackground from './AwarenessBackground';
import EntityWaveform from './EntityWaveform';
import LivingEntity from './LivingEntity';
import { presenceToEntity } from './useEntityState';
/** المسرح الواعي: خلفية حية + كيان سلوكي + موجة صوت — يتغذى من presenceEngine وبيئة الجهاز. */
export default function ConsciousStage({ size = 280 }: { size?: number }) {
  const [pres, setPres] = useState<PresenceState | null>(null);
  const dev = useDeviceContext();
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
      <AwarenessBackground intensity={intensity} speaking={!!pres?.speaking} />
      <View style={styles.center} pointerEvents="box-none">
        <LivingEntity state={state} size={size} intensity={Math.max(0.4, Math.min(1, intensity))} speaking={!!pres?.speaking} />
      </View>
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
