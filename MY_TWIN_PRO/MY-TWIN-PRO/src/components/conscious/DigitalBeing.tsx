import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Circle, Path, RadialGradient, SweepGradient, vec } from '@shopify/react-native-skia';
import { useSharedValue, useFrameCallback, useDerivedValue, withTiming, cancelAnimation, Easing } from 'react-native-reanimated';
import type { PresenceState, RGB } from '../../../engine/presence/PresenceTypes';
/** DigitalBeing v4.1 — رندر كوزمي «غبي»: يستهلك presence فقط، بلا أي ذكاء في الواجهة. مضاد كراش. */
const sf = (n: number, fb = 0) => (Number.isFinite(n) ? n : fb);
const cl = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, Number.isFinite(n) ? n : a));
const PI2 = Math.PI * 2;
const rgba = (c: RGB, a = 1, mul = 1) =>
  `rgba(${Math.round(cl(c.r,0,255)*mul)},${Math.round(cl(c.g,0,255)*mul)},${Math.round(cl(c.b,0,255)*mul)},${cl(a).toFixed(3)})`;
const organic = (x: number, y: number, t: number) =>
  Math.sin(x*7.3+y*1.3+t*0.3)*0.5 + Math.sin(x*13.7-y*0.7+t*0.17)*0.3 + Math.sin(x*29.1+y*2.1-t*0.11)*0.2;
const buildMembranePath = (cx:number,cy:number,r:number,t:number,speed:number,turb:number,breath:number,pulse:number,tilt:number,layer:number): string => {
  'worklet';
  const pts = 64; const phase = t*speed*(0.8+layer*0.15);
  const br = 1 + Math.sin(t*0.65*breath)*0.022*breath;
  const pls = Math.max(0, Math.sin(t*2.4*pulse))*0.018*pulse;
  const tl = cl(tilt, 0.2, 0.95); let d = '';
  for (let i=0;i<=pts;i++){ const a=(i/pts)*PI2;
    const noise = organic(Math.cos(a),Math.sin(a),phase)*r*turb*0.06;
    const wob = Math.sin(a*3+phase*1.7)*r*turb*0.04 + Math.cos(a*5-phase*0.9)*r*turb*0.025;
    const rr = r*br*(1+pls)+wob+noise;
    d += `${i===0?'M':'L'} ${sf(cx+Math.cos(a)*rr,cx).toFixed(2)} ${sf(cy+Math.sin(a)*rr*tl,cy).toFixed(2)} `; }
  return d+'Z';
};
export interface BeingEnv { light?: number; noise?: number; motion?: number; listening?: boolean; camera?: boolean; userNear?: boolean; }
export default function DigitalBeing({ presence, size = 360, isDark = true, env, maturity = 0.8, userNear, awaken = 1 }: {
  presence: PresenceState; size?: number; isDark?: boolean;
  env?: { listening?: boolean; camera?: boolean; userNear?: boolean; light?: number; noise?: number; motion?: number };
  maturity?: number; userNear?: boolean; awaken?: number;
}) {
  const cx = size/2, cy = size/2, R = size*0.32;
  const A = presence?.colorA ?? { r:155,g:111,b:255 };
  const B = presence?.colorB ?? { r:70,g:139,b:255 };
  const E = presence?.eyeColor ?? { r:232,g:222,b:255 };
  const t = useSharedValue(0);
  const energy = useSharedValue(cl(presence?.energy ?? 0.55));
  const speed = useSharedValue(cl(presence?.fieldSpeed ?? 0.4, 0.05, 2));
  const turb = useSharedValue(cl(presence?.turbulence ?? 0.18));
  const tiltV = useSharedValue(cl(presence?.orbitality ?? 0.68, 0.2, 0.95));
  const fieldR = useSharedValue(cl(presence?.fieldRadius ?? 1, 0.5, 1.6));
  const fieldO = useSharedValue(cl(presence?.fieldOpacity ?? 0.85));
  const breath = useSharedValue(cl(presence?.breathing ?? 0.4));
  const pulse = useSharedValue(cl(presence?.pulse ?? 0.4));
  const eyeOpen = useSharedValue(cl(presence?.eyeOpenness ?? 0.85));
  const eyeGlow = useSharedValue(cl(presence?.eyeGlow ?? 0.88));
  const pupil = useSharedValue(cl(presence?.pupilSize ?? 0.42));
  const blinkV = useSharedValue(cl(presence?.blink ?? 0));
  const gazeX = useSharedValue(cl(presence?.gazeX ?? 0, -1, 1));
  const gazeY = useSharedValue(cl(presence?.gazeY ?? 0, -1, 1));
  const warmth = useSharedValue(cl(presence?.warmth ?? 0.35));
  const attn = useSharedValue(cl(presence?.attention ?? 0.5));
  const anticipate = useSharedValue(cl(presence?.anticipation ?? 0.25));
  const voice = useSharedValue(cl(presence?.voiceLevel ?? 0));
  useFrameCallback((f) => { t.value = sf(f.timeSinceFirstFrame, 0)/1000; });
  useEffect(() => () => { cancelAnimation(t); cancelAnimation(energy); }, []);
  const DUR = { duration: 600, easing: Easing.out(Easing.cubic) };
  const FAST = { duration: 220 };
  useEffect(() => {
    if (!presence) return;
    energy.value = withTiming(cl(presence.energy ?? 0.55), DUR);
    speed.value = withTiming(cl(presence.fieldSpeed ?? 0.4, 0.05, 2) * (presence.speaking ? 1.3 : presence.thinking ? 0.5 : 1), DUR);
    turb.value = withTiming(cl((presence.turbulence ?? 0.18) + (env?.noise ?? 0)*0.2 + (env?.motion ?? 0)*0.12), DUR);
    tiltV.value = withTiming(cl(presence.orbitality ?? 0.68, 0.2, 0.95), DUR);
    fieldR.value = withTiming(cl((presence.fieldRadius ?? 1) + ((env?.userNear || userNear) ? 0.07 : 0) + maturity*0.03, 0.5, 1.7), DUR);
    fieldO.value = withTiming(cl(presence.fieldOpacity ?? 0.85), DUR);
    breath.value = withTiming(cl(presence.breathing ?? 0.4), DUR);
    pulse.value = withTiming(cl(presence.pulse ?? 0.4), DUR);
    eyeOpen.value = withTiming(cl(presence.eyeOpenness ?? 0.85), FAST);
    eyeGlow.value = withTiming(cl(presence.eyeGlow ?? 0.88), FAST);
    pupil.value = withTiming(cl((presence.pupilSize ?? 0.42) + (1-(env?.light ?? 0.5))*0.2), FAST);
    blinkV.value = withTiming(cl(presence.blink ?? 0), { duration: 120 });
    gazeX.value = withTiming(cl(presence.gazeX ?? 0, -1, 1), { duration: 280 });
    gazeY.value = withTiming(cl(presence.gazeY ?? 0, -1, 1), { duration: 280 });
    if (env?.camera) { gazeX.value = withTiming(0, { duration: 400 }); gazeY.value = withTiming(0, { duration: 400 }); }
    warmth.value = withTiming(cl(presence.warmth ?? 0.35), DUR);
    attn.value = withTiming(cl(presence.attention ?? 0.5) + ((env?.userNear || presence.userPresent) ? 0.15 : 0), DUR);
    anticipate.value = withTiming(cl(presence.anticipation ?? 0.25), DUR);
    voice.value = withTiming(cl(presence.voiceLevel ?? 0), FAST);
  }, [presence, env]);
  const awakenV = useSharedValue(cl(awaken));
  useEffect(() => { awakenV.value = withTiming(cl(awaken), { duration: 900, easing: Easing.out(Easing.cubic) }); }, [awaken]);

  const mem1 = useDerivedValue(() => buildMembranePath(cx,cy,R*0.88*fieldR.value, sf(t.value), speed.value, turb.value, breath.value, pulse.value, tiltV.value, 0));
  const mem2 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.02*fieldR.value, sf(t.value), speed.value*0.87, turb.value, breath.value, pulse.value, tiltV.value*0.94, 1));
  const mem3 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.17*fieldR.value, sf(t.value), speed.value*0.74, turb.value*0.88, breath.value, pulse.value, tiltV.value*0.88, 2));
  const mem4 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.33*fieldR.value, sf(t.value), speed.value*0.62, turb.value*0.76, breath.value, pulse.value, tiltV.value*0.82, 3));
  const mem5 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.49*fieldR.value, sf(t.value), speed.value*0.51, turb.value*0.64, breath.value, pulse.value, tiltV.value*0.76, 4));
  const mem6 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.65*fieldR.value, sf(t.value), speed.value*0.41, turb.value*0.52, breath.value, pulse.value, tiltV.value*0.70, 5));
  const mem7 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.82*fieldR.value, sf(t.value), speed.value*0.32, turb.value*0.4, breath.value, pulse.value, tiltV.value*0.64, 6));
  const coreR = useDerivedValue(() => sf(R*0.52*(1+Math.sin(sf(t.value)*0.65*(1+breath.value))*0.04*breath.value+Math.max(0,Math.sin(sf(t.value)*2.8*(1+pulse.value)))*0.035*pulse.value+energy.value*0.06), R*0.52));
  const voiceR = useDerivedValue(() => sf(R*(1.55+voice.value*0.3+Math.sin(sf(t.value)*1.4)*0.025), R*1.55));
  const listenR = useDerivedValue(() => sf(R*(1.38+((env?.listening||presence?.listening)?0.12:0)+Math.sin(sf(t.value)*0.9)*0.02), R*1.38));
  const masterO = useDerivedValue(() => cl(0.55+energy.value*0.38+warmth.value*0.08)*fieldO.value*awakenV.value);
  const eyeSize = R*0.16;
  const sep = useSharedValue(presence?.eyeSeparation ?? R*0.38);
  const buildEye = (side: number) => useDerivedValue(() => {
    'worklet';
    const open = cl(eyeOpen.value) * (1 - cl(blinkV.value)*0.97);
    const squint = presence?.thinking ? 0.72 : 1;
    const H = Math.max(eyeSize*0.06, eyeSize*0.62*open*squint);
    const ecx = cx + side*sep.value + sf(gazeX.value*R*0.06,0);
    const ecy = cy - R*0.04 + sf(gazeY.value*R*0.04,0);
    const W = eyeSize*1.1; const top = ecy-H; const bot = ecy+H*0.85;
    const c1 = ecx-W*0.3, c2 = ecx+W*0.3;
    return `M ${ecx-W} ${ecy} C ${c1} ${top}, ${c2} ${top}, ${ecx+W} ${ecy} C ${c2} ${bot}, ${c1} ${bot}, ${ecx-W} ${ecy} Z`;
  });
  const leftEye = buildEye(-1); const rightEye = buildEye(1);
  const lPX = useDerivedValue(() => sf(cx-sep.value+gazeX.value*R*0.055, cx-sep.value));
  const rPX = useDerivedValue(() => sf(cx+sep.value+gazeX.value*R*0.055, cx+sep.value));
  const pY = useDerivedValue(() => sf(cy-R*0.04+gazeY.value*R*0.038, cy-R*0.04));
  const pR = useDerivedValue(() => sf(eyeSize*(0.28+pupil.value*0.28), eyeSize*0.28));
  const buildBrow = (side: number) => useDerivedValue(() => {
    'worklet';
    const em = presence?.emotion ?? 'calm';
    const baseX = cx+side*sep.value+cl(gazeX.value,-1,1)*R*0.04;
    const baseY = cy-R*0.22+cl(gazeY.value,-1,1)*R*0.03;
    const tilt = (em==='angry'?side*R*0.06:0)+(em==='sad'?-side*R*0.04:0);
    const raise = em==='surprised'?-R*0.04:0; const W = eyeSize*0.9;
    return `M ${baseX-W} ${baseY+tilt+raise} Q ${baseX} ${baseY-R*0.025+raise} ${baseX+W} ${baseY-tilt+raise}`;
  });
  const leftBrow = buildBrow(-1); const rightBrow = buildBrow(1);
  const eyeO = useDerivedValue(() => cl(0.72+eyeGlow.value*0.26)*cl(0.15+awakenV.value*0.85));
  const particlePath = useDerivedValue(() => {
    'worklet';
    const tv = sf(t.value); const ev = cl(energy.value); const av = cl(anticipate.value);
    const count = Math.round(60+ev*100+av*40); const orbitR = R*(1.1+ev*0.3); let d='';
    for (let i=0;i<count;i++){ const seed=i*13.271+(i%7)*0.37;
      const life=(tv*(0.04+(i%9)*0.006)+seed)%1; const fade=Math.sin(life*Math.PI);
      if (fade<0.05) continue;
      const angle=seed*2.618+tv*(0.015+(i%5)*0.007)*speed.value*(0.5+ev);
      const r=orbitR*(0.85+((i*37)%100)/100*0.55)*(0.88+life*0.24);
      const s=Math.max(0.3,(0.3+(((i*13)%10)/10)*(0.5+av))*fade*1.2);
      d+=`M ${sf(cx+Math.cos(angle)*r,cx).toFixed(1)} ${sf(cy+Math.sin(angle)*r*(tiltV.value*0.85+0.15),cy).toFixed(1)} l ${s.toFixed(1)} ${(s*0.4).toFixed(1)} `; }
    return d||'M 0 0';
  });
  const mul = isDark ? 1 : 0.78;
  const C = {
    core0: rgba(A, isDark?0.95:0.82, mul), core1: rgba(B, isDark?0.55:0.42, mul), core2: rgba(A, 0, mul),
    halo0: rgba(A, isDark?0.42:0.32, mul), halo1: rgba(B, isDark?0.22:0.16, mul), halo2: rgba(A, 0, mul),
    m1: rgba(B, isDark?0.72:0.56, mul), m2: rgba(A, isDark?0.58:0.44, mul), m3: rgba(B, isDark?0.48:0.36, mul),
    m4: rgba(A, isDark?0.38:0.28, mul), m5: rgba(B, isDark?0.30:0.22, mul), m6: rgba(A, isDark?0.22:0.16, mul), m7: rgba(B, isDark?0.16:0.11, mul),
    sweep0: rgba(B, isDark?0.28:0.18, mul), sweep1: rgba(A, isDark?0.28:0.18, mul),
    particle: rgba(B, isDark?0.42:0.28, mul),
    eyeFill: rgba(E, isDark?0.95:0.88, mul), eyeStroke: rgba(B, isDark?0.88:0.72, mul),
    pupilFill: isDark?'#FFFFFF':'#F0EEFF', brow: rgba(A, isDark?0.55:0.42, mul),
    voiceC: rgba(B, isDark?0.35:0.22, mul), listenC: rgba(A, isDark?0.28:0.18, mul), outer: rgba(A, isDark?0.14:0.09, mul),
  };
  return (
    <View accessible accessibilityLabel={`MyTwin: ${presence?.emotion ?? 'calm'}`} style={[styles.wrap, {width:size, height:size}]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle cx={cx} cy={cy} r={R*2.1} opacity={useDerivedValue(()=>cl(0.12+energy.value*0.1))}>
          <RadialGradient c={vec(cx,cy)} r={R*2.1} colors={[C.halo0, C.halo1, C.halo2]} />
        </Circle>
        <Path path={mem7} style="stroke" strokeWidth={0.55} color={C.m7} opacity={useDerivedValue(()=>cl(0.14+energy.value*0.1)*masterO.value)} />
        <Path path={mem6} style="stroke" strokeWidth={0.65} color={C.m6} opacity={useDerivedValue(()=>cl(0.18+energy.value*0.12)*masterO.value)} />
        <Path path={mem5} style="stroke" strokeWidth={0.8} color={C.m5} opacity={useDerivedValue(()=>cl(0.24+energy.value*0.14)*masterO.value)} />
        <Path path={mem4} style="stroke" strokeWidth={1.0} color={C.m4} opacity={useDerivedValue(()=>cl(0.30+energy.value*0.16)*masterO.value)} />
        <Path path={mem3} style="stroke" strokeWidth={1.2} color={C.m3} opacity={useDerivedValue(()=>cl(0.38+energy.value*0.18)*masterO.value)} />
        <Path path={mem2} style="stroke" strokeWidth={1.45} color={C.m2} opacity={useDerivedValue(()=>cl(0.48+energy.value*0.20)*masterO.value)} />
        <Path path={mem1} style="stroke" strokeWidth={1.7} color={C.m1} opacity={useDerivedValue(()=>cl(0.60+energy.value*0.22)*masterO.value)} />
        <Circle cx={cx} cy={cy} r={R*1.45} style="stroke" strokeWidth={1.1} opacity={useDerivedValue(()=>cl(attn.value*0.18+anticipate.value*0.12))}>
          <SweepGradient c={vec(cx,cy)} colors={[C.sweep0,'#FFFFFF08',C.sweep1,'#FFFFFF08',C.sweep0]} />
        </Circle>
        <Circle cx={cx} cy={cy} r={listenR} style="stroke" strokeWidth={0.7} color={C.listenC} opacity={useDerivedValue(()=>cl((env?.listening||presence?.listening)?0.32:0.05))} />
        <Circle cx={cx} cy={cy} r={voiceR} style="stroke" strokeWidth={0.75} color={C.voiceC} opacity={useDerivedValue(()=>cl(0.04+voice.value*0.38))} />
        <Circle cx={cx} cy={cy} r={R*2.05} style="stroke" strokeWidth={0.5} color={C.outer} opacity={0.9} />
        <Circle cx={cx} cy={cy} r={R*1.08} opacity={useDerivedValue(()=>cl(0.18+warmth.value*0.22+attn.value*0.12))}>
          <RadialGradient c={vec(cx,cy)} r={R*1.08} colors={[C.halo0, C.halo1, C.halo2]} />
        </Circle>
        <Circle cx={cx} cy={cy} r={coreR} opacity={useDerivedValue(()=>cl(0.78+energy.value*0.18))}>
          <RadialGradient c={vec(cx,cy)} r={R*0.72} colors={[C.core0, C.core1, C.core2]} />
        </Circle>
        <Circle cx={cx} cy={cy} r={useDerivedValue(()=>sf(coreR.value*0.55,R*0.28))} opacity={useDerivedValue(()=>cl(0.55+energy.value*0.35+warmth.value*0.1))}>
          <RadialGradient c={vec(cx,cy)} r={R*0.35} colors={[isDark?'#FFFFFF55':'#FFFFFF40', C.core0, C.core2]} />
        </Circle>
        <Path path={particlePath} style="stroke" strokeWidth={1.1} strokeCap="round" color={C.particle} opacity={useDerivedValue(()=>cl(isDark?0.42:0.28+energy.value*0.15))} />
        <Path path={leftEye} color={C.eyeFill} opacity={eyeO} />
        <Path path={rightEye} color={C.eyeFill} opacity={eyeO} />
        <Path path={leftEye} style="stroke" strokeWidth={1.1} color={C.eyeStroke} opacity={useDerivedValue(()=>cl(0.88*eyeO.value))} />
        <Path path={rightEye} style="stroke" strokeWidth={1.1} color={C.eyeStroke} opacity={useDerivedValue(()=>cl(0.88*eyeO.value))} />
        <Path path={leftBrow} style="stroke" strokeWidth={1.3} strokeCap="round" color={C.brow} opacity={useDerivedValue(()=>cl(0.52*eyeO.value))} />
        <Path path={rightBrow} style="stroke" strokeWidth={1.3} strokeCap="round" color={C.brow} opacity={useDerivedValue(()=>cl(0.52*eyeO.value))} />
        <Circle cx={lPX} cy={pY} r={pR} color={C.pupilFill} opacity={eyeO} />
        <Circle cx={rPX} cy={pY} r={pR} color={C.pupilFill} opacity={eyeO} />
        <Circle cx={useDerivedValue(()=>sf(lPX.value-pR.value*0.28,cx-sep.value))} cy={useDerivedValue(()=>sf(pY.value-pR.value*0.28,cy))} r={useDerivedValue(()=>sf(pR.value*0.32,eyeSize*0.09))} color="#FFFFFF" opacity={useDerivedValue(()=>isDark?0.95:0.82)} />
        <Circle cx={useDerivedValue(()=>sf(rPX.value-pR.value*0.28,cx+sep.value))} cy={useDerivedValue(()=>sf(pY.value-pR.value*0.28,cy))} r={useDerivedValue(()=>sf(pR.value*0.32,eyeSize*0.09))} color="#FFFFFF" opacity={useDerivedValue(()=>isDark?0.95:0.82)} />
        <Circle cx={lPX} cy={pY} r={useDerivedValue(()=>sf(pR.value*1.8,eyeSize*0.5))} opacity={useDerivedValue(()=>cl(eyeGlow.value*0.35))}>
          <RadialGradient c={vec(cx-sep.value, cy-R*0.04)} r={eyeSize*1.2} colors={[C.eyeStroke, C.eyeFill, C.halo2]} />
        </Circle>
        <Circle cx={rPX} cy={pY} r={useDerivedValue(()=>sf(pR.value*1.8,eyeSize*0.5))} opacity={useDerivedValue(()=>cl(eyeGlow.value*0.35))}>
          <RadialGradient c={vec(cx+sep.value, cy-R*0.04)} r={eyeSize*1.2} colors={[C.eyeStroke, C.eyeFill, C.halo2]} />
        </Circle>
      </Canvas>
    </View>
  );
}
const styles = StyleSheet.create({ wrap: { alignItems:'center', justifyContent:'center', overflow:'visible' } });
