// @ts-nocheck
/** LivingBeingSkia v1 — المحوّل: presence + sensors حية ⇒ VisualState ⇒ DigitalBeing v7 (عارض نقي) */
import React, { useMemo } from 'react';
import DigitalBeing from './DigitalBeing';
import { buildVisualState } from '../../../engine/presence/VisualState';
import { snapshotFromSensors } from '../../../engine/presence/EnvironmentalReactor';
import { devicePresenceEngine } from '../../../engine/device/DevicePresenceEngine';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';
export default function LivingBeingSkia({ presence, size = 360, isDark = true, awaken = 1 }: {
  presence: PresenceState | null; size?: number; isDark?: boolean; awaken?: number;
}) {
  const vs = useMemo(() => {
    let env: any = undefined;
    try {
      env = snapshotFromSensors(devicePresenceEngine.getSensors(), {
        listening: !!presence?.listening, speaking: !!presence?.speaking,
        thinking: !!presence?.thinking, camera: false,
      });
    } catch {}
    return buildVisualState(presence, env, awaken);
  }, [presence, awaken]);
  return <DigitalBeing vs={vs} size={size} isDark={isDark} />;
}
