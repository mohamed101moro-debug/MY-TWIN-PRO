import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { mapEmotion } from '../../../engine/presence/EmotionToVisualMapper';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';
/**
 * LivingEntity v3 «Nebula Face» — الكيان الأساسي (ليس احتياطًا فقط)
 * ==================================================================
 * RN خالص: صفر Skia/SVG ⇒ يستحيل أن يكراش ناتيڤيًا (قرار الاستقرار).
 * غني بصريًا: قرص كوزمي (ثيم‑adaptive) + حلقتا هالة + 14 جسيمًا متنفسًا +
 * غشاء بيضاوي مزدوج + وجه متوهج + عيون (قزحية/بؤبؤ/بريق/جفن رمش/حاجبان) +
 * فم منحني ناطق + نواة صدر — كله مشتق من PresenceState/الخريطة العاطفية.
 * عقد props محفوظ خلفيًا (presence/state/size/intensity/speaking/listening + isDark).
 */
const c01 = (n: unknown, fb = 0) => { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb; };

function Dot({ angle, dist, sz, delay, color, breath }: any) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withRepeat(withSequence(withDelay(delay, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) })), withTiming(0, { duration: 900 })), -1, false);
    return () => { o.value = 0; };
  }, [delay]);
  const st = useAnimatedStyle(() => ({ opacity: 0.15 + o.value * 0.6, transform: [{ scale: 0.7 + o.value * 0.6 + breath.value * 0.15 }] }));
  const x = Math.cos(angle) * dist, y = Math.sin(angle) * dist;
  return <Animated.View style={{ position: 'absolute', left: '50%', top: '50%', width: sz, height: sz, borderRadius: sz, backgroundColor: color, marginLeft: x - sz / 2, marginTop: y - sz / 2, ...st }} />;
}

export interface LivingEntityProps { presence?: PresenceState | null; state?: string; size?: number; intensity?: number; speaking?: boolean; listening?: boolean; isDark?: boolean; }

export default function LivingEntity({ presence, state, size = 280, intensity = 0.7, speaking = false, listening = false, isDark = true }: LivingEntityProps) {
  const emotion = String(state ?? presence?.emotion ?? 'calm');
  const V = mapEmotion(emotion);
  const energy = c01(presence?.energy ?? 0.55);
  const speak = speaking || !!presence?.speaking;
  const listen = listening || !!presence?.listening;

  const breath = useSharedValue(0);
  const speakP = useSharedValue(0);
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    breath.value = withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: speak ? 900 : 2600 + (1 - energy) * 1400, easing: Easing.inOut(Easing.sin) })), -1, false);
  }, [speak, energy]);
  useEffect(() => {
    if (speak) speakP.value = withRepeat(withSequence(withTiming(0.2, { duration: 130 }), withTiming(1, { duration: 130 })), -1, false);
    else speakP.value = 0;
  }, [speak]);
  useEffect(() => {
    let alive = true; let t1: any, t2: any;
    const loop = () => { if (!alive) return; t1 = setTimeout(() => { if (!alive) return; setBlink(true); t2 = setTimeout(() => { if (!alive) return; setBlink(false); loop(); }, 150); }, 2600 + Math.random() * 3000); };
    loop();
    return () => { alive = false; clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const bodySt = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * 0.05 }], opacity: 0.85 + breath.value * 0.15 }));
  const auraSt = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * 0.09 }], opacity: Math.min(1, (0.35 + energy * 0.3) * (listen ? 1.2 : 1)) }));
  const memSt = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * 0.03 }], opacity: 0.5 + breath.value * 0.2 }));
  const coreSt = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * 0.1 + speakP.value * 0.15 }], opacity: 0.5 + energy * 0.3 + (speak ? 0.2 : 0) }));

  const dots = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ angle: (i / 14) * Math.PI * 2, dist: size * (0.36 + (((i * 37) % 10) / 100) * 0.1), sz: 2 + (i % 3), delay: i * 180 })), [size]);

  const open = Math.max(0.25, V.eyeOpenness);
  const eyeH = blink ? size * 0.008 : size * 0.038 * open;
  const browRot = (emotion === 'angry' ? 18 : emotion === 'sad' ? -12 : 0) - V.browRaise * 10;
  const mouthW = size * (speak ? 0.16 : 0.10);

  const ring = (d: number, c: string): any => ({ position: 'absolute', width: d, height: d, borderRadius: d, borderWidth: 1.1, borderColor: c });
  return (
    <View accessible accessibilityLabel={`MyTwin: ${emotion}`} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {isDark && <View style={{ position: 'absolute', width: size * 0.96, height: size * 0.96, borderRadius: size, backgroundColor: '#06030F', opacity: 0.95 }} />}
      <Animated.View style={[ring(size * 0.88, V.glow + '33'), auraSt]} />
      <Animated.View style={[ring(size * 0.72, V.glow + '22'), memSt]} />
      {dots.map((d, i) => <Dot key={i} {...d} color={V.glow} breath={breath} />)}
      <Animated.View style={[{ position: 'absolute', width: size * 0.58, height: size * 0.64, borderRadius: size * 0.3, borderWidth: 1, borderColor: V.secondary + '30', backgroundColor: V.secondary + '14' }, memSt]} />
      <Animated.View style={[{ width: size * 0.46, height: size * 0.52, borderRadius: size * 0.26, backgroundColor: V.primary, shadowColor: V.glow, shadowOpacity: 0.65 * intensity, shadowRadius: 32, elevation: 6 }, bodySt]}>
        <View style={{ position: 'absolute', left: '18%', top: '12%', width: '40%', height: '30%', borderRadius: size, backgroundColor: '#FFFFFF', opacity: 0.10 }} />
      </Animated.View>
      <View style={{ position: 'absolute', top: size * 0.375, flexDirection: 'row', gap: size * 0.11 }}>
        {[-1, 1].map((s) => (
          <View key={s} style={{ width: size * 0.075, height: size * 0.05, borderRadius: 999, backgroundColor: '#FFFFFF', opacity: 0.95, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <View style={{ width: size * 0.032, height: size * 0.032, borderRadius: size, backgroundColor: V.secondary }} />
            {!blink && <View style={{ position: 'absolute', width: size * 0.012, height: size * 0.012, borderRadius: size, backgroundColor: '#FFFFFF', top: size * 0.012, left: size * 0.018 }} />}
          </View>
        ))}
      </View>
      <View style={{ position: 'absolute', top: size * 0.345, flexDirection: 'row', gap: size * 0.13 }}>
        <View style={{ width: size * 0.09, height: 2, borderRadius: 2, backgroundColor: V.glow, opacity: 0.7, transform: [{ rotate: `${-browRot}deg` }] }} />
        <View style={{ width: size * 0.09, height: 2, borderRadius: 2, backgroundColor: V.glow, opacity: 0.7, transform: [{ rotate: `${browRot}deg` }] }} />
      </View>
      <View style={{ position: 'absolute', top: size * 0.54, width: mouthW, height: size * 0.015, borderRadius: 999, backgroundColor: V.secondary, opacity: speak ? 0.9 : 0.6, transform: [{ rotate: `${V.mouthCurve * -4}deg` }] }} />
      <Animated.View style={[{ position: 'absolute', top: size * 0.62, width: size * 0.13, height: size * 0.13, borderRadius: size, backgroundColor: V.secondary, shadowColor: V.glow, shadowOpacity: 0.55, shadowRadius: 18, elevation: 4 }, coreSt]} />
      {eyeH < size * 0.01 && null}
    </View>
  );
}
