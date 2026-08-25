import { useEffect, useState } from 'react';
import { presenceEngine } from '../core/PresenceBridge';
import type { PresenceState } from '../../engine/presence/PresenceTypes';
/**
 * useEntityState v2 — عرض سلوكي موحّد للحضور
 * - presenceToEntity: تطبيع رقمي آمن (كل حقل Number/!! مع fallback) ⇒ لا NaN يتسرب للطبقات.
 * - Hook يشترك في المحرك ويعيد unsubscribe ⇒ تنظيف مضمون.
 */
export function presenceToEntity(pres: PresenceState | null) {
  const p: any = pres || {};
  return {
    emotion: String(p.emotion ?? 'calm'),
    energy: Number(p.energy ?? 0.55),
    speaking: !!p.speaking,
    listening: !!p.listening,
    thinking: !!p.thinking,
    eyeOpenness: Number(p.eyeOpenness ?? 0.85),
    eyeGlow: Number(p.eyeGlow ?? 0.88),
    pupilSize: Number(p.pupilSize ?? 0.42),
    gazeX: Number(p.gazeX ?? 0),
    gazeY: Number(p.gazeY ?? 0),
    warmth: Number(p.warmth ?? 0.35),
    colorA: p.colorA, colorB: p.colorB, eyeColor: p.eyeColor,
  };
}
export type EntityState = ReturnType<typeof presenceToEntity>;
export function useEntityState(): { state: EntityState } {
  const [state, setState] = useState<EntityState>(() => presenceToEntity(presenceEngine.getSnapshot()));
  useEffect(() => {
    presenceEngine.start();
    return presenceEngine.subscribe((s) => setState(presenceToEntity(s)));
  }, []);
  return { state };
}
export default useEntityState;
