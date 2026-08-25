// @ts-nocheck
/**
 * DigitalBeing v6.2 — Orchestrator/Composition Root
 * ==================================================
 * يركّب الطبقات الست المكوّناتية (لا منطق مكرر) + قرص كوزمي + فم ناطق.
 * مصدر الحقيقة واحد: PresenceState (من المحرك) ⇒ SharedValues ⇒ كل الطبقات.
 * كل المساعدات 'worklet' (إصلاح جذر الكراش التاريخي).
 * perf tier: بطارية/شاشة ⇒ عدد جسيمات متكيف (لا تضحية بالاستقرار).
 * العقد الخارجي محفوظ حرفيًا (presence/size/isDark/env/maturity/userNear/awaken).
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Canvas, Circle, Path, RadialGradient, vec } from '@shopify/react-native-skia';
import { useSharedValue, useFrameCallback, useDerivedValue, withTiming, cancelAnimation, Easing } from 'react-native-reanimated';
import type { PresenceState, RGB } from '../../../engine/presence/PresenceTypes';
import { getProfile } from '../../../engine/presence/EmotionToVisualMapper';
import { devicePresenceEngine } from '../../../engine/device/DevicePresenceEngine';
import AdaptiveHalo from '../twin/AdaptiveHalo';
import EmotionalAura from '../twin/EmotionalAura';
import OrganicMembrane from '../twin/OrganicMembrane';
import EnergyCore from '../twin/EnergyCore';
import MicroParticles from '../twin/MicroParticles';
import ExpressiveEyes from '../twin/ExpressiveEyes';

const sf = (n: number, fb = 0) => { 'worklet'; return Number.isFinite(n) ? n : fb; };
const cl = (n: number, a = 0, b = 1) => { 'worklet'; const v = Number.isFinite(n) ? n : a; return Math.max(a, Math.min(b, v)); };
const rgba = (c: RGB, a = 1, mul = 1) =>
  `rgba(${Math.round(cl(c.r, 0, 255) * mul)},${Math.round(cl(c.g, 0, 255) * mul)},${Math.round(cl(c.b, 0, 255) * mul)},${cl(a).toFixed(3)})`;
const mouthPath = (mx: number, my: number, Wd: number, curve: number, open: number): string => {
  'worklet';
  const dy = curve * Wd * 0.5;
  return `M ${mx - Wd} ${my} Q ${mx} ${my + dy + open * Wd * 0.5} ${mx + Wd} ${my}`;
};
export interface BeingEnv { light?: number; noise?: number; motion?: number; listening?: boolean; camera?: boolean; userNear?: boolean; }

export default function DigitalBeing({ presence, size = 360, isDark = true, env, maturity = 0.8, userNear, awaken = 1 }: {
  presence: PresenceState; size?: number; isDark?: boolean; env?: BeingEnv; maturity?: number; userNear?: boolean; awaken?: number;
}) {
  const cx = size / 2, cy = size / 2, R = size * 0.32;
  const W = R * 0.80, H = R * 0.98;
  const eyeCy = cy - H * 0.18, sep = W * 0.62, eyeSize = W * 0.42;
  const A = presence?.colorA ?? { r: 155, g: 111, b: 255 };
  const B = presence?.colorB ?? { r: 70, g: 139, b: 255 };
  const E = presence?.eyeColor ?? { r: 232, g: 222, b: 255 };
  const prof = getProfile(String(presence?.emotion ?? 'calm'));

  // perf tier (مرة واحدة): بطارية منخفضة/شاشة صغيرة ⇒ جسيمات أقل
  const perf = useMemo(() => {
    try {
      const b = devicePresenceEngine.getSensors().deviceBattery ?? 100;
      const w = Dimensions.get('window').width;
      return b < 25 || w < 400 ? 0.5 : b < 60 ? 0.8 : 1;
    } catch { return 0.8; }
  }, []);

  const t = useSharedValue(0);
  const energy = useSharedValue(cl(presence?.energy ?? 0.55));
  const speed = useSharedValue(cl(presence?.fieldSpeed ?? 0.4, 0.05, 2));
  const turb = useSharedValue(cl(presence?.turbulence ?? 0.18));
  const tiltV = useSharedValue(cl(presence?.orbitality ?? 0.68, 0.2, 0.95));
  const fieldR = useSharedValue(cl(presence?.fieldRadius ?? 1, 0.5, 1.6));
  const breath = useSharedValue(cl(presence?.breathing ?? 0.4));
  const pulse = useSharedValue(cl(presence?.pulse ?? 0.4));
  const eyeOpen = useSharedValue(cl(presence?.eyeOpenness ?? 0.85));
  const eyeGlow = useSharedValue(cl(presence?.eyeGlow ?? 0.88));
  const pupil = useSharedValue(cl(presence?.pupilSize ?? 0.42));
  const gazeX = useSharedValue(cl(presence?.gazeX ?? 0, -1, 1));
  const gazeY = useSharedValue(cl(presence?.gazeY ?? 0, -1, 1));
  const warmth = useSharedValue(cl(presence?.warmth ?? 0.35));
  const attn = useSharedValue(cl(presence?.attention ?? 0.5));
  const anticipate = useSharedValue(cl(presence?.anticipation ?? 0.25));
  const voice = useSharedValue(cl(presence?.voiceLevel ?? 0));
  const awakenV = useSharedValue(cl(awaken));
  const conv = useSharedValue(0);
  useFrameCallback((f) => { 'worklet'; t.value = sf(f.timeSinceFirstFrame, 0) / 1000; });
  useEffect(() => () => { cancelAnimation(t); cancelAnimation(energy); }, []);

  const DUR = { duration: 600, easing: Easing.out(Easing.cubic) };
  const FAST = { duration: 220 };
  useEffect(() => {
    if (!presence) return;
    energy.value = withTiming(cl(presence.energy ?? 0.55), DUR);
    speed.value = withTiming(cl(presence.fieldSpeed ?? 0.4, 0.05, 2) * (presence.speaking ? 1.3 : presence.thinking ? 0.5 : 1), DUR);
    turb.value = withTiming(cl((presence.turbulence ?? 0.18) + (env?.noise ?? 0) * 0.2 + (env?.motion ?? 0) * 0.12), DUR);
    tiltV.value = withTiming(cl(presence.orbitality ?? 0.68, 0.2, 0.95), DUR);
    fieldR.value = withTiming(cl((presence.fieldRadius ?? 1) + ((env?.userNear || userNear) ? 0.07 : 0) + maturity * 0.03, 0.5, 1.7), DUR);
    breath.value = withTiming(cl(presence.breathing ?? 0.4), DUR);
    pulse.value = withTiming(cl(presence.pulse ?? 0.4), DUR);
    eyeOpen.value = withTiming(cl(presence.eyeOpenness ?? 0.85), FAST);
    eyeGlow.value = withTiming(cl(presence.eyeGlow ?? 0.88), FAST);
    pupil.value = withTiming(cl((presence.pupilSize ?? 0.42) + (1 - (env?.light ?? 0.5)) * 0.2), FAST);
    gazeX.value = withTiming(cl(env?.camera ? 0 : (presence.gazeX ?? 0), -1, 1), { duration: 280 });
    gazeY.value = withTiming(cl(env?.camera ? 0 : (presence.gazeY ?? 0), -1, 1), { duration: 280 });
    warmth.value = withTiming(cl(presence.warmth ?? 0.35), DUR);
    attn.value = withTiming(cl((presence.attention ?? 0.5) + ((env?.userNear || userNear) ? 0.15 : 0)), DUR);
    anticipate.value = withTiming(cl(presence.anticipation ?? 0.25), DUR);
    voice.value = withTiming(cl(presence.voiceLevel ?? 0), FAST);
    const cv = presence.conversationState === 'processing' ? 1 : presence.conversationState === 'understanding' ? 0.7 : presence.conversationState === 'responding' ? 0.8 : presence.conversationState === 'listening' ? 0.3 : 0;
    conv.value = withTiming(cv, DUR);
  }, [presence, env, userNear]);
  useEffect(() => { awakenV.value = withTiming(cl(awaken), { duration: 900, easing: Easing.out(Easing.cubic) }); }, [awaken]);

  const mouth = useDerivedValue(() => mouthPath(cx, cy + H * 0.55, W * 0.34, prof.mouthCurve, presence?.speaking ? Math.abs(Math.sin(sf(t.value) * 7)) * 0.5 : 0));
  const mouthO = useDerivedValue(() => cl(0.45 + voice.value * 0.4) * cl(0.2 + awakenV.value * 0.8));
  const discO = useDerivedValue(() => 0.94 * awakenV.value);

  const mul = isDark ? 1 : 0.78;
  const C = {
    core0: rgba(A, isDark ? 0.95 : 0.82, mul), core1: rgba(B, isDark ? 0.55 : 0.42, mul), core2: rgba(A, 0, mul),
    halo0: rgba(A, isDark ? 0.42 : 0.32, mul), halo1: rgba(B, isDark ? 0.22 : 0.16, mul),
    fill: rgba(A, isDark ? 0.06 : 0.04, mul),
    m1: rgba(B, isDark ? 0.72 : 0.56, mul), m2: rgba(A, isDark ? 0.58 : 0.44, mul), m3: rgba(B, isDark ? 0.48 : 0.36, mul),
    m4: rgba(A, isDark ? 0.38 : 0.28, mul), m5: rgba(B, isDark ? 0.30 : 0.22, mul), m6: rgba(A, isDark ? 0.22 : 0.16, mul), m7: rgba(B, isDark ? 0.16 : 0.11, mul),
    sweep0: rgba(B, isDark ? 0.28 : 0.18, mul), sweep1: rgba(A, isDark ? 0.28 : 0.18, mul),
    particle: rgba(B, isDark ? 0.55 : 0.35, mul),
    eyeFill: rgba(E, isDark ? 0.95 : 0.88, mul), eyeStroke: rgba(B, isDark ? 0.88 : 0.72, mul), brow: rgba(A, isDark ? 0.55 : 0.42, mul),
    voiceC: rgba(B, isDark ? 0.35 : 0.22, mul), listenC: rgba(A, isDark ? 0.28 : 0.18, mul), outer: rgba(A, isDark ? 0.14 : 0.09, mul),
    irisA: rgba(E, 0.95, mul), irisB: rgba(B, 0.8, mul), mouth: '#E6D9FF',
  };
  const listenOn = !!(env?.listening || presence?.listening);
  const calm = (presence?.conversationState === 'processing' || prof.key === 'sleepy' || prof.key === 'thinking') ? 0.35 : 0;
  const auraI = 0.4 + warmth.value * 0.3 + anticipate.value * 0.3;

  return (
    <View accessible accessibilityLabel={`MyTwin: ${presence?.emotion ?? 'calm'}`} style={[styles.wrap, { width: size, height: size }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle cx={cx} cy={cy} r={R * 2.28} color="#06030F" opacity={discO} />
        <Circle cx={cx} cy={cy} r={R * 2.28} opacity={0.55}>
          <RadialGradient c={vec(cx, cy)} r={R * 2.28} colors={['#0D0719', '#06030F']} />
        </Circle>
        <AdaptiveHalo t={t} cx={cx} cy={cy} R={R} spread={fieldR.value} energy={energy} attn={attn} anticipate={anticipate} voice={voice} listenOn={listenOn}
          halo0={C.halo0} halo1={C.halo1} sweep0={C.sweep0} sweep1={C.sweep1} listenC={C.listenC} voiceC={C.voiceC} outer={C.outer} />
        <OrganicMembrane t={t} cx={cx} cy={cy} W={W} H={H} energy={energy} turb={turb} breath={breath} pulse={pulse} tiltV={tiltV} fieldR={fieldR} awakenV={awakenV}
          transparency={(env?.light ?? 0.5) > 0.8 ? 0.25 : 0} colors={[C.m1, C.m2, C.m3, C.m4, C.m5, C.m6, C.m7]} fill={C.fill} />
        <EmotionalAura t={t} cx={cx} cy={cy} R={R} warmth={warmth} attn={attn} energy={energy} pulse={pulse} auraI={auraI} halo0={C.halo0} halo1={C.halo1} />
        <EnergyCore t={t} cx={cx} cy={cy} R={R} H={H} energy={energy} warmth={warmth} breath={breath} pulse={pulse} awakenV={awakenV} conv={conv} core0={C.core0} core1={C.core1} core2={C.core2} />
        <MicroParticles t={t} cx={cx} cy={cy} R={R} energy={energy} anticipate={anticipate} speed={speed} tiltV={tiltV} color={C.particle} emotion={prof.key} calm={calm} perf={perf} />
        <ExpressiveEyes t={t} cx={cx} cy={eyeCy} sep={sep} eyeSize={eyeSize} eyeOpen={eyeOpen} eyeGlow={eyeGlow} pupil={pupil} gazeX={gazeX} gazeY={gazeY} awaken={awakenV}
          emotion={prof.key} browRaise={prof.browRaise} tearOpacity={prof.key === 'sad' ? 0.6 : 0} squint={prof.key === 'angry' ? 0.4 : 0}
          thinkingMul={presence?.thinking ? 0.72 : 1} envLight={env?.light ?? 0.5}
          colors={{ eyeFill: C.eyeFill, eyeStroke: C.eyeStroke, brow: C.brow, irisA: C.irisA, irisB: C.irisB }} />
        <Path path={mouth} style="stroke" strokeWidth={1.6} strokeCap="round" color={C.mouth} opacity={mouthO} />
      </Canvas>
    </View>
  );
}
const styles = StyleSheet.create({ wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' } });
