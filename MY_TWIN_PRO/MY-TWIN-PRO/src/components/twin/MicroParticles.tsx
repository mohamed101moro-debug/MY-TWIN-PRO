// @ts-nocheck
/** MicroParticles v3.1 — حقل واحد فعّال: تمايز حركي عاطفي + إبطاء تركيز + فئة أداء perf + فواصل سليمة */
import React from 'react';
import { Path, BlurMask, Group } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
const sf = (n: number, fb = 0) => { 'worklet'; return Number.isFinite(n) ? n : fb; };
const cl = (n: number, a = 0, b = 1) => { 'worklet'; const v = Number.isFinite(n) ? n : a; return Math.max(a, Math.min(b, v)); };
const EM: Record<string, { sp: number; rd: number; jt: number }> = {
  happy: { sp: 1.25, rd: 1.15, jt: 0 }, curious: { sp: 1.1, rd: 1.1, jt: 0 },
  thinking: { sp: 0.7, rd: 0.85, jt: 0 }, sad: { sp: 0.5, rd: 0.7, jt: 0 },
  surprised: { sp: 1.4, rd: 1.25, jt: 0.5 }, angry: { sp: 1.5, rd: 0.9, jt: 1 },
  sleepy: { sp: 0.35, rd: 0.6, jt: 0 }, calm: { sp: 1, rd: 1, jt: 0 },
};
export default function MicroParticles({ t, cx, cy, R, energy, anticipate, speed, tiltV, color, emotion = 'calm', calm = 0, perf = 1 }: any) {
  const M = EM[emotion] ?? EM.calm;
  const d = useDerivedValue(() => {
    'worklet';
    const tv = sf(t.value), ev = cl(energy.value), av = cl(anticipate.value);
    const slow = 1 - cl(calm) * 0.5;
    const count = Math.round((80 + ev * 120 + av * 50) * cl(perf, 0.4, 1));
    const orbitR = R * (1.05 + ev * 0.35) * M.rd;
    let out = '';
    for (let i = 0; i < count; i++) {
      const seed = i * 13.271 + (i % 7) * 0.37;
      const life = (tv * (0.04 + (i % 9) * 0.006) * M.sp * slow + seed) % 1;
      const fade = Math.sin(life * Math.PI);
      if (fade < 0.04) continue;
      const angle = seed * 2.618 + tv * (0.015 + (i % 5) * 0.007) * speed.value * (0.5 + ev) * M.sp * slow;
      const r = orbitR * (0.75 + ((i * 37) % 100) / 100 * 0.7) * (0.85 + life * 0.3);
      const sBase = (i % 3 === 0) ? 1.8 : (i % 3 === 1) ? 1.1 : 0.6;
      const s = Math.max(0.3, sBase * (0.3 + (((i * 13) % 10) / 10) * (0.5 + av)) * fade);
      const jx = M.jt * Math.sin(tv * 7 + seed) * 3;
      const jy = M.jt * Math.cos(tv * 6 + seed) * 3;
      const px = sf(cx + Math.cos(angle) * r + jx, cx);
      const py = sf(cy + Math.sin(angle) * r * (tiltV.value * 0.85 + 0.15) + jy, cy);
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
