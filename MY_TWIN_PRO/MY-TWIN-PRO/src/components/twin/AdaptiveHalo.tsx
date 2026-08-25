// @ts-nocheck
/** AdaptiveHalo v3.1 — هالة متكيفة: تمدد من fieldRadius (المحرك) + حلقتا إصغاء/صوت + دوران كوني */
import React from 'react';
import { Circle, RadialGradient, SweepGradient, vec, BlurMask, Group } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
const cl = (n: number, a = 0, b = 1) => { 'worklet'; const v = Number.isFinite(n) ? n : a; return Math.max(a, Math.min(b, v)); };
export default function AdaptiveHalo({ t, cx, cy, R, spread, energy, attn, anticipate, voice, listenOn, halo0, halo1, sweep0, sweep1, listenC, voiceC, outer }: any) {
  const sp = cl(spread ?? 1, 0.8, 1.4);
  const haloO = useDerivedValue(() => cl(0.14 + energy.value * 0.12));
  const sweepO = useDerivedValue(() => cl(attn.value * 0.18 + anticipate.value * 0.12));
  const listenO = useDerivedValue(() => cl(listenOn ? 0.32 : 0.05));
  const voiceO = useDerivedValue(() => cl(0.04 + voice.value * 0.38));
  const voiceR = useDerivedValue(() => R * sp * (1.55 + voice.value * 0.3 + Math.sin(t.value * 1.4) * 0.025));
  const listenR = useDerivedValue(() => R * sp * (1.38 + (listenOn ? 0.12 : 0) + Math.sin(t.value * 0.9) * 0.02));
  return (
    <>
      <Group>
        <Circle cx={cx} cy={cy} r={useDerivedValue(() => R * 2.1 * sp)} opacity={haloO}>
          <RadialGradient c={vec(cx, cy)} r={R * 2.1} colors={[halo0, halo1, halo0 + '00']} />
        </Circle>
        <BlurMask blur={18} style="normal" respectCTM />
      </Group>
      <Circle cx={cx} cy={cy} r={useDerivedValue(() => R * 1.45 * sp)} style="stroke" strokeWidth={1.1} opacity={sweepO}>
        <SweepGradient c={vec(cx, cy)} colors={[sweep0, '#FFFFFF08', sweep1, '#FFFFFF08', sweep0]} />
      </Circle>
      <Circle cx={cx} cy={cy} r={listenR} style="stroke" strokeWidth={0.7} color={listenC} opacity={listenO} />
      <Circle cx={cx} cy={cy} r={voiceR} style="stroke" strokeWidth={0.75} color={voiceC} opacity={voiceO} />
      <Circle cx={cx} cy={cy} r={R * 2.05 * sp} style="stroke" strokeWidth={0.5} color={outer} opacity={0.9} />
    </>
  );
}
