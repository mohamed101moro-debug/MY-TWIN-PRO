import React, { useMemo } from 'react';
import DigitalBeing from './DigitalBeing';
import { buildVisualState } from '../../../engine/presence/VisualState';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';
/** محول بصري خالص: PresenceState → VisualState → DigitalBeing. لا مستشعرات داخل renderer. */
export default function LivingBeingSkia({ presence, size = 360, isDark = true, awaken = 1, maturity, userNear }: { presence: PresenceState; size?: number; isDark?: boolean; awaken?: number; maturity?: number; userNear?: boolean }) {
  const vs = useMemo(() => buildVisualState(presence ?? null, undefined, awaken), [presence, awaken]);
  return <DigitalBeing vs={vs} presence={presence} size={size} isDark={isDark} maturity={maturity} userNear={userNear} awaken={awaken} />;
}
