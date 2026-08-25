// @ts-nocheck
import React from 'react';
import { Path, BlurMask, Group } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
const sf = (n: number, fb = 0) => { 'worklet'; return Number.isFinite(n) ? n : fb; };
const cl = (n: number, a = 0, b = 1) => { 'worklet'; const v = Number.isFinite(n) ? n : a; return Math.max(a, Math.min(b, v)); };
/** MicroParticles v3 (Skia) — 80-250 جسيمًا متكيفًا (طاقة/ترقب/سرعة) */
export default function MicroParticles({ t, cx, cy, R, energy, anticipate, speed, tiltV, color }: any) {
  const d = useDerivedValue(() => {
    'worklet';
    const tv = sf(t.value), ev = cl(energy.value), av = cl(anticipate.value);
    const count = Math.round(80 + ev * 120 + av * 50);
    const orbitR = R * (1.05 + ev * 0.35);
    let out = '';
    for (let i = 0; i < count; i++) {
      const seed = i * 13.271 + (i % 7) * 0.37;
      const life = (tv * (0.04 + (i % 9) * 0.006) + seed) % 1;
      const fade = Math.sin(life * Math.PI);
      if (fade < 0.04) continue;
      const angle = seed * 2.618 + tv * (0.015 + (i % 5) * 0.007) * speed.value * (0.5 + ev);
      const r = orbitR * (0.75 + ((i * 37) % 100) / 100 * 0.7) * (0.85 + life * 0.3);
      const sBase = (i % 3 === 0) ? 1.8 : (i % 3 === 1) ? 1.1 : 0.6;
      const s = Math.max(0.3, sBase * (0.3 + (((i * 13) % 10) / 10) * (0.5 + av)) * fade);
      const px = sf(cx + Math.cos(angle) * r, cx);
      const py = sf(cy + Math.sin(angle) * r * (tiltV.value * 0.85 + 0.15), cy);
      out += `M ${px.toFixed(1)} ${py.toFixed(1)} l ${s.toFixed(1)} ${(s * 0.4).toFixed(1)} `;
    }
    return out || 'M 0 0';
  });
  const o = useDerivedValue(() => cl(0.35 + energy.value * 0.3));
  return (
    <Group>
      <Path path={d} style="stroke" strokeWidth={1.3} strokeCap="round" color={color} opacity={o} />
      <BlurMask blur={1.2} style="normal" respectCTM />
    </Group>
  );
}
