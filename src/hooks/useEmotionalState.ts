import { useEffect, useState } from 'react';
import { stateBus } from '../core/StateBus';
import { valenceToEmotion } from '../../engine/presence/EmotionToVisualMapper';
/**
 * useEmotionalState v2.4 — نفس عقد v2.3 + subscribeKeys بدل الاستطلاع (Low: أداء)
 */
export interface EmotionView {
  valence: 'positive' | 'negative' | 'neutral';
  valenceNumber: number;
  intensity: number;
  primaryEmotion: string;
  arousal: number;
  focus: number;
  curiosity: number;
  key: string;
  emotion: EmotionView;
  emotionalState: EmotionView;
}
function buildView(v: number, a: number, f: number, cur: number, primary: string): EmotionView {
  const key = valenceToEmotion(v, a, f, false);
  const view: any = {
    valence: v > 0.15 ? 'positive' : v < -0.15 ? 'negative' : 'neutral',
    valenceNumber: v, intensity: a, primaryEmotion: primary || key,
    arousal: a, focus: f, curiosity: cur, key,
  };
  view.emotion = view; view.emotionalState = view;
  return view as EmotionView;
}
export function useEmotionalState(): EmotionView {
  const [view, setView] = useState<EmotionView>(() => buildView(0, 0.3, 0.5, 0.45, 'calm'));
  useEffect(() => {
    const read = () => {
      const st: any = stateBus.getState();
      const v = Number(st.emotionValence ?? 0);
      const a = Number(st.arousal ?? st.emotion?.intensity ?? 0.3);
      const f = Number(st.focus ?? 0.5);
      setView(buildView(v, a, f, Number(st.curiosity ?? 0.45), String(st.emotion?.primaryEmotion ?? '')));
    };
    read();
    return stateBus.subscribeKeys(['emotionValence', 'arousal', 'focus', 'curiosity', 'emotion'], read);
  }, []);
  return view;
}
export default useEmotionalState;
