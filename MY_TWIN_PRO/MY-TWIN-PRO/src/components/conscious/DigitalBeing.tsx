// @ts-nocheck
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas, Circle, Path, RadialGradient, SweepGradient,
  vec, BlurMask, Group, Paint,
} from '@shopify/react-native-skia';
import {
  useSharedValue, useFrameCallback, useDerivedValue,
  withTiming, cancelAnimation, Easing,
} from 'react-native-reanimated';
import type { PresenceState, RGB } from '../../../engine/presence/PresenceTypes';

/** DigitalBeing v5.0 — Volumetric Glow + BlurMask + Specular */

const sf = (n: number, fb = 0) => (Number.isFinite(n) ? n : fb);
const cl = (n: number, a = 0, b = 1) =>
  Math.max(a, Math.min(b, Number.isFinite(n) ? n : a));
const PI2 = Math.PI * 2;

const rgba = (c: RGB, a = 1, mul = 1) =>
  `rgba(${Math.round(cl(c.r,0,255)*mul)},${Math.round(cl(c.g,0,255)*mul)},${Math.round(cl(c.b,0,255)*mul)},${cl(a).toFixed(3)})`;

const organic = (x: number, y: number, t: number) =>
  Math.sin(x*7.3+y*1.3+t*0.3)*0.5 +
  Math.sin(x*13.7-y*0.7+t*0.17)*0.3 +
  Math.sin(x*29.1+y*2.1-t*0.11)*0.2;

// ── الغشاء الحي ──
const buildMembranePath = (
  cx:number, cy:number, r:number, t:number,
  speed:number, turb:number, breath:number,
  pulse:number, tilt:number, layer:number
): string => {
  'worklet';
  const pts = 72;
  const phase = t * speed * (0.8 + layer*0.15);
  const br = 1 + Math.sin(t*0.65*breath)*0.022*breath;
  const pls = Math.max(0, Math.sin(t*2.4*pulse))*0.018*pulse;
  const tl = cl(tilt, 0.2, 0.95);
  let d = '';
  for (let i=0; i<=pts; i++) {
    const a = (i/pts)*PI2;
    const noise = organic(Math.cos(a), Math.sin(a), phase)*r*turb*0.06;
    const wob = Math.sin(a*3+phase*1.7)*r*turb*0.04
              + Math.cos(a*5-phase*0.9)*r*turb*0.025
              + Math.sin(a*7+phase*0.5)*r*turb*0.012;
    const rr = r*br*(1+pls)+wob+noise;
    d += `${i===0?'M':'L'} ${sf(cx+Math.cos(a)*rr,cx).toFixed(2)} ${sf(cy+Math.sin(a)*rr*tl,cy).toFixed(2)} `;
  }
  return d+'Z';
};

// ── مسار الغشاء للـ Fill الشفاف ──
const buildMembraneFilledPath = (
  cx:number, cy:number, rOuter:number, rInner:number,
  t:number, speed:number, turb:number,
  breath:number, pulse:number, tilt:number, layer:number
): string => {
  'worklet';
  const outer = buildMembranePath(cx,cy,rOuter,t,speed,turb,breath,pulse,tilt,layer);
  const inner = buildMembranePath(cx,cy,rInner,t,speed*0.85,turb*0.6,breath,pulse,tilt,layer+0.5);
  return outer + ' ' + inner;
};

export interface BeingEnv {
  light?: number; noise?: number; motion?: number;
  listening?: boolean; camera?: boolean; userNear?: boolean;
}

export default function DigitalBeing({
  presence, size = 360, isDark = true, env, maturity = 0.8, awaken = 1,
}: {
  presence: PresenceState; size?: number; isDark?: boolean;
  env?: BeingEnv; maturity?: number; userNear?: boolean; awaken?: number;
}) {
  const cx = size/2, cy = size/2, R = size*0.32;
  const eyeSep = R*0.38;
  const eyeSize = R*0.16;

  const A = presence?.colorA ?? { r:155, g:111, b:255 };
  const B = presence?.colorB ?? { r:70,  g:139, b:255 };
  const E = presence?.eyeColor ?? { r:232, g:222, b:255 };

  // ── Shared Values ──
  const t         = useSharedValue(0);
  const energy    = useSharedValue(cl(presence?.energy ?? 0.55));
  const speed     = useSharedValue(cl(presence?.fieldSpeed ?? 0.4, 0.05, 2));
  const turb      = useSharedValue(cl(presence?.turbulence ?? 0.18));
  const tiltV     = useSharedValue(cl(presence?.orbitality ?? 0.68, 0.2, 0.95));
  const fieldR    = useSharedValue(cl(presence?.fieldRadius ?? 1, 0.5, 1.6));
  const fieldO    = useSharedValue(cl(presence?.fieldOpacity ?? 0.85));
  const breath    = useSharedValue(cl(presence?.breathing ?? 0.4));
  const pulse     = useSharedValue(cl(presence?.pulse ?? 0.4));
  const eyeOpen   = useSharedValue(cl(presence?.eyeOpenness ?? 0.85));
  const eyeGlow   = useSharedValue(cl(presence?.eyeGlow ?? 0.88));
  const pupil     = useSharedValue(cl(presence?.pupilSize ?? 0.42));
  const gazeX     = useSharedValue(cl(presence?.gazeX ?? 0, -1, 1));
  const gazeY     = useSharedValue(cl(presence?.gazeY ?? 0, -1, 1));
  const warmth    = useSharedValue(cl(presence?.warmth ?? 0.35));
  const attn      = useSharedValue(cl(presence?.attention ?? 0.5));
  const anticipate= useSharedValue(cl(presence?.anticipation ?? 0.25));
  const voice     = useSharedValue(cl(presence?.voiceLevel ?? 0));
  const awakenV   = useSharedValue(cl(awaken));

  useFrameCallback((f) => { t.value = sf(f.timeSinceFirstFrame,0)/1000; });
  useEffect(() => () => { cancelAnimation(t); cancelAnimation(energy); }, []);

  const DUR  = { duration: 600, easing: Easing.out(Easing.cubic) };
  const FAST = { duration: 220 };

  useEffect(() => {
    if (!presence) return;
    energy.value    = withTiming(cl(presence.energy ?? 0.55), DUR);
    speed.value     = withTiming(cl(presence.fieldSpeed ?? 0.4, 0.05, 2)*(presence.speaking?1.3:presence.thinking?0.5:1), DUR);
    turb.value      = withTiming(cl((presence.turbulence??0.18)+(env?.noise??0)*0.2+(env?.motion??0)*0.12), DUR);
    tiltV.value     = withTiming(cl(presence.orbitality??0.68, 0.2, 0.95), DUR);
    fieldR.value    = withTiming(cl((presence.fieldRadius??1)+((env?.userNear)?0.07:0)+maturity*0.03, 0.5, 1.7), DUR);
    fieldO.value    = withTiming(cl(presence.fieldOpacity??0.85), DUR);
    breath.value    = withTiming(cl(presence.breathing??0.4), DUR);
    pulse.value     = withTiming(cl(presence.pulse??0.4), DUR);
    eyeOpen.value   = withTiming(cl(presence.eyeOpenness??0.85), FAST);
    eyeGlow.value   = withTiming(cl(presence.eyeGlow??0.88), FAST);
    pupil.value     = withTiming(cl((presence.pupilSize??0.42)+(1-(env?.light??0.5))*0.2), FAST);
    gazeX.value     = withTiming(cl(env?.camera?0:(presence.gazeX??0), -1, 1), { duration: 280 });
    gazeY.value     = withTiming(cl(env?.camera?0:(presence.gazeY??0), -1, 1), { duration: 280 });
    warmth.value    = withTiming(cl(presence.warmth??0.35), DUR);
    attn.value      = withTiming(cl((presence.attention??0.5)+(env?.userNear?0.15:0)), DUR);
    anticipate.value= withTiming(cl(presence.anticipation??0.25), DUR);
    voice.value     = withTiming(cl(presence.voiceLevel??0), FAST);
  }, [presence, env]);

  useEffect(() => {
    awakenV.value = withTiming(cl(awaken), { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [awaken]);

  // ── Derived: الغشاء 7 طبقات ──
  const mem1 = useDerivedValue(() => buildMembranePath(cx,cy,R*0.88*fieldR.value,sf(t.value),speed.value,turb.value,breath.value,pulse.value,tiltV.value,0));
  const mem2 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.02*fieldR.value,sf(t.value),speed.value*0.87,turb.value,breath.value,pulse.value,tiltV.value*0.94,1));
  const mem3 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.17*fieldR.value,sf(t.value),speed.value*0.74,turb.value*0.88,breath.value,pulse.value,tiltV.value*0.88,2));
  const mem4 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.33*fieldR.value,sf(t.value),speed.value*0.62,turb.value*0.76,breath.value,pulse.value,tiltV.value*0.82,3));
  const mem5 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.49*fieldR.value,sf(t.value),speed.value*0.51,turb.value*0.64,breath.value,pulse.value,tiltV.value*0.76,4));
  const mem6 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.65*fieldR.value,sf(t.value),speed.value*0.41,turb.value*0.52,breath.value,pulse.value,tiltV.value*0.70,5));
  const mem7 = useDerivedValue(() => buildMembranePath(cx,cy,R*1.82*fieldR.value,sf(t.value),speed.value*0.32,turb.value*0.4,breath.value,pulse.value,tiltV.value*0.64,6));

  // ── Fill شفاف للغشاء الداخلي ──
  const fillInner = useDerivedValue(() => buildMembranePath(cx,cy,R*0.95*fieldR.value,sf(t.value),speed.value*0.9,turb.value*0.7,breath.value,pulse.value,tiltV.value*0.96,0.3));

  // ── النواة ──
  const coreR = useDerivedValue(() =>
    sf(R*0.52*(1+Math.sin(sf(t.value)*0.65*(1+breath.value))*0.04*breath.value
      +Math.max(0,Math.sin(sf(t.value)*2.8*(1+pulse.value)))*0.035*pulse.value
      +energy.value*0.06), R*0.52)
  );
  const innerCoreR = useDerivedValue(() => sf(coreR.value*0.55, R*0.28));
  const specularR  = useDerivedValue(() => sf(coreR.value*0.22, R*0.11));

  // ── الحلقات ──
  const voiceR  = useDerivedValue(() => sf(R*(1.55+voice.value*0.3+Math.sin(sf(t.value)*1.4)*0.025), R*1.55));
  const listenR = useDerivedValue(() => sf(R*(1.38+((env?.listening||presence?.listening)?0.12:0)+Math.sin(sf(t.value)*0.9)*0.02), R*1.38));
  const masterO = useDerivedValue(() => cl(0.55+energy.value*0.38+warmth.value*0.08)*fieldO.value*awakenV.value);

  // ── العيون ──
  const buildEye = (side: number) => useDerivedValue(() => {
    'worklet';
    const tv = sf(t.value);
    const blink = Math.max(
      Math.pow(Math.max(0,Math.sin(tv*0.71+side*1.7)),36),
      Math.pow(Math.max(0,Math.sin(tv*0.38+side*4.3)),52)*0.7
    );
    const open = cl(eyeOpen.value)*(1-cl(blink*0.97))*(presence?.thinking?0.72:1);
    const ecx = cx+side*eyeSep+cl(gazeX.value,-1,1)*R*0.055;
    const ecy = cy-R*0.04+cl(gazeY.value,-1,1)*R*0.038;
    const W = eyeSize*1.1;
    const H = Math.max(eyeSize*0.06, eyeSize*0.62*open);
    const top=ecy-H, bot=ecy+H*0.85;
    const c1=ecx-W*0.3, c2=ecx+W*0.3;
    return `M ${ecx-W} ${ecy} C ${c1} ${top}, ${c2} ${top}, ${ecx+W} ${ecy} C ${c2} ${bot}, ${c1} ${bot}, ${ecx-W} ${ecy} Z`;
  });
  const leftEye  = buildEye(-1);
  const rightEye = buildEye(1);

  const lPX = useDerivedValue(() => sf(cx-eyeSep+gazeX.value*R*0.055, cx-eyeSep));
  const rPX = useDerivedValue(() => sf(cx+eyeSep+gazeX.value*R*0.055, cx+eyeSep));
  const pY  = useDerivedValue(() => sf(cy-R*0.04+gazeY.value*R*0.038, cy-R*0.04));
  const pR  = useDerivedValue(() => sf(eyeSize*(0.28+pupil.value*0.28), eyeSize*0.28));

  const buildBrow = (side: number) => useDerivedValue(() => {
    'worklet';
    const em = presence?.emotion ?? 'calm';
    const baseX = cx+side*eyeSep+cl(gazeX.value,-1,1)*R*0.04;
    const baseY = cy-R*0.22+cl(gazeY.value,-1,1)*R*0.03;
    const tilt  = (em==='angry'?side*R*0.06:0)+(em==='sad'?-side*R*0.04:0);
    const raise = em==='surprised'?-R*0.04:0;
    const W = eyeSize*0.9;
    return `M ${baseX-W} ${baseY+tilt+raise} Q ${baseX} ${baseY-R*0.025+raise} ${baseX+W} ${baseY-tilt+raise}`;
  });
  const leftBrow  = buildBrow(-1);
  const rightBrow = buildBrow(1);
  const eyeO = useDerivedValue(() => cl(0.72+eyeGlow.value*0.26)*cl(0.15+awakenV.value*0.85));

  // ── الجسيمات ──
  const particlePath = useDerivedValue(() => {
    'worklet';
    const tv=sf(t.value), ev=cl(energy.value), av=cl(anticipate.value);
    const count = Math.round(80+ev*120+av*50);
    const orbitR = R*(1.05+ev*0.35);
    let d='';
    for (let i=0; i<count; i++) {
      const seed=i*13.271+(i%7)*0.37;
      const life=(tv*(0.04+(i%9)*0.006)+seed)%1;
      const fade=Math.sin(life*Math.PI);
      if (fade<0.04) continue;
      const angle=seed*2.618+tv*(0.015+(i%5)*0.007)*speed.value*(0.5+ev);
      const r=orbitR*(0.75+((i*37)%100)/100*0.7)*(0.85+life*0.3);
      // جسيمات بأحجام متنوعة
      const sBase = (i%3===0)?1.8:(i%3===1)?1.1:0.6;
      const s=Math.max(0.3, sBase*(0.3+(((i*13)%10)/10)*(0.5+av))*fade);
      const px=sf(cx+Math.cos(angle)*r,cx);
      const py=sf(cy+Math.sin(angle)*r*(tiltV.value*0.85+0.15),cy);
      d+=`M ${px.toFixed(1)} ${py.toFixed(1)} l ${s.toFixed(1)} ${(s*0.4).toFixed(1)} `;
    }
    return d||'M 0 0';
  });

  // ── الألوان ──
  const mul = isDark ? 1 : 0.78;
  const C = {
    core0:    rgba(A, isDark?0.95:0.82, mul),
    core1:    rgba(B, isDark?0.55:0.42, mul),
    core2:    rgba(A, 0, mul),
    halo0:    rgba(A, isDark?0.42:0.32, mul),
    halo1:    rgba(B, isDark?0.22:0.16, mul),
    halo2:    rgba(A, 0, mul),
    fill:     rgba(A, isDark?0.06:0.04, mul),
    m1: rgba(B, isDark?0.72:0.56, mul), m2: rgba(A, isDark?0.58:0.44, mul),
    m3: rgba(B, isDark?0.48:0.36, mul), m4: rgba(A, isDark?0.38:0.28, mul),
    m5: rgba(B, isDark?0.30:0.22, mul), m6: rgba(A, isDark?0.22:0.16, mul),
    m7: rgba(B, isDark?0.16:0.11, mul),
    sweep0:   rgba(B, isDark?0.28:0.18, mul),
    sweep1:   rgba(A, isDark?0.28:0.18, mul),
    particle: rgba(B, isDark?0.55:0.35, mul),
    eyeFill:  rgba(E, isDark?0.95:0.88, mul),
    eyeStroke:rgba(B, isDark?0.88:0.72, mul),
    brow:     rgba(A, isDark?0.55:0.42, mul),
    voiceC:   rgba(B, isDark?0.35:0.22, mul),
    listenC:  rgba(A, isDark?0.28:0.18, mul),
    outer:    rgba(A, isDark?0.14:0.09, mul),
  };

  return (
    <View
      accessible
      accessibilityLabel={`MyTwin: ${presence?.emotion ?? 'calm'}`}
      style={[styles.wrap, {width:size, height:size}]}
    >
      <Canvas style={StyleSheet.absoluteFill}>

        {/* ── 1. الهالة الخارجية الكبيرة مع Blur ── */}
        <Group>
          <Circle cx={cx} cy={cy} r={R*2.1} opacity={useDerivedValue(()=>cl(0.14+energy.value*0.12))}>
            <RadialGradient c={vec(cx,cy)} r={R*2.1} colors={[C.halo0, C.halo1, C.halo2]} />
          </Circle>
          <BlurMask blur={isDark?22:15} style="normal" respectCTM />
        </Group>

        {/* ── 2. طبقات الغشاء الخارجية ── */}
        <Path path={mem7} style="stroke" strokeWidth={0.55} color={C.m7} opacity={useDerivedValue(()=>cl(0.14+energy.value*0.1)*masterO.value)} />
        <Path path={mem6} style="stroke" strokeWidth={0.65} color={C.m6} opacity={useDerivedValue(()=>cl(0.18+energy.value*0.12)*masterO.value)} />
        <Path path={mem5} style="stroke" strokeWidth={0.8}  color={C.m5} opacity={useDerivedValue(()=>cl(0.24+energy.value*0.14)*masterO.value)} />
        <Path path={mem4} style="stroke" strokeWidth={1.0}  color={C.m4} opacity={useDerivedValue(()=>cl(0.30+energy.value*0.16)*masterO.value)} />

        {/* ── 3. الغشاء الداخلي مع Fill شفاف ── */}
        <Path path={fillInner} color={C.fill} opacity={useDerivedValue(()=>cl(0.5+energy.value*0.3)*awakenV.value)} />
        <Path path={mem3} style="stroke" strokeWidth={1.2}  color={C.m3} opacity={useDerivedValue(()=>cl(0.38+energy.value*0.18)*masterO.value)} />
        <Path path={mem2} style="stroke" strokeWidth={1.45} color={C.m2} opacity={useDerivedValue(()=>cl(0.48+energy.value*0.20)*masterO.value)} />
        <Path path={mem1} style="stroke" strokeWidth={1.7}  color={C.m1} opacity={useDerivedValue(()=>cl(0.60+energy.value*0.22)*masterO.value)} />

        {/* ── 4. الدوران الكوني ── */}
        <Circle cx={cx} cy={cy} r={R*1.45} style="stroke" strokeWidth={1.1}
          opacity={useDerivedValue(()=>cl(attn.value*0.18+anticipate.value*0.12))}>
          <SweepGradient c={vec(cx,cy)} colors={[C.sweep0,'#FFFFFF08',C.sweep1,'#FFFFFF08',C.sweep0]} />
        </Circle>

        {/* ── 5. حلقة الإصغاء ── */}
        <Circle cx={cx} cy={cy} r={listenR} style="stroke" strokeWidth={0.7}
          color={C.listenC}
          opacity={useDerivedValue(()=>cl((env?.listening||presence?.listening)?0.32:0.05))} />

        {/* ── 6. موجة الصوت ── */}
        <Circle cx={cx} cy={cy} r={voiceR} style="stroke" strokeWidth={0.75}
          color={C.voiceC}
          opacity={useDerivedValue(()=>cl(0.04+voice.value*0.38))} />

        {/* ── 7. الحلقة الخارجية ── */}
        <Circle cx={cx} cy={cy} r={R*2.05} style="stroke" strokeWidth={0.5}
          color={C.outer} opacity={0.9} />

        {/* ── 8. المجال العاطفي مع Blur ── */}
        <Group>
          <Circle cx={cx} cy={cy} r={R*1.08}
            opacity={useDerivedValue(()=>cl(0.22+warmth.value*0.28+attn.value*0.15))}>
            <RadialGradient c={vec(cx,cy)} r={R*1.08} colors={[C.halo0, C.halo1, C.halo2]} />
          </Circle>
          <BlurMask blur={isDark?14:10} style="solid" respectCTM />
        </Group>

        {/* ── 9. النواة الضوئية مع Blur ── */}
        <Group>
          <Circle cx={cx} cy={cy} r={coreR}
            opacity={useDerivedValue(()=>cl(0.82+energy.value*0.16))}>
            <RadialGradient c={vec(cx,cy)} r={R*0.72} colors={[C.core0, C.core1, C.core2]} />
          </Circle>
          <BlurMask blur={isDark?8:5} style="solid" respectCTM />
        </Group>

        {/* ── 10. التوهج الداخلي للنواة ── */}
        <Group>
          <Circle cx={cx} cy={cy} r={innerCoreR}
            opacity={useDerivedValue(()=>cl(0.6+energy.value*0.38+warmth.value*0.12))}>
            <RadialGradient c={vec(cx,cy)} r={R*0.35}
              colors={[isDark?'#FFFFFF66':'#FFFFFF44', C.core0, C.core2]} />
          </Circle>
          <BlurMask blur={6} style="solid" respectCTM />
        </Group>

        {/* ── 11. Specular Highlight — النقطة الضوئية ── */}
        <Circle
          cx={cx - R*0.12}
          cy={cy - R*0.18}
          r={specularR}
          opacity={useDerivedValue(()=>cl(0.55+energy.value*0.35)*awakenV.value)}
          color={isDark?'#FFFFFF':'#FFFFFFCC'}
        />

        {/* ── 12. الجسيمات مع Blur خفيف ── */}
        <Group>
          <Path path={particlePath} style="stroke" strokeWidth={1.3} strokeCap="round"
            color={C.particle}
            opacity={useDerivedValue(()=>cl(isDark?0.55:0.35+energy.value*0.18))} />
          <BlurMask blur={1.5} style="normal" respectCTM />
        </Group>

        {/* ── 13. ملء العيون ── */}
        <Path path={leftEye}  color={C.eyeFill} opacity={eyeO} />
        <Path path={rightEye} color={C.eyeFill} opacity={eyeO} />

        {/* ── 14. توهج العيون بـ Blur ── */}
        <Group>
          <Circle cx={lPX} cy={pY} r={useDerivedValue(()=>sf(pR.value*2.2, eyeSize*0.6))}
            opacity={useDerivedValue(()=>cl(eyeGlow.value*0.45))}>
            <RadialGradient c={vec(cx-eyeSep, cy-R*0.04)} r={eyeSize*1.4}
              colors={[C.eyeStroke, C.eyeFill, C.halo2]} />
          </Circle>
          <Circle cx={rPX} cy={pY} r={useDerivedValue(()=>sf(pR.value*2.2, eyeSize*0.6))}
            opacity={useDerivedValue(()=>cl(eyeGlow.value*0.45))}>
            <RadialGradient c={vec(cx+eyeSep, cy-R*0.04)} r={eyeSize*1.4}
              colors={[C.eyeStroke, C.eyeFill, C.halo2]} />
          </Circle>
          <BlurMask blur={5} style="normal" respectCTM />
        </Group>

        {/* ── 15. حافة العيون ── */}
        <Path path={leftEye}  style="stroke" strokeWidth={1.1} color={C.eyeStroke} opacity={useDerivedValue(()=>cl(0.88*eyeO.value))} />
        <Path path={rightEye} style="stroke" strokeWidth={1.1} color={C.eyeStroke} opacity={useDerivedValue(()=>cl(0.88*eyeO.value))} />

        {/* ── 16. الحواجب ── */}
        <Path path={leftBrow}  style="stroke" strokeWidth={1.3} strokeCap="round" color={C.brow} opacity={useDerivedValue(()=>cl(0.52*eyeO.value))} />
        <Path path={rightBrow} style="stroke" strokeWidth={1.3} strokeCap="round" color={C.brow} opacity={useDerivedValue(()=>cl(0.52*eyeO.value))} />

        {/* ── 17. البؤبؤان ── */}
        <Circle cx={lPX} cy={pY} r={pR} color={isDark?'#FFFFFF':'#F0EEFF'} opacity={eyeO} />
        <Circle cx={rPX} cy={pY} r={pR} color={isDark?'#FFFFFF':'#F0EEFF'} opacity={eyeO} />

        {/* ── 18. Highlight البؤبؤ ── */}
        <Circle
          cx={useDerivedValue(()=>sf(lPX.value-pR.value*0.3, cx-eyeSep))}
          cy={useDerivedValue(()=>sf(pY.value-pR.value*0.3, cy))}
          r={useDerivedValue(()=>sf(pR.value*0.35, eyeSize*0.1))}
          color="#FFFFFF"
          opacity={useDerivedValue(()=>isDark?0.96:0.84)}
        />
        <Circle
          cx={useDerivedValue(()=>sf(rPX.value-pR.value*0.3, cx+eyeSep))}
          cy={useDerivedValue(()=>sf(pY.value-pR.value*0.3, cy))}
          r={useDerivedValue(()=>sf(pR.value*0.35, eyeSize*0.1))}
          color="#FFFFFF"
          opacity={useDerivedValue(()=>isDark?0.96:0.84)}
        />

      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems:'center', justifyContent:'center', overflow:'visible' },
});
