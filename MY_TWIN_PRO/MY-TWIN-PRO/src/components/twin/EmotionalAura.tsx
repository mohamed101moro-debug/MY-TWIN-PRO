// @ts-nocheck
import React from 'react';
import { Circle, RadialGradient, vec, BlurMask, Group } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
const cl = (n: number, a = 0, b = 1) => { 'worklet'; const v = Number.isFinite(n) ? n : a; return Math.max(a, Math.min(b, v)); };
/** EmotionalAura v3 (Skia) — المجال العاطفي المتوهج */
export default function EmotionalAura({ t, cx, cy, R, warmth, attn, energy, halo0, halo1 }: any) {
  const o = useDerivedValue(() => cl(0.22 + warmth.value * 0.28 + attn.value * 0.15));
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={R * 1.08} opacity={o}>
        <RadialGradient c={vec(cx, cy)} r={R * 1.08} colors={[halo0, halo1, halo0 + '00']} />
      </Circle>
      <BlurMask blur={12} style="solid" respectCTM />
    </Group>
  );
}
