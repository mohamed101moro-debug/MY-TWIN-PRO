// @ts-nocheck
/** LivingBeingSkia v1.1 — presence(+env اختياري) ⇒ VisualState ⇒ DigitalBeing v7 (بيئة حقيقية من الحساسات). */
import React, { useMemo } from 'react';
import DigitalBeing from './DigitalBeing';
import { buildVisualState } from '../../../engine/presence/VisualState';
import { snapshotFromSensors } from '../../../engine/presence/EnvironmentalReactor';
import { devicePresenceEngine } from '../../../engine/device/DevicePresenceEngine';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';
export default function LivingBeingSkia({ presence, size = 360, isDark = true, awaken = 1, env, maturity, userNear }: any) {
  const vs = useMemo(() => {
    let snap: any = env;
    if (!snap) {
      try {
        snap = snapshotFromSensors(devicePresenceEngine.getSensors(), {
          listening: !!presence?.listening, speaking: !!presence?.speaking,
          thinking: !!presence?.thinking, camera: false,
        });
      } catch {}
    }
    return buildVisualState(presence ?? null, snap, awaken);
  }, [presence, awaken, env]);
  return <DigitalBeing vs={vs} presence={presence} size={size} isDark={isDark} maturity={maturity} userNear={userNear} awaken={awaken} />;
}
