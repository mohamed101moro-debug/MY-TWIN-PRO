import { useEffect, useState } from 'react';
import { presenceEngine } from '../core/PresenceBridge';
import type { PresenceState } from '../../engine/presence/PresenceTypes';
/**
 * usePresence v2 — اشتراك حي في محرك الحضور (المصدر الوحيد)
 * - start() عند التركيب + subscribe يعيد unsubscribe ⇒ تنظيف مضمون.
 * - لقطة فورية عند الاشتراك (محرك v2) ⇒ لا إطار فارغ عند الولادة.
 */
export function usePresence() {
  const [state, setState] = useState<PresenceState | null>(() => presenceEngine.getSnapshot());
  useEffect(() => {
    presenceEngine.start();
    return presenceEngine.subscribe(setState);
  }, []);
  return { state, engine: presenceEngine };
}
export default usePresence;
