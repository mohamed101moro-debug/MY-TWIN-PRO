// @ts-nocheck
/** EnergyCore v3.2 — + conv (تسارع النبض) + bp (طور مُزاح) */
import React from 'react';
import { Circle, RadialGradient, vec, BlurMask, Group } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
const sf = (n: number, fb = 0) => { 'worklet'; return Number.isFinite(n) ? n : fb; };
const cl = (n: number, a = 0, b = 1) => { 'worklet'; const v = Number.isFinite(n) ? n : a; return Math.max(a, Math.min(b, v)); };
export default function EnergyCore({ t, cx, cy, R, H, energy, warmth, breath, pulse, awakenV, conv, bp, core0, core1, core2 }: any) {
  const cv = useDerivedValue(() => cl(conv ? conv.value : 0));
  const bph = useDerivedValue(() => (bp ? bp.value : sf(t.value) * 0.65 * (1 + breath.value)));
  const coreR = useDerivedValue(() => sf(R * 0.52 * (1 + Math.sin(bph.value) * 0.04 * breath.value + Math.max(0, Math.sin(sf(t.value) * 2.8 * (1 + pulse.value) * (1 + cv.value * 0.9))) * 0.035 * pulse.value + energy.value * 0.06 + cv.value * 0.05), R * 0.52));
  const innerR = useDerivedValue(() => sf(coreR.value * 0.55, R * 0.28));
  const specR = useDerivedValue(() => sf(coreR.value * 0.22, R * 0.11));
  const cyC = cy + H * 0.42;
  return (<>
    <Group>
      <Circle cx={cx} cy={cyC} r={coreR} opacity={useDerivedValue(() => cl(0.82 + energy.value * 0.16 + cv.value * 0.12))}>
        <RadialGradient c={vec(cx, cyC)} r={R * 0.72} colors={[core0, core1, core2]} />
      </Circle>
      <BlurMask blur={6} style="solid" respectCTM />
    </Group>
    <Group>
      <Circle cx={cx} cy={cyC} r={innerR} opacity={useDerivedValue(() => cl(0.6 + energy.value * 0.38 + warmth.value * 0.12 + cv.value * 0.1))}>
        <RadialGradient c={vec(cx, cyC)} r={R * 0.35} colors={['#FFFFFF66', core0, core2]} />
      </Circle>
      <BlurMask blur={5} style="solid" respectCTM />
    </Group>
    <Circle cx={cx - R * 0.12} cy={cy - R * 0.18} r={specR} opacity={useDerivedValue(() => cl(0.55 + energy.value * 0.35) * awakenV.value)} color="#FFFFFF" />
  </>);
}
