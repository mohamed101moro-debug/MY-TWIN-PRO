// @ts-nocheck
/** OrganicMembrane v2.1 — وجه بيضاوي 7 أغشية + Fill + bp (طور مُزاح) + فواصل مسارات سليمة */
import React from 'react';
import { Path } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
const sf = (n: number, fb = 0) => { 'worklet'; return Number.isFinite(n) ? n : fb; };
const cl = (n: number, a = 0, b = 1) => { 'worklet'; const v = Number.isFinite(n) ? n : a; return Math.max(a, Math.min(b, v)); };
const organic = (x: number, y: number, t: number) => { 'worklet';
  return Math.sin(x * 7.3 + y * 1.3 + t * 0.3) * 0.5 + Math.sin(x * 13.7 - y * 0.7 + t * 0.17) * 0.3 + Math.sin(x * 29.1 + y * 2.1 - t * 0.11) * 0.2; };
const facePoint = (a: number, W: number, H: number) => { 'worklet';
  const s = Math.sin(a), c = Math.cos(a); const chin = s > 0 ? 1 - 0.22 * s * s : 1; return { x: c * W * chin, y: s * H }; };
const membranePath = (cx: number, cy: number, W: number, H: number, scale: number, t: number, bph: number, speed: number, turb: number, breath: number, pulse: number, tilt: number, layer: number): string => {
  'worklet';
  const pts = 64; let d = '';
  const phase = t * speed * (0.8 + layer * 0.13);
  const br = 1 + Math.sin(bph) * 0.022 * breath;
  const pls = Math.max(0, Math.sin(t * 2.4 * pulse)) * 0.018 * pulse;
  const tl = cl(tilt, 0.2, 0.95);
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const fr = facePoint(a, W * scale, H * scale);
    const nn = organic(Math.cos(a) * 1.3, Math.sin(a) * 1.3, phase) * turb * 0.07 * scale * W;
    const wob = Math.sin(a * 3 + phase * 1.6) * turb * 0.05 * scale * W + Math.cos(a * 5 - phase) * turb * 0.03 * scale * W + Math.sin(a * 7 + phase * 0.5) * turb * 0.012 * scale * W;
    const x = cx + fr.x + (fr.x / (W * scale || 1)) * (nn + wob);
    const y = cy + fr.y * tl + (fr.y / (H * scale || 1)) * (nn + wob);
    d += `${i === 0 ? 'M' : 'L'} ${sf(x, cx).toFixed(2)} ${sf(y, cy).toFixed(2)} `;
  }
  return d + 'Z';
};
export default function OrganicMembrane(p: any) {
  const { t, cx, cy, W, H } = p;
  const tr = p.transparency ?? 0;
  const bph = useDerivedValue(() => (p.bp ? p.bp.value : sf(t.value) * 0.65 * p.breath.value));
  const m1 = useDerivedValue(() => membranePath(cx, cy, W, H, 1.00 * p.fieldR.value, sf(t.value), bph.value, 0.90, p.turb.value, p.breath.value, p.pulse.value, p.tiltV.value, 0));
  const m2 = useDerivedValue(() => membranePath(cx, cy, W, H, 1.12 * p.fieldR.value, sf(t.value), bph.value, 0.78, p.turb.value, p.breath.value, p.pulse.value, p.tiltV.value * 0.94, 1));
  const m3 = useDerivedValue(() => membranePath(cx, cy, W, H, 1.26 * p.fieldR.value, sf(t.value), bph.value, 0.66, p.turb.value * 0.88, p.breath.value, p.pulse.value, p.tiltV.value * 0.88, 2));
  const m4 = useDerivedValue(() => membranePath(cx, cy, W, H, 1.42 * p.fieldR.value, sf(t.value), bph.value, 0.55, p.turb.value * 0.76, p.breath.value, p.pulse.value, p.tiltV.value * 0.82, 3));
  const m5 = useDerivedValue(() => membranePath(cx, cy, W, H, 1.60 * p.fieldR.value, sf(t.value), bph.value, 0.45, p.turb.value * 0.64, p.breath.value, p.pulse.value, p.tiltV.value * 0.76, 4));
  const m6 = useDerivedValue(() => membranePath(cx, cy, W, H, 1.78 * p.fieldR.value, sf(t.value), bph.value, 0.36, p.turb.value * 0.52, p.breath.value, p.pulse.value, p.tiltV.value * 0.70, 5));
  const m7 = useDerivedValue(() => membranePath(cx, cy, W, H, 1.96 * p.fieldR.value, sf(t.value), bph.value, 0.28, p.turb.value * 0.40, p.breath.value, p.pulse.value, p.tiltV.value * 0.64, 6));
  const fillInner = useDerivedValue(() => membranePath(cx, cy, W, H, 0.95 * p.fieldR.value, sf(t.value), bph.value, 0.80, p.turb.value * 0.7, p.breath.value, p.pulse.value, p.tiltV.value * 0.96, 0.3));
  const awake = useDerivedValue(() => cl(0.3 + p.awakenV.value * 0.7));
  const clear = useDerivedValue(() => cl(1 - tr * 0.5));
  const o1 = useDerivedValue(() => cl(0.60 + p.energy.value * 0.22) * awake.value * clear.value);
  const o2 = useDerivedValue(() => cl(0.48 + p.energy.value * 0.20) * awake.value * clear.value);
  const o3 = useDerivedValue(() => cl(0.38 + p.energy.value * 0.18) * awake.value * clear.value);
  const o4 = useDerivedValue(() => cl(0.30 + p.energy.value * 0.16) * awake.value * clear.value);
  const o5 = useDerivedValue(() => cl(0.24 + p.energy.value * 0.14) * awake.value * clear.value);
  const o6 = useDerivedValue(() => cl(0.18 + p.energy.value * 0.12) * awake.value * clear.value);
  const o7 = useDerivedValue(() => cl(0.14 + p.energy.value * 0.10) * awake.value * clear.value);
  const fillO = useDerivedValue(() => cl(0.5 + p.energy.value * 0.3) * p.awakenV.value * cl(1 - tr * 0.6));
  return (<>
    <Path path={fillInner} color={p.fill} opacity={fillO} />
    <Path path={m7} style="stroke" strokeWidth={0.55} color={p.colors[6]} opacity={o7} />
    <Path path={m6} style="stroke" strokeWidth={0.65} color={p.colors[5]} opacity={o6} />
    <Path path={m5} style="stroke" strokeWidth={0.8} color={p.colors[4]} opacity={o5} />
    <Path path={m4} style="stroke" strokeWidth={1.0} color={p.colors[3]} opacity={o4} />
    <Path path={m3} style="stroke" strokeWidth={1.2} color={p.colors[2]} opacity={o3} />
    <Path path={m2} style="stroke" strokeWidth={1.45} color={p.colors[1]} opacity={o2} />
    <Path path={m1} style="stroke" strokeWidth={1.7} color={p.colors[0]} opacity={o1} />
  </>);
}
