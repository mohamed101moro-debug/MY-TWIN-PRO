// @ts-nocheck
/** EmotionalAura v3.1 — مجال عاطفي: نصف قطر/نبض/شدة مشتقة (auraI/pulse) + طور مُزاح bp */
import React from 'react';
import { Circle, RadialGradient, vec, BlurMask, Group } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
const cl = (n: number, a = 0, b = 1) => { 'worklet'; const v = Number.isFinite(n) ? n : a; return Math.max(a, Math.min(b, v)); };
export default function EmotionalAura({ t, cx, cy, R, warmth, attn, energy, pulse, auraI = 0.5, bp, halo0, halo1 }: any) {
  const ai = cl(auraI);
  const rr = useDerivedValue(() => R * (1.02 + ai * 0.25 + Math.sin(bp ? bp.value : t.value * 1.2 * (0.6 + ai)) * 0.03));
  const o = useDerivedValue(() => cl(0.22 + warmth.value * 0.28 + attn.value * 0.15 + (pulse ? pulse.value : 0) * 0.08 * ai));
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={rr} opacity={o}>
        <RadialGradient c={vec(cx, cy)} r={rr} colors={[halo0, halo1, halo0 + '00']} />
      </Circle>
      <BlurMask blur={12} style="solid" respectCTM />
    </Group>
  );
}
