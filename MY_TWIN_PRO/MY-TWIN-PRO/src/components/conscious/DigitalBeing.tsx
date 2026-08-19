import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas, Circle, Path, RadialGradient, SweepGradient,
  BlurMask, vec, Paint, Group,
} from '@shopify/react-native-skia';
import {
  useSharedValue, useFrameCallback, useDerivedValue,
  withTiming, cancelAnimation, Easing,
} from 'react-native-reanimated';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';

const sf = (n: number, fb = 0) =>
  Number.isFinite(n) && !Number.isNaN(n) ? n : fb;
const cl = (n: number, a = 0, b = 1) => {
  const v = Number.isFinite(n) ? n : a;
  return Math.max(a, Math.min(b, v));
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * cl(t);
const PI2 = Math.PI * 2;

type EmotionKey = 'calm'|'happy'|'curious'|'thinking'|'sad'|'angry'|'sleepy'|'surprised'|'excited'|'caring'|'focused';

const EMOTION_PALETTES: Record<EmotionKey, {
  core: string; mid: string; outer: string; eye: string;
  coreA: number[]; coreB: number[]; auraA: number[]; auraB: number[];
  pulseSpeed: number; orbitSpeed: number; particleCount: number;
}> = {
  calm: { core:'#9B6FFF', mid:'#6B3FD4', outer:'#4B2FA0', eye:'#E8DEFF', coreA:[155,111,255], coreB:[70,139,255], auraA:[104,62,214], auraB:[84,139,255], pulseSpeed:0.65, orbitSpeed:0.4, particleCount:80 },
  happy: { core:'#FF82DC', mid:'#C44FAA', outer:'#8B2F7A', eye:'#FFE8F5', coreA:[255,130,220], coreB:[255,175,92], auraA:[220,80,180], auraB:[255,140,60], pulseSpeed:1.1, orbitSpeed:0.85, particleCount:140 },
  curious: { core:'#46E2FF', mid:'#2A9FCC', outer:'#1A6090', eye:'#E0FAFF', coreA:[70,226,255], coreB:[155,111,255], auraA:[40,180,220], auraB:[130,80,240], pulseSpeed:0.9, orbitSpeed:0.75, particleCount:120 },
  thinking: { core:'#6B9FFF', mid:'#3A5FCC', outer:'#1A3090', eye:'#C8D8FF', coreA:[107,159,255], coreB:[70,70,220], auraA:[60,100,200], auraB:[40,60,180], pulseSpeed:0.55, orbitSpeed:0.3, particleCount:60 },
  sad: { core:'#7090CC', mid:'#405090', outer:'#253060', eye:'#C0CCEE', coreA:[112,144,204], coreB:[60,80,160], auraA:[70,100,170], auraB:[40,60,130], pulseSpeed:0.4, orbitSpeed:0.25, particleCount:45 },
  angry: { core:'#FF4860', mid:'#CC2040', outer:'#901020', eye:'#FFB0B8', coreA:[255,72,92], coreB:[220,40,20], auraA:[200,30,50], auraB:[160,20,30], pulseSpeed:1.6, orbitSpeed:1.3, particleCount:160 },
  sleepy: { core:'#5040AA', mid:'#302070', outer:'#201050', eye:'#9080CC', coreA:[80,64,170], coreB:[50,40,120], auraA:[60,50,140], auraB:[30,25,90], pulseSpeed:0.3, orbitSpeed:0.18, particleCount:30 },
  surprised: { core:'#FFFFFF', mid:'#C0B0FF', outer:'#7060CC', eye:'#FFFFFF', coreA:[245,242,255], coreB:[180,160,255], auraA:[160,140,255], auraB:[100,80,220], pulseSpeed:1.8, orbitSpeed:1.4, particleCount:180 },
  excited: { core:'#FF9F50', mid:'#CC6020', outer:'#903010', eye:'#FFE8C0', coreA:[255,159,80], coreB:[255,80,120], auraA:[220,120,40], auraB:[200,60,100], pulseSpeed:1.5, orbitSpeed:1.2, particleCount:150 },
  caring: { core:'#FF80B0', mid:'#CC4080', outer:'#902060', eye:'#FFD0E8', coreA:[255,128,176], coreB:[255,180,220], auraA:[200,80,140], auraB:[180,60,120], pulseSpeed:0.75, orbitSpeed:0.6, particleCount:100 },
  focused: { core:'#40D0FF', mid:'#2090CC', outer:'#105090', eye:'#C0F0FF', coreA:[64,208,255], coreB:[100,80,240], auraA:[40,160,220], auraB:[80,60,200], pulseSpeed:0.8, orbitSpeed:0.65, particleCount:90 },
};

const emotionMap = (e: string): EmotionKey => {
  const m: Record<string,EmotionKey> = {
    calm:'calm', happy:'happy', joy:'happy', love:'caring', caring:'caring',
    curious:'curious', thinking:'thinking', focused:'focused',
    sad:'sad', sadness:'sad', fear:'thinking', afraid:'thinking',
    angry:'angry', anger:'angry', surprised:'surprised', surprise:'surprised',
    excited:'excited', excitement:'excited', sleepy:'sleepy',
  };
  return m[String(e).toLowerCase()] ?? 'calm';
};

const rgb = (c: number[], a=1) =>
  `rgba(${Math.round(cl(c[0],0,255))},${Math.round(cl(c[1],0,255))},${Math.round(cl(c[2],0,255))},${cl(a).toFixed(3)})`;

const organic = (x: number, y: number, t: number) =>
  Math.sin(x*7.3+y*1.3+t*0.3)*0.5 +
  Math.sin(x*13.7-y*0.7+t*0.17)*0.3 +
  Math.sin(x*29.1+y*2.1-t*0.11)*0.2;

const buildMembranePath = (
  cx: number, cy: number, r: number,
  t: number, speed: number, turbulence: number,
  breathing: number, pulse: number,
  tiltAngle: number, layer: number,
): string => {
  'worklet';
  const pts = 64;
  const phase = t * speed * (0.8 + layer * 0.15);
  const breath = 1 + Math.sin(t * 0.65 * breathing) * 0.022 * breathing;
  const pls = Math.max(0, Math.sin(t * 2.4 * pulse)) * 0.018 * pulse;
  const tilt = cl(tiltAngle, 0.2, 0.95);
  let d = '';
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * PI2;
    const noise = organic(Math.cos(a), Math.sin(a), phase) * r * turbulence * 0.06;
    const wobble = Math.sin(a*3+phase*1.7)*r*turbulence*0.04 +
                   Math.cos(a*5-phase*0.9)*r*turbulence*0.025;
    const rr = r * breath * (1 + pls) + wobble + noise;
    const px = sf(cx + Math.cos(a) * rr, cx);
    const py = sf(cy + Math.sin(a) * rr * tilt, cy);
    d += `${i===0?'M':'L'} ${px.toFixed(2)} ${py.toFixed(2)} `;
  }
  return d + 'Z';
};

export interface BeingEnv {
  light?: number; noise?: number; motion?: number;
  listening?: boolean; camera?: boolean; userNear?: boolean;
}

export default function DigitalBeing({
  presence, size = 360, isDark = true, env, maturity = 0.8,
}: {
  presence: PresenceState;
  size?: number;
  isDark?: boolean;
  env?: BeingEnv;
  maturity?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.32;
  const emo = emotionMap(presence?.emotion ?? 'calm');
  const pal = EMOTION_PALETTES[emo];
  const t = useSharedValue(0);
  const energy = useSharedValue(cl(presence?.energy ?? 0.55));
  const speed = useSharedValue(pal.orbitSpeed);
  const turb = useSharedValue(cl(presence?.turbulence ?? 0.18));
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
  const tiltV = useSharedValue(0.68);
  const glowR = useSharedValue(cl(presence?.eyeGlow ?? 0.82));
  useFrameCallback((f) => { t.value = sf(f.timeSinceFirstFrame, 0) / 1000; });
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cancelAnimation(t); cancelAnimation(energy);
    };
  }, []);
  const DUR = { duration: 600, easing: Easing.out(Easing.cubic) };
  const DUR_FAST = { duration: 220 };
  useEffect(() => {
    if (!presence) return;
    const p = EMOTION_PALETTES[emotionMap(presence.emotion ?? 'calm')];
    energy.value = withTiming(cl(presence.energy ?? 0.55), DUR);
    speed.value = withTiming(p.orbitSpeed * (presence.thinking ? 0.45 : presence.speaking ? 1.3 : 1), DUR);
    turb.value = withTiming(cl(presence.turbulence ?? 0.18), DUR);
    breath.value = withTiming(cl(presence.breathing ?? 0.4), DUR);
    pulse.value = withTiming(cl(presence.pulse ?? 0.4), DUR);
    eyeOpen.value = withTiming(cl(presence.eyeOpenness ?? 0.85) * (presence.emotion === 'sleepy' ? 0.3 : 1), DUR_FAST);
    eyeGlow.value = withTiming(cl(presence.eyeGlow ?? 0.88), DUR_FAST);
    pupil.value = withTiming(cl(presence.pupilSize ?? 0.42) + (presence.emotion === 'surprised' ? 0.25 : 0), DUR_FAST);
    gazeX.value = withTiming(cl(presence.gazeX ?? 0, -1, 1), { duration: 280 });
    gazeY.value = withTiming(cl(presence.gazeY ?? 0, -1, 1), { duration: 280 });
    warmth.value = withTiming(cl(presence.warmth ?? 0.35), DUR);
    attn.value = withTiming(cl(presence.attention ?? 0.5) + (env?.userNear ? 0.2 : 0), DUR);
    anticipate.value = withTiming(cl(presence.anticipation ?? 0.25), DUR);
    tiltV.value = withTiming(
      presence.emotion === 'angry' ? 0.82 :
      presence.emotion === 'surprised' ? 0.9 :
      presence.emotion === 'sleepy' ? 0.45 :
      presence.emotion === 'happy' ? 0.78 : 0.68, DUR);
    glowR.value = withTiming(cl(presence.eyeGlow ?? 0.82), DUR_FAST);
  }, [presence, env]);

  const mem1 = useDerivedValue(() => buildMembranePath(cx,cy,R*0.88, sf(t.value),cl(speed.value),cl(turb.value),cl(breath.value),cl(pulse.value),cl(tiltV.value),0));
  const mem2 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.02, sf(t.value),cl(speed.value)*0.87,cl(turb.value),cl(breath.value),cl(pulse.value),cl(tiltV.value)*0.94,1));
  const mem3 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.17, sf(t.value),cl(speed.value)*0.74,cl(turb.value)*0.88,cl(breath.value),cl(pulse.value),cl(tiltV.value)*0.88,2));
  const mem4 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.33, sf(t.value),cl(speed.value)*0.62,cl(turb.value)*0.76,cl(breath.value),cl(pulse.value),cl(tiltV.value)*0.82,3));
  const mem5 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.49, sf(t.value),cl(speed.value)*0.51,cl(turb.value)*0.64,cl(breath.value),cl(pulse.value),cl(tiltV.value)*0.76,4));
  const mem6 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.65, sf(t.value),cl(speed.value)*0.41,cl(turb.value)*0.52,cl(breath.value),cl(pulse.value),cl(tiltV.value)*0.70,5));
  const mem7 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.82, sf(t.value),cl(speed.value)*0.32,cl(turb.value)*0.4,cl(breath.value),cl(pulse.value),cl(tiltV.value)*0.64,6));

  const coreR = useDerivedValue(() => {
    const tv = sf(t.value); const bv = cl(breath.value); const pv = cl(pulse.value); const ev = cl(energy.value);
    return sf(R * 0.52 * (1 + Math.sin(tv * 0.65 * (1+bv)) * 0.04 * bv + Math.max(0, Math.sin(tv * 2.8 * (1+pv))) * 0.035 * pv + ev * 0.06), R * 0.52);
  });
  const haloR = useDerivedValue(() => sf(coreR.value * (1.22 + cl(energy.value)*0.18 + cl(attn.value)*0.1), R*0.65));
  const voiceR = useDerivedValue(() => { const tv = sf(t.value); const vv = cl(presence?.voiceLevel ?? 0); return sf(R * (1.55 + vv*0.3 + Math.sin(tv*1.4)*0.025), R*1.55); });
  const listenR = useDerivedValue(() => { const tv = sf(t.value); const lst = (env?.listening || presence?.listening) ? 1 : 0; return sf(R * (1.38 + lst*0.12 + Math.sin(tv*0.9)*0.02), R*1.38); });
  const masterOpacity = useDerivedValue(() => cl(0.55 + cl(energy.value)*0.38 + cl(warmth.value)*0.08));

  const eyeSize = R * 0.16; const eyeSpacing = R * 0.38;
  const buildEye = (side: number) => useDerivedValue(() => {
    'worklet';
    const tv = sf(t.value);
    const blink = Math.max(Math.pow(Math.max(0, Math.sin(tv*0.71+side*1.7)), 36), Math.pow(Math.max(0, Math.sin(tv*0.38+side*4.3)), 52)*0.7);
    const open = cl(eyeOpen.value) * (1 - cl(blink*0.97));
    const thinking_squint = presence?.thinking ? 0.72 : 1;
    const final_open = open * thinking_squint;
    const baseCX = cx + side * eyeSpacing; const baseCY = cy - R*0.04;
    const gx = sf(gazeX.value * R*0.06, 0); const gy = sf(gazeY.value * R*0.04, 0);
    const ecx = baseCX + gx; const ecy = baseCY + gy;
    const W = eyeSize * 1.1; const H = Math.max(eyeSize*0.06, eyeSize * 0.62 * final_open);
    const lx = ecx - W; const rx = ecx + W; const top = ecy - H; const bot = ecy + H * 0.85;
    const cp1x = ecx - W*0.3; const cp2x = ecx + W*0.3;
    return `M ${lx} ${ecy} C ${cp1x} ${top}, ${cp2x} ${top}, ${rx} ${ecy} C ${cp2x} ${bot}, ${cp1x} ${bot}, ${lx} ${ecy} Z`;
  });
  const leftEyePath = buildEye(-1); const rightEyePath = buildEye(1);
  const leftPupilX = useDerivedValue(() => sf(cx - eyeSpacing + cl(gazeX.value,-1,1)*R*0.055, cx - eyeSpacing));
  const rightPupilX = useDerivedValue(() => sf(cx + eyeSpacing + cl(gazeX.value,-1,1)*R*0.055, cx + eyeSpacing));
  const pupilY = useDerivedValue(() => sf(cy - R*0.04 + cl(gazeY.value,-1,1)*R*0.038, cy - R*0.04));
  const pupilR = useDerivedValue(() => sf(eyeSize * (0.28 + cl(pupil.value)*0.28), eyeSize*0.28));
  const buildBrow = (side: number) => useDerivedValue(() => {
    'worklet';
    const tv = sf(t.value);
    const gx = cl(gazeX.value,-1,1)*R*0.04; const gy = cl(gazeY.value,-1,1)*R*0.03;
    const baseCX = cx + side*eyeSpacing + gx; const baseY = cy - R*0.22 + gy;
    const angry_tilt = presence?.emotion==='angry' ? side*R*0.06 : 0;
    const sad_tilt = presence?.emotion==='sad' ? -side*R*0.04 : 0;
    const surprised_raise = presence?.emotion==='surprised' ? -R*0.04 : 0;
    const tilt = angry_tilt + sad_tilt; const raise = surprised_raise; const W = eyeSize*0.9;
    return `M ${baseCX-W} ${baseY+tilt+raise} Q ${baseCX} ${baseY-R*0.025+raise} ${baseCX+W} ${baseY-tilt+raise}`;
  });
  const leftBrow = buildBrow(-1); const rightBrow = buildBrow(1);
  const eyeOpacity = useDerivedValue(() => cl(0.72 + cl(eyeGlow.value)*0.26));
  const particlePath = useDerivedValue(() => {
    'worklet';
    const tv = sf(t.value); const ev = cl(energy.value); const sv = cl(speed.value); const av = cl(anticipate.value);
    const count = Math.round(60 + ev*100 + av*40); const orbitR = R * (1.1 + ev*0.3); let d = '';
    for (let i=0; i<count; i++) {
      const seed = i * 13.271 + (i%7)*0.37;
      const life = (tv*(0.04+(i%9)*0.006)+seed) % 1;
      const fade = Math.sin(life*Math.PI);
      if (fade < 0.05) continue;
      const angle = seed*2.618 + tv*(0.015+(i%5)*0.007)*sv*(0.5+ev);
      const r = orbitR * (0.85 + ((i*37)%100)/100*0.55) * (0.88+life*0.24);
      const size = Math.max(0.3, (0.3+(((i*13)%10)/10)*(0.5+av))*fade*1.2);
      const px = sf(cx + Math.cos(angle)*r, cx);
      const py = sf(cy + Math.sin(angle)*r*(cl(tiltV.value)*0.85+0.15), cy);
      const s = sf(size, 0.3);
      d += `M ${px} ${py} l ${s} ${s*0.4} `;
    }
    return d || 'M 0 0';
  });

  const lightMul = isDark ? 1 : 0.78;
  const adjA = pal.coreA.map(c=>Math.round(c*lightMul)) as number[];
  const adjB = pal.coreB.map(c=>Math.round(c*lightMul)) as number[];
  const adjAuraA = pal.auraA.map(c=>Math.round(c*lightMul)) as number[];
  const adjAuraB = pal.auraB.map(c=>Math.round(c*lightMul)) as number[];
  const C = {
    core0: rgb(adjA, isDark?0.95:0.82), core1: rgb(adjB, isDark?0.55:0.42), core2: rgb(adjA, 0),
    halo0: rgb(adjAuraA, isDark?0.42:0.32), halo1: rgb(adjAuraB, isDark?0.22:0.16), halo2: rgb(adjA, 0),
    mem1c: rgb(adjB, isDark?0.72:0.56), mem2c: rgb(adjA, isDark?0.58:0.44), mem3c: rgb(adjB, isDark?0.48:0.36),
    mem4c: rgb(adjA, isDark?0.38:0.28), mem5c: rgb(adjB, isDark?0.30:0.22), mem6c: rgb(adjA, isDark?0.22:0.16),
    mem7c: rgb(adjB, isDark?0.16:0.11), sweep0: rgb(adjB, isDark?0.28:0.18), sweep1: rgb(adjA, isDark?0.28:0.18),
    particle: rgb(adjB, isDark?0.42:0.28), eyeFill: rgb(pal.coreA, isDark?0.95:0.88),
    eyeStroke: rgb(adjB, isDark?0.88:0.72), pupilFill: isDark?'#FFFFFF':'#F0EEFF',
    brow: rgb(pal.coreA, isDark?0.55:0.42), voice: rgb(adjB, isDark?0.35:0.22),
    listen: rgb(adjA, isDark?0.28:0.18), outer: rgb(adjA, isDark?0.14:0.09),
  };

  return (
    <View accessible accessibilityLabel={`MyTwin: ${presence?.emotion ?? 'calm'}`} style={[styles.wrap, {width:size, height:size}]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle cx={cx} cy={cy} r={R*2.1} opacity={useDerivedValue(()=>cl(0.12+cl(energy.value)*0.1))}>
          <RadialGradient c={vec(cx,cy)} r={R*2.1} colors={[C.halo0, C.halo1, C.halo2]} />
        </Circle>
        <Path path={mem7} style="stroke" strokeWidth={0.55} color={C.mem7c} opacity={useDerivedValue(()=>cl(0.14+cl(energy.value)*0.1)*masterOpacity.value)} />
        <Path path={mem6} style="stroke" strokeWidth={0.65} color={C.mem6c} opacity={useDerivedValue(()=>cl(0.18+cl(energy.value)*0.12)*masterOpacity.value)} />
        <Path path={mem5} style="stroke" strokeWidth={0.8}  color={C.mem5c} opacity={useDerivedValue(()=>cl(0.24+cl(energy.value)*0.14)*masterOpacity.value)} />
        <Path path={mem4} style="stroke" strokeWidth={1.0}  color={C.mem4c} opacity={useDerivedValue(()=>cl(0.30+cl(energy.value)*0.16)*masterOpacity.value)} />
        <Path path={mem3} style="stroke" strokeWidth={1.2}  color={C.mem3c} opacity={useDerivedValue(()=>cl(0.38+cl(energy.value)*0.18)*masterOpacity.value)} />
        <Path path={mem2} style="stroke" strokeWidth={1.45} color={C.mem2c} opacity={useDerivedValue(()=>cl(0.48+cl(energy.value)*0.20)*masterOpacity.value)} />
        <Path path={mem1} style="stroke" strokeWidth={1.7}  color={C.mem1c} opacity={useDerivedValue(()=>cl(0.60+cl(energy.value)*0.22)*masterOpacity.value)} />
        <Circle cx={cx} cy={cy} r={R*1.45} style="stroke" strokeWidth={1.1} opacity={useDerivedValue(()=>cl(cl(attn.value)*0.18+cl(anticipate.value)*0.12))}>
          <SweepGradient c={vec(cx,cy)} colors={[C.sweep0,'#FFFFFF08',C.sweep1,'#FFFFFF08',C.sweep0]} />
        </Circle>
        <Circle cx={cx} cy={cy} r={listenR} style="stroke" strokeWidth={0.7} color={C.listen} opacity={useDerivedValue(()=>cl((env?.listening||presence?.listening)?0.32:0.05))} />
        <Circle cx={cx} cy={cy} r={voiceR} style="stroke" strokeWidth={0.75} color={C.voice} opacity={useDerivedValue(()=>cl(0.04+cl(presence?.voiceLevel??0)*0.38))} />
        <Circle cx={cx} cy={cy} r={R*2.05} style="stroke" strokeWidth={0.5} color={C.outer} opacity={0.9} />
        <Circle cx={cx} cy={cy} r={R*1.08} opacity={useDerivedValue(()=>cl(0.18+cl(warmth.value)*0.22+cl(attn.value)*0.12))}>
          <RadialGradient c={vec(cx,cy)} r={R*1.08} colors={[C.halo0, C.halo1, C.halo2]} />
        </Circle>
        <Circle cx={cx} cy={cy} r={coreR} opacity={useDerivedValue(()=>cl(0.78+cl(energy.value)*0.18))}>
          <RadialGradient c={vec(cx,cy)} r={R*0.72} colors={[C.core0, C.core1, C.core2]} />
        </Circle>
        <Circle cx={cx} cy={cy} r={useDerivedValue(()=>sf(coreR.value*0.55,R*0.28))} opacity={useDerivedValue(()=>cl(0.55+cl(energy.value)*0.35+cl(warmth.value)*0.1))}>
          <RadialGradient c={vec(cx,cy)} r={R*0.35} colors={[isDark?'#FFFFFF55':'#FFFFFF40', C.core0, C.core2]} />
        </Circle>
        <Path path={particlePath} style="stroke" strokeWidth={1.1} strokeCap="round" color={C.particle} opacity={useDerivedValue(()=>cl(isDark?0.42:0.28+cl(energy.value)*0.15))} />
        <Path path={leftEyePath}  color={C.eyeFill}   opacity={eyeOpacity} />
        <Path path={rightEyePath} color={C.eyeFill}   opacity={eyeOpacity} />
        <Path path={leftEyePath}  style="stroke" strokeWidth={1.1} color={C.eyeStroke} opacity={useDerivedValue(()=>cl(0.88*eyeOpacity.value))} />
        <Path path={rightEyePath} style="stroke" strokeWidth={1.1} color={C.eyeStroke} opacity={useDerivedValue(()=>cl(0.88*eyeOpacity.value))} />
        <Path path={leftBrow}  style="stroke" strokeWidth={1.3} strokeCap="round" color={C.brow} opacity={useDerivedValue(()=>cl(0.52*eyeOpacity.value))} />
        <Path path={rightBrow} style="stroke" strokeWidth={1.3} strokeCap="round" color={C.brow} opacity={useDerivedValue(()=>cl(0.52*eyeOpacity.value))} />
        <Circle cx={leftPupilX}  cy={pupilY} r={pupilR} color={C.pupilFill} opacity={eyeOpacity} />
        <Circle cx={rightPupilX} cy={pupilY} r={pupilR} color={C.pupilFill} opacity={eyeOpacity} />
        <Circle cx={useDerivedValue(()=>sf(leftPupilX.value-pupilR.value*0.28,cx-eyeSpacing))} cy={useDerivedValue(()=>sf(pupilY.value-pupilR.value*0.28,cy))} r={useDerivedValue(()=>sf(pupilR.value*0.32,eyeSize*0.09))} color="#FFFFFF" opacity={useDerivedValue(()=>isDark?0.95:0.82)} />
        <Circle cx={useDerivedValue(()=>sf(rightPupilX.value-pupilR.value*0.28,cx+eyeSpacing))} cy={useDerivedValue(()=>sf(pupilY.value-pupilR.value*0.28,cy))} r={useDerivedValue(()=>sf(pupilR.value*0.32,eyeSize*0.09))} color="#FFFFFF" opacity={useDerivedValue(()=>isDark?0.95:0.82)} />
        <Circle cx={leftPupilX}  cy={pupilY} r={useDerivedValue(()=>sf(pupilR.value*1.8,eyeSize*0.5))} opacity={useDerivedValue(()=>cl(cl(eyeGlow.value)*0.35))}>
          <RadialGradient c={vec(cx-eyeSpacing, cy-R*0.04)} r={eyeSize*1.2} colors={[C.eyeStroke, C.eyeFill, C.halo2]} />
        </Circle>
        <Circle cx={rightPupilX} cy={pupilY} r={useDerivedValue(()=>sf(pupilR.value*1.8,eyeSize*0.5))} opacity={useDerivedValue(()=>cl(cl(eyeGlow.value)*0.35))}>
          <RadialGradient c={vec(cx+eyeSpacing, cy-R*0.04)} r={eyeSize*1.2} colors={[C.eyeStroke, C.eyeFill, C.halo2]} />
        </Circle>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems:'center', justifyContent:'center', overflow:'visible' },
});
