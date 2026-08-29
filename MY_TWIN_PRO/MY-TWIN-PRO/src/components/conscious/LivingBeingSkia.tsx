// @ts-nocheck
/**
 * LivingBeingSkia v1 — المنسق الموحّد (المواصفات 1-27)
 * =====================================================
 * PresenceState + Reactor ⇒ VisualState واحد (SharedValues بانتقالات withTiming) ⇒ كل الطبقات.
 * ترتيب الرسم: سديم خلفي ⇒ L1 Core-Light خلفي ⇒ L7 Halo ⇒ L6 Particles ⇒
 * L3-L5 Membranes ⇒ L2 Inner Field ⇒ العيون ⇒ الفم ⇒ L15 Core أمامي.
 * تنفس مشترك bpM مع إزاحات طور (bpH=-0.7 للهالة، bpC=-1.2 للنواة) ⇒ لا تزامن آلي.
 * البيئة = modifier لا بديل (Happy+LoudNoise = Happy but startled).
 * كل المساعدات محروسة؛ أنصاف أقطار > 0 دائمًا؛ perf-tier للجسيمات.
 */
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Canvas, Circle, Path, RadialGradient, vec, BlurMask, Group } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, useFrameCallback, withTiming, Easing } from 'react-native-reanimated';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';
import { getProfile } from '../../../engine/presence/EmotionToVisualMapper';
import { reactToEnvironment, snapshotFromSensors } from '../../../engine/presence/EnvironmentalReactor';
import { devicePresenceEngine } from '../../../engine/device/DevicePresenceEngine';
import { useBreathAnimation } from '../../hooks/useBreathAnimation';
import AdaptiveHalo from '../twin/AdaptiveHalo';
import EmotionalAura from '../twin/EmotionalAura';
import OrganicMembrane from '../twin/OrganicMembrane';
import EnergyCore from '../twin/EnergyCore';
import MicroParticles from '../twin/MicroParticles';
import ExpressiveEyes from '../twin/ExpressiveEyes';

const c01 = (n: any, f = 0) => { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : f; };
const rgba = (c: any, a = 1, m = 1) => `rgba(${Math.round(c01(c?.r, 155) * m)},${Math.round(c01(c?.g, 111) * m)},${Math.round(c01(c?.b, 255) * m)},${c01(a).toFixed(3)})`;
const mouthPath = (mx: number, my: number, Wd: number, curve: number, open: number) => { const dy = curve * Wd * 0.5; return `M ${mx - Wd} ${my} Q ${mx} ${my + dy + open * Wd * 0.5} ${mx + Wd} ${my}`; };
const STARS = [[0.18, 0.12], [0.82, 0.2], [0.7, 0.08], [0.1, 0.55], [0.9, 0.62], [0.3, 0.85]];

export default function LivingBeingSkia({ presence, size = 360, isDark = true, env, maturity = 0.8, awaken = 1 }: any) {
  const cx = size / 2, cy = size / 2, R = size * 0.32;
  const W = R * 0.8, H = R * 0.98;
  const eyeCy = cy - H * 0.18, sep = W * 0.62, eyeSize = W * 0.42;
  const A = presence?.colorA ?? { r: 155, g: 111, b: 255 };
  const B = presence?.colorB ?? { r: 70, g: 139, b: 255 };
  const E = presence?.eyeColor ?? { r: 232, g: 222, b: 255 };
  const prof = getProfile(String(presence?.emotion ?? 'calm'));
  const perf = useMemo(() => { try { const b = devicePresenceEngine.getSensors().deviceBattery ?? 100; const w = Dimensions.get('window').width; return b < 25 || w < 400 ? 0.5 : b < 60 ? 0.8 : 1; } catch { return 0.8; } }, []);
  const mul = isDark ? 1 : 0.78;
  const C = useMemo(() => ({
    core0: rgba(A, 0.95, mul), core1: rgba(B, 0.55, mul), core2: rgba(A, 0, mul),
    halo0: rgba(A, 0.42, mul), halo1: rgba(B, 0.22, mul), fill: rgba(A, 0.06, mul),
    m1: rgba(B, 0.72, mul), m2: rgba(A, 0.58, mul), m3: rgba(B, 0.48, mul), m4: rgba(A, 0.38, mul), m5: rgba(B, 0.3, mul), m6: rgba(A, 0.22, mul), m7: rgba(B, 0.16, mul),
    sweep0: rgba(B, 0.28, mul), sweep1: rgba(A, 0.28, mul), particle: rgba(B, 0.55, mul),
    eyeFill: rgba(E, 0.95, mul), eyeStroke: rgba(B, 0.88, mul), brow: rgba(A, 0.55, mul),
    voiceC: rgba(B, 0.35, mul), listenC: rgba(A, 0.28, mul), outer: rgba(A, 0.14, mul),
    irisA: rgba(E, 0.95, mul), irisB: rgba(B, 0.8, mul), mouth: '#E6D9FF', neb: rgba(A, 0.10, mul),
  }), [A?.r, A?.g, A?.b, B?.r, B?.g, B?.b, E?.r, E?.g, E?.b, isDark]);

  // VisualState واحد (القاعدة الذهبية)
  const VS = {
    energy: useSharedValue(0.55), turb: useSharedValue(0.18), fieldR: useSharedValue(1),
    auraI: useSharedValue(0.5), coreI: useSharedValue(0.6), partSp: useSharedValue(0.4),
    calm: useSharedValue(0), conv: useSharedValue(0),
    eyeOpen: useSharedValue(0.85), eyeGlow: useSharedValue(0.88), pupil: useSharedValue(0.42),
    gazeX: useSharedValue(0), gazeY: useSharedValue(0),
    warmth: useSharedValue(0.35), attn: useSharedValue(0.5), ant: useSharedValue(0.25), voice: useSharedValue(0),
  };
  const awakenV = useSharedValue(c01(awaken));
  useEffect(() => { awakenV.value = withTiming(c01(awaken), { duration: 900, easing: Easing.out(Easing.cubic) }); }, [awaken]);

  useEffect(() => {
    if (!presence) return;
    let sensors: any = {}; try { sensors = devicePresenceEngine.getSensors(); } catch {}
    const mods = reactToEnvironment(snapshotFromSensors(sensors, { listening: !!presence.listening, speaking: !!presence.speaking, thinking: !!presence.thinking, camera: !!env?.camera }));
    const cv = presence.conversationState;
    const D = { duration: 600, easing: Easing.out(Easing.cubic) };
    const F = { duration: 220 };
    VS.energy.value = withTiming(c01((presence.energy ?? 0.55) + (prof.energyBias ?? 0) * 0.3), D);
    VS.turb.value = withTiming(c01((presence.turbulence ?? 0.18) * (0.8 + mods.tremble * 0.8) + (env?.noise ?? 0) * 0.1), D);
    VS.fieldR.value = withTiming(Math.min(1.7, (presence.fieldRadius ?? 1) * mods.haloSpread + (env?.userNear ? 0.07 : 0)), D);
    VS.auraI.value = withTiming(c01((prof.auraIntensity ?? 0.5) * (0.7 + (presence.energy ?? 0.5) * 0.5) * mods.glowMul), D);
    VS.coreI.value = withTiming(c01(0.4 + (presence.energy ?? 0.5) * 0.4 + (cv === 'processing' ? 0.25 : 0) + (cv === 'responding' ? 0.2 : 0)), D);
    VS.partSp.value = withTiming(Math.max(0.1, (prof.fieldSpeed ?? 0.4) * (cv === 'processing' ? 1.4 : 1) * (1 - mods.particleCalm * 0.5)), D);
    VS.calm.value = withTiming(c01((cv === 'processing' || prof.key === 'sleepy') ? 0.35 : mods.particleCalm * 0.3), D);
    VS.conv.value = withTiming(cv === 'processing' ? 1 : cv === 'understanding' ? 0.7 : cv === 'responding' ? 0.8 : cv === 'listening' ? 0.3 : 0, D);
    VS.eyeOpen.value = withTiming(c01((presence.eyeOpenness ?? prof.eyeOpenness) * (cv === 'listening' ? 1.05 : 1)), F);
    VS.eyeGlow.value = withTiming(c01((presence.eyeGlow ?? prof.eyeGlow) * (0.85 + mods.eyeGlow * 0.5)), F);
    VS.pupil.value = withTiming(c01((presence.pupilSize ?? prof.pupilSize) + (1 - (env?.light ?? 0.5)) * 0.15), F);
    VS.gazeX.value = withTiming(mods.gazeLock ? 0 : (presence.gazeX ?? 0), { duration: 280 });
    VS.gazeY.value = withTiming(cv === 'processing' ? -0.15 : (presence.gazeY ?? 0), { duration: 280 });
    VS.warmth.value = withTiming(c01(presence.warmth ?? prof.warmth), D);
    VS.attn.value = withTiming(c01((presence.attention ?? prof.attention) + (cv === 'listening' ? 0.2 : 0)), D);
    VS.ant.value = withTiming(c01(presence.anticipation ?? prof.anticipation), D);
    VS.voice.value = withTiming(c01(presence.voiceLevel ?? 0), F);
  }, [presence, env]);

  const t = useSharedValue(0);
  useFrameCallback((f) => { t.value = (Number.isFinite(f.timeSinceFirstFrame) ? f.timeSinceFirstFrame : 0) / 1000; });
  const bpM = useBreathAnimation(3200);
  const bpH = useDerivedValue(() => bpM.value - 0.7);
  const bpC = useDerivedValue(() => bpM.value - 1.2);

  const mouth = useDerivedValue(() => mouthPath(cx, cy + H * 0.55, W * 0.34, prof.mouthCurve, presence?.speaking ? Math.abs(Math.sin(t.value * 7)) * 0.5 : 0));
  const mouthO = useDerivedValue(() => c01(0.45 + VS.voice.value * 0.4) * c01(0.2 + awakenV.value * 0.8));
  const backCoreO = useDerivedValue(() => c01(0.25 + VS.coreI.value * 0.35) * awakenV.value);
  const listenOn = !!(env?.listening || presence?.listening);

  return (
    <View accessible accessibilityLabel={`MyTwin: ${presence?.emotion ?? 'calm'}`} style={{ width: size, height: size }}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle cx={cx} cy={cy} r={R * 2.6} color={isDark ? '#070310' : '#00000000'} opacity={useDerivedValue(() => 0.96 * awakenV.value)} />
        <Circle cx={cx} cy={cy} r={R * 2.4} opacity={0.5}>
          <RadialGradient c={vec(cx, cy)} r={R * 2.4} colors={[C.neb, '#00000000']} />
        </Circle>
        {STARS.map((s, i) => <Circle key={i} cx={size * s[0]} cy={size * s[1]} r={i % 2 ? 1 : 1.4} color="#B8A0FF" opacity={0.16} />)}
        <Circle cx={cx} cy={cy + H * 0.3} r={R * 1.15} opacity={backCoreO}>
          <RadialGradient c={vec(cx, cy + H * 0.3)} r={R * 1.15} colors={[C.core0, C.core1, C.core2]} />
        </Circle>
        <AdaptiveHalo t={t} cx={cx} cy={cy} R={R} spread={VS.fieldR} energy={VS.energy} attn={VS.attn} anticipate={VS.ant} voice={VS.voice} listenOn={listenOn}
          halo0={C.halo0} halo1={C.halo1} sweep0={C.sweep0} sweep1={C.sweep1} listenC={C.listenC} voiceC={C.voiceC} outer={C.outer} />
        <MicroParticles t={t} cx={cx} cy={cy} R={R} energy={VS.energy} anticipate={VS.ant} speed={VS.partSp} tiltV={useSharedValue(c01(presence?.orbitality ?? 0.68, 0.2, 0.95))} color={C.particle} emotion={prof.key} calm={VS.calm} perf={perf} />
        <OrganicMembrane t={t} cx={cx} cy={cy} W={W} H={H} energy={VS.energy} turb={VS.turb} breath={VS.energy} pulse={VS.coreI} tiltV={useSharedValue(c01(presence?.orbitality ?? 0.68, 0.2, 0.95))} fieldR={VS.fieldR} awakenV={awakenV} bp={bpM}
          transparency={(env?.light ?? 0.5) > 0.8 ? 0.25 : 0} colors={[C.m1, C.m2, C.m3, C.m4, C.m5, C.m6, C.m7]} fill={C.fill} />
        <EmotionalAura t={t} cx={cx} cy={cy} R={R} warmth={VS.warmth} attn={VS.attn} energy={VS.energy} pulse={VS.coreI} auraI={VS.auraI.value} bp={bpH} halo0={C.halo0} halo1={C.halo1} />
        <ExpressiveEyes t={t} cx={cx} cy={eyeCy} sep={sep} eyeSize={eyeSize} eyeOpen={VS.eyeOpen} eyeGlow={VS.eyeGlow} pupil={VS.pupil} gazeX={VS.gazeX} gazeY={VS.gazeY} awaken={awakenV}
          emotion={prof.key} browRaise={prof.browRaise} tearOpacity={prof.key === 'sad' ? 0.6 : 0} squint={prof.key === 'angry' ? 0.4 : 0}
          thinkingMul={presence?.thinking ? 0.72 : 1} envLight={env?.light ?? 0.5}
          colors={{ eyeFill: C.eyeFill, eyeStroke: C.eyeStroke, brow: C.brow, irisA: C.irisA, irisB: C.irisB }} />
        <Path path={mouth} style="stroke" strokeWidth={1.6} strokeCap="round" color={C.mouth} opacity={mouthO} />
        <EnergyCore t={t} cx={cx} cy={cy} R={R} H={H} energy={VS.energy} warmth={VS.warmth} breath={VS.energy} pulse={VS.coreI} awakenV={awakenV} conv={VS.conv} bp={bpC} core0={C.core0} core1={C.core1} core2={C.core2} />
      </Canvas>
    </View>
  );
}
