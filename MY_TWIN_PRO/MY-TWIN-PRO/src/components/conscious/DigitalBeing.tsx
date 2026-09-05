// @ts-nocheck
/** DigitalBeing v7.0 — عارض VisualState نقي: لا قرارات هنا، فقط رسم (المواصفات 22-24) */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Circle, Path, RadialGradient, vec, BlurMask, Group } from '@shopify/react-native-skia';
import { useSharedValue, useFrameCallback, useDerivedValue, withTiming, cancelAnimation, Easing } from 'react-native-reanimated';
import type { VisualState } from '../../../engine/presence/VisualState';
import { useBreathAnimation } from '../../hooks/useBreathAnimation';
import AdaptiveHalo from '../twin/AdaptiveHalo';
import EmotionalAura from '../twin/EmotionalAura';
import OrganicMembrane from '../twin/OrganicMembrane';
import EnergyCore from '../twin/EnergyCore';
import MicroParticles from '../twin/MicroParticles';
import ExpressiveEyes from '../twin/ExpressiveEyes';
const sf = (n: number, fb = 0) => { 'worklet'; return Number.isFinite(n) ? n : fb; };
const cl = (n: number, a = 0, b = 1) => { 'worklet'; const v = Number.isFinite(n) ? n : a; return Math.max(a, Math.min(b, v)); };
const hexA = (hex: string, a: number): string => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec(String(hex || '').slice(0, 7));
  const r = m ? parseInt(m[1], 16) : 155, g = m ? parseInt(m[2], 16) : 111, b = m ? parseInt(m[3], 16) : 255;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
};
const mouthPath = (mx: number, my: number, Wd: number, curve: number, open: number): string => {
  'worklet';
  const dy = curve * Wd * 0.5;
  return `M ${mx - Wd} ${my} Q ${mx} ${my + dy + open * Wd * 0.5} ${mx + Wd} ${my}`;
};
const STARS = [[0.18, 0.12], [0.82, 0.2], [0.7, 0.08], [0.1, 0.55], [0.9, 0.62], [0.3, 0.85]];
export default function DigitalBeing({ vs, size = 360, isDark = true }: { vs: VisualState; size?: number; isDark?: boolean }) {
  const cx = size / 2, cy = size / 2, R = size * 0.32;
  const W = R * 0.8, H = R * 0.98;
  const eyeCy = cy - H * 0.18, sep = W * 0.62, eyeSize = W * 0.42;
  const al = isDark ? 1 : 0.8;
  const C = useMemo(() => ({
    core0: hexA(vs.colorA, (isDark ? 0.95 : 0.8) * al), core1: hexA(vs.colorB, (isDark ? 0.55 : 0.4) * al), core2: hexA(vs.colorA, 0),
    halo0: hexA(vs.colorA, (isDark ? 0.42 : 0.3) * al), halo1: hexA(vs.colorB, (isDark ? 0.22 : 0.15) * al),
    neb: hexA(vs.colorA, 0.1), fill: hexA(vs.colorA, (isDark ? 0.06 : 0.04) * al),
    m1: hexA(vs.colorB, (isDark ? 0.72 : 0.55) * al), m2: hexA(vs.colorA, (isDark ? 0.58 : 0.44) * al),
    m3: hexA(vs.colorB, (isDark ? 0.48 : 0.36) * al), m4: hexA(vs.colorA, (isDark ? 0.38 : 0.28) * al),
    m5: hexA(vs.colorB, (isDark ? 0.3 : 0.22) * al), m6: hexA(vs.colorA, (isDark ? 0.22 : 0.16) * al), m7: hexA(vs.colorB, (isDark ? 0.16 : 0.11) * al),
    sweep0: hexA(vs.colorB, 0.24 * al), sweep1: hexA(vs.colorA, 0.24 * al),
    particle: hexA(vs.colorB, (isDark ? 0.55 : 0.35) * al),
    eyeFill: isDark ? '#E8DEFF' : '#F0EAFF', eyeStroke: hexA(vs.colorB, (isDark ? 0.88 : 0.7) * al), brow: hexA(vs.colorA, 0.55 * al),
    voiceC: hexA(vs.colorB, 0.3 * al), listenC: hexA(vs.colorA, 0.24 * al), outer: hexA(vs.colorA, 0.14 * al),
    mouth: '#E6D9FF',
  }), [vs.colorA, vs.colorB, isDark]);
  const t = useSharedValue(0);
  const energy = useSharedValue(cl(vs.energy));
  const speed = useSharedValue(cl(vs.particleSpeed, 0.05, 2));
  const turb = useSharedValue(cl(vs.turbulence));
  const tiltV = useSharedValue(cl(vs.orbitality, 0.2, 0.95));
  const fieldR = useSharedValue(cl(vs.fieldRadius, 0.5, 1.7));
  const breath = useSharedValue(cl(vs.breathing));
  const pulse = useSharedValue(cl(vs.pulse));
  const eyeOpen = useSharedValue(cl(vs.eyeOpenness, 0.05, 1.2));
  const eyeGlowV = useSharedValue(cl(vs.eyeGlow));
  const pupilV = useSharedValue(cl(vs.pupilSize));
  const gazeX = useSharedValue(cl(vs.gazeX, -1, 1));
  const gazeY = useSharedValue(cl(vs.gazeY, -1, 1));
  const warmth = useSharedValue(cl(vs.warmth ?? 0.35));
  const attn = useSharedValue(cl(vs.attention ?? 0.5));
  const ant = useSharedValue(cl(vs.anticipation ?? 0.25));
  const voice = useSharedValue(cl(vs.voiceLevel));
  const awakenV = useSharedValue(cl(vs.awaken));
  const conv = useSharedValue(0);
  useFrameCallback((f) => { 'worklet'; t.value = sf(f.timeSinceFirstFrame, 0) / 1000; });
  useEffect(() => () => { cancelAnimation(t); }, []);
  const DUR = { duration: 550, easing: Easing.out(Easing.cubic) };
  const FAST = { duration: 200 };
  useEffect(() => {
    energy.value = withTiming(cl(vs.energy), DUR);
    speed.value = withTiming(cl(vs.particleSpeed, 0.05, 2), DUR);
    turb.value = withTiming(cl(vs.turbulence), DUR);
    tiltV.value = withTiming(cl(vs.orbitality, 0.2, 0.95), DUR);
    fieldR.value = withTiming(cl(vs.fieldRadius, 0.5, 1.7), DUR);
    breath.value = withTiming(cl(vs.breathing), DUR);
    pulse.value = withTiming(cl(vs.pulse), DUR);
    eyeOpen.value = withTiming(cl(vs.eyeOpenness, 0.05, 1.2), FAST);
    eyeGlowV.value = withTiming(cl(vs.eyeGlow), FAST);
    pupilV.value = withTiming(cl(vs.pupilSize), FAST);
    gazeX.value = withTiming(cl(vs.gazeX, -1, 1), { duration: 280 });
    gazeY.value = withTiming(cl(vs.gazeY, -1, 1), { duration: 280 });
    warmth.value = withTiming(cl(vs.warmth ?? 0.35), DUR);
    attn.value = withTiming(cl(vs.attention ?? 0.5), DUR);
    ant.value = withTiming(cl(vs.anticipation ?? 0.25), DUR);
    voice.value = withTiming(cl(vs.voiceLevel), FAST);
    awakenV.value = withTiming(cl(vs.awaken), { duration: 900, easing: Easing.out(Easing.cubic) });
    conv.value = withTiming(vs.convState === 'processing' ? 1 : vs.convState === 'understanding' ? 0.7 : vs.convState === 'responding' ? 0.8 : vs.convState === 'listening' ? 0.3 : 0, DUR);
  }, [vs]);
  const bpM = useBreathAnimation(3200);
  const bpH = useDerivedValue(() => bpM.value - 0.7);
  const bpC = useDerivedValue(() => bpM.value - 1.2);
  const calm = (vs.convState === 'processing' || vs.emotion === 'sleepy' || vs.emotion === 'thinking') ? 0.35 : 0;
  const mouth = useDerivedValue(() => mouthPath(cx, cy + H * 0.55, W * 0.34, vs.mouthCurve, vs.speaking ? Math.abs(Math.sin(sf(t.value) * 7)) * 0.5 : 0));
  const mouthO = useDerivedValue(() => cl(0.45 + voice.value * 0.4) * cl(0.2 + awakenV.value * 0.8));
  const discO = useDerivedValue(() => 0.94 * awakenV.value);
  const listenOn = !!vs.listening;
  return (
    <View accessible accessibilityLabel={`MyTwin: ${vs.emotion}`} style={[styles.wrap, { width: size, height: size }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle cx={cx} cy={cy} r={R * 2.6} color={isDark ? '#070310' : '#00000000'} opacity={discO} />
        <Circle cx={cx} cy={cy} r={R * 2.4} opacity={0.5}>
          <RadialGradient c={vec(cx, cy)} r={R * 2.4} colors={[C.neb, '#00000000']} />
        </Circle>
        {STARS.map((s, i) => <Circle key={i} cx={size * s[0]} cy={size * s[1]} r={i % 2 ? 1 : 1.4} color="#B8A0FF" opacity={0.16 * (isDark ? 1 : 0.5)} />)}
        <AdaptiveHalo t={t} cx={cx} cy={cy} R={R} spread={vs.fieldRadius} energy={energy} attn={attn} anticipate={ant} voice={voice} listenOn={listenOn}
          halo0={C.halo0} halo1={C.halo1} sweep0={C.sweep0} sweep1={C.sweep1} listenC={C.listenC} voiceC={C.voiceC} outer={C.outer} />
        <MicroParticles t={t} cx={cx} cy={cy} R={R} energy={energy} anticipate={ant} speed={speed} tiltV={tiltV} color={C.particle} emotion={vs.emotion} calm={calm} perf={1} />
        <OrganicMembrane t={t} cx={cx} cy={cy} W={W} H={H} energy={energy} turb={turb} breath={breath} pulse={pulse} tiltV={tiltV} fieldR={fieldR} awakenV={awakenV} bp={bpM}
          transparency={vs.ambientLight > 0.8 ? 0.25 : 0} colors={[C.m1, C.m2, C.m3, C.m4, C.m5, C.m6, C.m7]} fill={C.fill} />
        <EmotionalAura t={t} cx={cx} cy={cy} R={R} warmth={warmth} attn={attn} energy={energy} pulse={pulse} auraI={vs.auraIntensity} bp={bpH} halo0={C.halo0} halo1={C.halo1} />
        <EnergyCore t={t} cx={cx} cy={cy} R={R} H={H} energy={energy} warmth={warmth} breath={breath} pulse={pulse} awakenV={awakenV} conv={conv} bp={bpC} core0={C.core0} core1={C.core1} core2={C.core2} />
        <ExpressiveEyes t={t} cx={cx} cy={eyeCy} sep={sep} eyeSize={eyeSize} eyeOpen={eyeOpen} eyeGlow={eyeGlowV} pupil={pupilV} gazeX={gazeX} gazeY={gazeY} awaken={awakenV}
          emotion={vs.emotion} browRaise={vs.browRaise} tearOpacity={vs.tearOpacity} squint={vs.squint}
          thinkingMul={vs.thinkingMul} envLight={vs.ambientLight}
          colors={{ eyeFill: C.eyeFill, eyeStroke: C.eyeStroke, brow: C.brow, irisA: vs.irisA, irisB: vs.irisB }} />
        <Path path={mouth} style="stroke" strokeWidth={1.6} strokeCap="round" color={C.mouth} opacity={mouthO} />
      </Canvas>
    </View>
  );
}
const styles = StyleSheet.create({ wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' } });
