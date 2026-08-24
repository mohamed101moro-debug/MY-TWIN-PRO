// @ts-nocheck
/**
 * ExpressiveEyes v2.0 — العيون العميقة التعبيرية (مستخرجة من DigitalBeing v5 + موسّعة)
 * =====================================================================================
 * أمانة الاستخراج (نفس ثوابت v5 ⇒ استمرارية بصرية):
 * - رمش: max(pow(sin(tv*0.71+side*1.7),36), pow(sin(tv*0.38+side*4.3),52)*0.7)
 * - لوزية: W=eyeSize*1.1 ، H=eyeSize*0.62*open ، bot=ecy+H*0.85
 * - نظر: ecx+=gazeX*sep*0.14 ، ecy+=gazeY*eyeSize*0.24
 * - حواجب: angry⇒side*eyeSize*0.375 ، sad⇒-side*eyeSize*0.25 ، surprised⇒رفع
 * التوسيع: قزحية RadialGradient + جفن علوي هلال + دموع حزن + browRaise من الـ Mapper.
 * القرار المعماري: بلا حياة مستقلة — t والـ SharedValues من المنسّق؛ يعيد عقد Skia داخل Canvas الأب.
 */
import React from 'react';
import { Path, Circle, RadialGradient, vec, BlurMask, Group } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

const sf = (n: number, fb = 0) => { 'worklet'; return Number.isFinite(n) ? n : fb; };
const cl = (n: number, a = 0, b = 1) => { 'worklet'; const v = Number.isFinite(n) ? n : a; return Math.max(a, Math.min(b, v)); };

const almond = (ecx: number, ecy: number, W: number, H: number): string => {
  'worklet';
  const top = ecy - H, bot = ecy + H * 0.85, c1 = ecx - W * 0.3, c2 = ecx + W * 0.3;
  return `M ${ecx - W} ${ecy} C ${c1} ${top}, ${c2} ${top}, ${ecx + W} ${ecy} C ${c2} ${bot}, ${c1} ${bot}, ${ecx - W} ${ecy} Z`;
};

/** هلال الجفن العلوي: بين قمة الفتح الكامل وقمة الفتح الحالي */
const lidCrescent = (ecx: number, ecy: number, W: number, Hfull: number, Hcur: number): string => {
  'worklet';
  const c1 = ecx - W * 0.3, c2 = ecx + W * 0.3;
  return `M ${ecx - W} ${ecy} C ${c1} ${ecy - Hfull}, ${c2} ${ecy - Hfull}, ${ecx + W} ${ecy} C ${c2} ${ecy - Hcur}, ${c1} ${ecy - Hcur}, ${ecx - W} ${ecy} Z`;
};

const browPath = (bx: number, by: number, W: number, tilt: number, raise: number): string => {
  'worklet';
  return `M ${bx - W} ${by + tilt + raise} Q ${bx} ${by - W * 0.28 + raise} ${bx + W} ${by - tilt + raise}`;
};

export interface ExpressiveEyesProps {
  t: any; cx: number; cy: number; sep: number; eyeSize: number;
  eyeOpen: any; eyeGlow: any; pupil: any; gazeX: any; gazeY: any; awaken: any;
  emotion?: string; browRaise?: number; tearOpacity?: number; squint?: number;
  thinkingMul?: number; envLight?: number;
  colors: { eyeFill: string; eyeStroke: string; brow: string; irisA: string; irisB: string; lid?: string; tear?: string };
}

export default function ExpressiveEyes(p: ExpressiveEyesProps) {
  const { t, cx, cy, sep, eyeSize, colors } = p;
  const emotion = p.emotion ?? 'calm';
  const browRaise = p.browRaise ?? 0.1;
  const tearOpacity = p.tearOpacity ?? 0;
  const squint = p.squint ?? 0;
  const thinkingMul = p.thinkingMul ?? 1;
  const envLight = p.envLight ?? 0.5;
  const lidColor = colors.lid ?? '#06030F';
  const tearColor = colors.tear ?? '#60A5FA';

  const buildEye = (side: number) => useDerivedValue(() => {
    'worklet';
    const tv = sf(t.value);
    const blink = Math.max(
      Math.pow(Math.max(0, Math.sin(tv * 0.71 + side * 1.7)), 36),
      Math.pow(Math.max(0, Math.sin(tv * 0.38 + side * 4.3)), 52) * 0.7
    );
    const open = cl(p.eyeOpen.value) * (1 - cl(blink * 0.97)) * thinkingMul * (1 - cl(squint) * 0.35);
    const ecx = cx + side * sep + cl(p.gazeX.value, -1, 1) * sep * 0.14;
    const ecy = cy + cl(p.gazeY.value, -1, 1) * eyeSize * 0.24;
    const W = eyeSize * 1.1;
    const H = Math.max(eyeSize * 0.06, eyeSize * 0.62 * cl(open, 0.05, 1.2));
    return almond(ecx, ecy, W, H);
  });

  const buildLid = (side: number) => useDerivedValue(() => {
    'worklet';
    const tv = sf(t.value);
    const blink = Math.max(
      Math.pow(Math.max(0, Math.sin(tv * 0.71 + side * 1.7)), 36),
      Math.pow(Math.max(0, Math.sin(tv * 0.38 + side * 4.3)), 52) * 0.7
    );
    const open = cl(p.eyeOpen.value) * (1 - cl(blink * 0.97)) * thinkingMul * (1 - cl(squint) * 0.35);
    const ecx = cx + side * sep + cl(p.gazeX.value, -1, 1) * sep * 0.14;
    const ecy = cy + cl(p.gazeY.value, -1, 1) * eyeSize * 0.24;
    const W = eyeSize * 1.1;
    const Hfull = eyeSize * 0.62;
    const Hcur = Math.max(eyeSize * 0.06, Hfull * cl(open, 0.05, 1.2));
    return lidCrescent(ecx, ecy, W, Hfull, Hcur);
  });

  const leftEye = buildEye(-1);
  const rightEye = buildEye(1);
  const leftLid = buildLid(-1);
  const rightLid = buildLid(1);

  const lPX = useDerivedValue(() => sf(cx - sep + cl(p.gazeX.value, -1, 1) * sep * 0.14, cx - sep));
  const rPX = useDerivedValue(() => sf(cx + sep + cl(p.gazeX.value, -1, 1) * sep * 0.14, cx + sep));
  const pY = useDerivedValue(() => sf(cy + cl(p.gazeY.value, -1, 1) * eyeSize * 0.24, cy));
  const pupilV = useDerivedValue(() => cl(p.pupil.value + (1 - envLight) * 0.2));
  const irisR = useDerivedValue(() => sf(eyeSize * 0.42 * (0.8 + pupilV.value * 0.3), eyeSize * 0.3));
  const pupR = useDerivedValue(() => sf(irisR.value * (0.45 + pupilV.value * 0.25), eyeSize * 0.14));
  const hlR = useDerivedValue(() => sf(pupR.value * 0.35, eyeSize * 0.05));
  const eyeO = useDerivedValue(() => cl(0.72 + p.eyeGlow.value * 0.26) * cl(0.15 + p.awaken.value * 0.85));
  const glowO = useDerivedValue(() => cl(p.eyeGlow.value * 0.45));

  const buildBrow = (side: number) => useDerivedValue(() => {
    'worklet';
    const em = emotion;
    const baseX = cx + side * sep + cl(p.gazeX.value, -1, 1) * sep * 0.1;
    const baseY = cy - eyeSize * 1.375 + cl(p.gazeY.value, -1, 1) * eyeSize * 0.19;
    const tilt = (em === 'angry' ? side * eyeSize * 0.375 : 0) + (em === 'sad' ? -side * eyeSize * 0.25 : 0);
    const raise = (em === 'surprised' ? -eyeSize * 0.25 : 0) - browRaise * eyeSize * 0.3;
    return browPath(baseX, baseY, eyeSize * 0.9, tilt, raise);
  });
  const leftBrow = buildBrow(-1);
  const rightBrow = buildBrow(1);

  const tearO = useDerivedValue(() => cl(tearOpacity) * cl(p.eyeOpen.value) * cl(0.2 + p.awaken.value * 0.8));

  return (
    <>
      {/* توهج العيون (Blur) */}
      <Group>
        <Circle cx={lPX} cy={pY} r={useDerivedValue(() => sf(pupilV.value * 0 + irisR.value * 2.2, eyeSize * 0.6))} opacity={glowO}>
          <RadialGradient c={vec(cx - sep, cy)} r={eyeSize * 1.4} colors={[colors.eyeStroke, colors.eyeFill, colors.eyeStroke + '00']} />
        </Circle>
        <Circle cx={rPX} cy={pY} r={useDerivedValue(() => sf(irisR.value * 2.2, eyeSize * 0.6))} opacity={glowO}>
          <RadialGradient c={vec(cx + sep, cy)} r={eyeSize * 1.4} colors={[colors.eyeStroke, colors.eyeFill, colors.eyeStroke + '00']} />
        </Circle>
        <BlurMask blur={2.5} style="normal" respectCTM />
      </Group>
      {/* بياض العيون */}
      <Path path={leftEye} color={colors.eyeFill} opacity={eyeO} />
      <Path path={rightEye} color={colors.eyeFill} opacity={eyeO} />
      {/* القزحية المتدرجة */}
      <Circle cx={lPX} cy={pY} r={irisR} opacity={eyeO}>
        <RadialGradient c={vec(cx - sep, cy)} r={irisR} colors={[colors.irisA, colors.irisB, '#1A0A2E']} />
      </Circle>
      <Circle cx={rPX} cy={pY} r={irisR} opacity={eyeO}>
        <RadialGradient c={vec(cx + sep, cy)} r={irisR} colors={[colors.irisA, colors.irisB, '#1A0A2E']} />
      </Circle>
      {/* البؤبؤان */}
      <Circle cx={lPX} cy={pY} r={pupR} color="#12042E" opacity={eyeO} />
      <Circle cx={rPX} cy={pY} r={pupR} color="#12042E" opacity={eyeO} />
      {/* بريق البؤبؤ */}
      <Circle cx={useDerivedValue(() => sf(lPX.value - pupR.value * 0.3, cx - sep))} cy={useDerivedValue(() => sf(pY.value - pupR.value * 0.3, cy))} r={hlR} color="#FFFFFF" opacity={0.96} />
      <Circle cx={useDerivedValue(() => sf(rPX.value - pupR.value * 0.3, cx + sep))} cy={useDerivedValue(() => sf(pY.value - pupR.value * 0.3, cy))} r={hlR} color="#FFFFFF" opacity={0.96} />
      {/* الجفنان العلويان */}
      <Path path={leftLid} color={lidColor} opacity={0.92} />
      <Path path={rightLid} color={lidColor} opacity={0.92} />
      {/* حافة العيون */}
      <Path path={leftEye} style="stroke" strokeWidth={1.1} color={colors.eyeStroke} opacity={useDerivedValue(() => cl(0.88 * eyeO.value))} />
      <Path path={rightEye} style="stroke" strokeWidth={1.1} color={colors.eyeStroke} opacity={useDerivedValue(() => cl(0.88 * eyeO.value))} />
      {/* الحواجب */}
      <Path path={leftBrow} style="stroke" strokeWidth={1.3} strokeCap="round" color={colors.brow} opacity={useDerivedValue(() => cl(0.52 * eyeO.value))} />
      <Path path={rightBrow} style="stroke" strokeWidth={1.3} strokeCap="round" color={colors.brow} opacity={useDerivedValue(() => cl(0.52 * eyeO.value))} />
      {/* دموع الحزن */}
      <Circle cx={useDerivedValue(() => sf(lPX.value - eyeSize * 0.55, cx - sep))} cy={useDerivedValue(() => sf(pY.value + eyeSize * 0.55, cy))} r={eyeSize * 0.09} color={tearColor} opacity={tearO} />
      <Circle cx={useDerivedValue(() => sf(rPX.value + eyeSize * 0.55, cx + sep))} cy={useDerivedValue(() => sf(pY.value + eyeSize * 0.55, cy))} r={eyeSize * 0.09} color={tearColor} opacity={tearO} />
    </>
  );
}
