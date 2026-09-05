// @ts-nocheck
/**
 * DigitalBeing v7.0 — عارض VisualState نقي (القاعدة الذهبية: لا قرارات هنا)
 * ======================================================================
 * - يستهلك vs جاهزًا من LivingBeingSkia؛ وعند غيابه (عقود ShaderBeing القديمة)
 *   يشتقّه عبر buildVisualState ⇒ مصدر اشتقاق واحد، لا منطق مزدوج.
 * - توقيت منطقي مشترك: bpM/bpH/bpC (إزاحات طور) ⇒ الطبقات تتنفس ككيان واحد.
 * - كل المساعدات 'worklet' + دروع sf/cl ⇒ صفر كراش خيط UI.
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Canvas, Circle, Path, RadialGradient, vec } from '@shopify/react-native-skia';
import { useSharedValue, useFrameCallback, useDerivedValue, withTiming, cancelAnimation, Easing } from 'react-native-reanimated';
import type { VisualState } from '../../../engine/presence/VisualState';
import { buildVisualState } from '../../../engine/presence/VisualState';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';
import { devicePresenceEngine } from '../../../engine/device/DevicePresenceEngine';
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
export default function DigitalBeing({ vs, presence, env, size = 360, isDark = true, maturity = 0.8, userNear, awaken = 1 }: {
  vs?: VisualState; presence?: PresenceState | null; env?: any; size?: number; isDark?: boolean; maturity?: number; userNear?: boolean; awaken?: number;
}) {
  // تكييف خلفي: غياب vs ⇒ اشتقاق من presence+env (نفس الطبقة الوسيطة)
  const envSnap: any = env ? { ambientLight: env.light ?? env.ambientLight, noise: env.noise, motion: env.motion, proximity: env.proximity, userPresent: !!(env.userNear ?? env.userPresent), camera: !!env.camera, listening: !!env.listening, speaking: !!presence?.speaking, thinking: !!presence?.thinking, night: env.night } : undefined;
  const VS: VisualState = vs ?? buildVisualState(presence ?? null, envSnap, awaken);
  const cx = size / 2, cy = size / 2, R = size * 0.32;
  const W = R * 0.80, H = R * 0.98;
  const eyeCy = cy - H * 0.18, sep = W * 0.62, eyeSize = W * 0.42;
  const al = isDark ? 1 : 0.8;
  const C = useMemo(() => ({
    core0: hexA(VS.colorA, (isDark ? 0.95 : 0.8) * al), core1: hexA(VS.colorB, (isDark ? 0.55 : 0.4) * al), core2: hexA(VS.colorA, 0),
    halo0: hexA(VS.colorA, (isDark ? 0.42 : 0.3) * al), halo1: hexA(VS.colorB, (isDark ? 0.22 : 0.15) * al),
    neb: hexA(VS.colorA, 0.1), fill: hexA(VS.colorA, (isDark ? 0.06 : 0.04) * al),
    m1: hexA(VS.colorB, (isDark ? 0.72 : 0.55) * al), m2: hexA(VS.colorA, (isDark ? 0.58 : 0.44) * al),
    m3: hexA(VS.colorB, (isDark ? 0.48 : 0.36) * al), m4: hexA(VS.colorA, (isDark ? 0.38 : 0.28) * al),
    m5: hexA(VS.colorB, (isDark ? 0.3 : 0.22) * al), m6: hexA(VS.colorA, (isDark ? 0.22 : 0.16) * al), m7: hexA(VS.colorB, (isDark ? 0.16 : 0.11) * al),
    sweep0: hexA(VS.colorB, 0.24 * al), sweep1: hexA(VS.colorA, 0.24 * al),
    particle: hexA(VS.colorB, (isDark ? 0.55 : 0.35) * al),
    eyeFill: isDark ? '#E8DEFF' : '#F0EAFF', eyeStroke: hexA(VS.colorB, (isDark ? 0.88 : 0.7) * al), brow: hexA(VS.colorA, 0.55 * al),
    voiceC: hexA(VS.colorB, 0.3 * al), listenC: hexA(VS.colorA, 0.24 * al), outer: hexA(VS.colorA, 0.14 * al),
    mouth: '#E6D9FF',
  }), [VS.colorA, VS.colorB, isDark]);
  const perf = useMemo(() => { try { const b = devicePresenceEngine.getSensors().deviceBattery ?? 100; const w = Dimensions.get('window').width; return b < 25 || w < 400 ? 0.5 : b < 60 ? 0.8 : 1; } catch { return 0.8; } }, []);
  const t = useSharedValue(0);
  const energy = useSharedValue(cl(VS.energy));
  const speed = useSharedValue(cl(VS.particleSpeed, 0.05, 2));
  const turb = useSharedValue(cl(VS.turbulence));
  const tiltV = useSharedValue(cl(VS.orbitality, 0.2, 0.95));
  const fieldR = useSharedValue(cl(VS.fieldRadius, 0.5, 1.7));
  const breath = useSharedValue(cl(VS.breathing));
  const pulse = useSharedValue(cl(VS.pulse));
  const eyeOpen = useSharedValue(cl(VS.eyeOpenness, 0.05, 1.2));
  const eyeGlowV = useSharedValue(cl(VS.eyeGlow));
  const pupilV = useSharedValue(cl(VS.pupilSize));
  const gazeX = useSharedValue(cl(VS.gazeX, -1, 1));
  const gazeY = useSharedValue(cl(VS.gazeY, -1, 1));
  const warmth = useSharedValue(cl(VS.warmth ?? 0.35));
  const attn = useSharedValue(cl(VS.attention ?? 0.5));
  const ant = useSharedValue(cl(VS.anticipation ?? 0.25));
  const voice = useSharedValue(cl(VS.voiceLevel));
  const awakenV = useSharedValue(cl(VS.awaken));
  const conv = useSharedValue(0);
  useFrameCallback((f) => { 'worklet'; t.value = sf(f.timeSinceFirstFrame, 0) / 1000; });
  useEffect(() => () => { cancelAnimation(t); }, []);
  const DUR = { duration: 550, easing: Easing.out(Easing.cubic) };
  const FAST = { duration: 200 };
  useEffect(() => {
    energy.value = withTiming(cl(VS.energy), DUR);
    speed.value = withTiming(cl(VS.particleSpeed, 0.05, 2), DUR);
    turb.value = withTiming(cl(VS.turbulence), DUR);
    tiltV.value = withTiming(cl(VS.orbitality, 0.2, 0.95), DUR);
    fieldR.value = withTiming(cl(VS.fieldRadius, 0.5, 1.7), DUR);
    breath.value = withTiming(cl(VS.breathing), DUR);
    pulse.value = withTiming(cl(VS.pulse), DUR);
    eyeOpen.value = withTiming(cl(VS.eyeOpenness, 0.05, 1.2), FAST);
    eyeGlowV.value = withTiming(cl(VS.eyeGlow), FAST);
    pupilV.value = withTiming(cl(VS.pupilSize), FAST);
    gazeX.value = withTiming(cl(VS.gazeX, -1, 1), { duration: 280 });
    gazeY.value = withTiming(cl(VS.gazeY, -1, 1), { duration: 280 });
    warmth.value = withTiming(cl(VS.warmth ?? 0.35), DUR);
    attn.value = withTiming(cl(VS.attention ?? 0.5), DUR);
    ant.value = withTiming(cl(VS.anticipation ?? 0.25), DUR);
    voice.value = withTiming(cl(VS.voiceLevel), FAST);
    awakenV.value = withTiming(cl(VS.awaken), { duration: 900, easing: Easing.out(Easing.cubic) });
    conv.value = withTiming(VS.convState === 'processing' ? 1 : VS.convState === 'understanding' ? 0.7 : VS.convState === 'responding' ? 0.8 : VS.convState === 'listening' ? 0.3 : 0, DUR);
  }, [VS]);
  const bpM = useBreathAnimation(3200);
  const bpH = useDerivedValue(() => bpM.value - 0.7);
  const bpC = useDerivedValue(() => bpM.value - 1.2);
  const calm = (VS.convState === 'processing' || VS.emotion === 'sleepy' || VS.emotion === 'thinking') ? 0.35 : 0;
  const mouth = useDerivedValue(() => mouthPath(cx, cy + H * 0.55, W * 0.34, VS.mouthCurve, VS.speaking ? Math.abs(Math.sin(sf(t.value) * 7)) * 0.5 : 0));
  const mouthO = useDerivedValue(() => cl(0.45 + voice.value * 0.4) * cl(0.2 + awakenV.value * 0.8));
  const discO = useDerivedValue(() => 0.94 * awakenV.value);
  const listenOn = !!VS.listening;
  return (
    <View accessible accessibilityLabel={`MyTwin: ${VS.emotion}`} style={[styles.wrap, { width: size, height: size }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle cx={cx} cy={cy} r={R * 2.6} color={isDark ? '#070310' : '#00000000'} opacity={discO} />
        <Circle cx={cx} cy={cy} r={R * 2.4} opacity={0.5}>
          <RadialGradient c={vec(cx, cy)} r={R * 2.4} colors={[C.neb, '#00000000']} />
        </Circle>
        {STARS.map((s, i) => <Circle key={i} cx={size * s[0]} cy={size * s[1]} r={i % 2 ? 1 : 1.4} color="#B8A0FF" opacity={0.16 * (isDark ? 1 : 0.5)} />)}
        <AdaptiveHalo t={t} cx={cx} cy={cy} R={R} spread={VS.fieldRadius} energy={energy} attn={attn} anticipate={ant} voice={voice} listenOn={listenOn}
          halo0={C.halo0} halo1={C.halo1} sweep0={C.sweep0} sweep1={C.sweep1} listenC={C.listenC} voiceC={C.voiceC} outer={C.outer} />
        <MicroParticles t={t} cx={cx} cy={cy} R={R} energy={energy} anticipate={ant} speed={speed} tiltV={tiltV} color={C.particle} emotion={VS.emotion} calm={calm} perf={perf} />
        <OrganicMembrane t={t} cx={cx} cy={cy} W={W} H={H} energy={energy} turb={turb} breath={breath} pulse={pulse} tiltV={tiltV} fieldR={fieldR} awakenV={awakenV} bp={bpM}
          transparency={VS.ambientLight > 0.8 ? 0.25 : 0} colors={[C.m1, C.m2, C.m3, C.m4, C.m5, C.m6, C.m7]} fill={C.fill} />
        <EmotionalAura t={t} cx={cx} cy={cy} R={R} warmth={warmth} attn={attn} energy={energy} pulse={pulse} auraI={VS.auraIntensity} bp={bpH} halo0={C.halo0} halo1={C.halo1} />
        <EnergyCore t={t} cx={cx} cy={cy} R={R} H={H} energy={energy} warmth={warmth} breath={breath} pulse={pulse} awakenV={awakenV} conv={conv} bp={bpC} core0={C.core0} core1={C.core1} core2={C.core2} />
        <ExpressiveEyes t={t} cx={cx} cy={eyeCy} sep={sep} eyeSize={eyeSize} eyeOpen={eyeOpen} eyeGlow={eyeGlowV} pupil={pupilV} gazeX={gazeX} gazeY={gazeY} awaken={awakenV}
          emotion={VS.emotion} browRaise={VS.browRaise} tearOpacity={VS.tearOpacity} squint={VS.squint}
          thinkingMul={VS.thinkingMul} envLight={VS.ambientLight}
          colors={{ eyeFill: C.eyeFill, eyeStroke: C.eyeStroke, brow: C.brow, irisA: VS.irisA, irisB: VS.irisB }} />
        <Path path={mouth} style="stroke" strokeWidth={1.6} strokeCap="round" color={C.mouth} opacity={mouthO} />
      </Canvas>
    </View>
  );
}
const styles = StyleSheet.create({ wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' } });
