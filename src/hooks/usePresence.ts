import { useEffect, useState } from 'react';
import { presenceEngine } from '../core/PresenceBridge';
import type { PresenceState } from '../../engine/presence/PresenceTypes';
/** شاشة قراءة فقط؛ دورة الحياة يملكها BootstrapCoordinator. */
export function usePresence() {
  const [state, setState] = useState<PresenceState | null>(() => presenceEngine.getSnapshot());
  useEffect(() => presenceEngine.subscribe(setState), []);
  return { state, engine: presenceEngine };
}
export default usePresence;
