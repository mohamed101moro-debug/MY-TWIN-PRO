/**
 * usePresence — Hook موحد لقراءة حالة الحضور
 * ==============================================
 * يقرأ presenceLevel و interfaceState من StateBus الجديد.
 * يستخدمه كل Renderer يحتاج معرفة حالة التوأم.
 */

import { useEffect, useState } from 'react';
import { StateBus, InterfaceState } from '../core/StateBus';

interface PresenceInfo {
  presenceLevel: number;
  interfaceState: InterfaceState;
  isPresent: boolean;
  isActive: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  isDormant: boolean;
}

export function usePresence(): PresenceInfo {
  const [info, setInfo] = useState<PresenceInfo>(() => {
    const s = StateBus.getState();
    return buildInfo(s.presenceLevel, s.interfaceState);
  });

  useEffect(() => {
    const unsub = StateBus.subscribeTo(
      (s) => ({ presenceLevel: s.presenceLevel, interfaceState: s.interfaceState }),
      (value) => {
        setInfo(buildInfo(value.presenceLevel, value.interfaceState));
      }
    );
    return unsub;
  }, []);

  return info;
}

function buildInfo(level: number, state: InterfaceState): PresenceInfo {
  return {
    presenceLevel: level,
    interfaceState: state,
    isPresent: level > 0,
    isActive: level >= 3,
    isSpeaking: state === 'speaking',
    isThinking: state === 'thinking',
    isDormant: level === 0,
  };
}
