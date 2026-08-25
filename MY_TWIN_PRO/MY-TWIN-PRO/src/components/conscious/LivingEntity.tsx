import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { mapEmotion } from '../../../engine/presence/EmotionToVisualMapper';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';
/**
 * LivingEntity v2.0 — الكيان الخفيف الموحّد (احتياط + طاقة منخفضة)
 * ================================================================
 * - بلا Skia / بلا SVG ⇒ يستحيل أن يكراش ناتيڤيًا (RN Views + Reanimated فقط).
 * - نفس مصدر ألوان الكيان الكامل: EmotionToVisualMapper ⇒ هوية واحدة لا تنقسم.
 * - وجه بيضاوي (borderRadius بيضاوي) يصدّد قرار «الوجه العضوي» حتى في الاحتياط.
 * - حياة خفيفة: تنفس مرتبط بالطاقة/النطق، رمش حقيقي، فم يتحرك مع الكلام،
 *   حلقة إصغاء، نواة صدر — كلها مشتقة من presence/state (بلا استطلاعات مستقلة).
 * - props متوافقة خلفيًا: state/size/intensity/speaking + presence/listening الجديدة.
 */
export interface LivingEntityProps {
  presence?: PresenceState | null;
  state?: string;
  size?: number;
  intensity?: number;
  speaking?: boolean;
  listening?: boolean;
}
const c01 = (n: unknown, fb = 0) => { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb; };

export default function LivingEntity({
  presence, state, size = 280, intensity = 0.7, speaking = false, listening = false,
}: LivingEntityProps) {
  const emotion = String(state ?? presence?.emotion ?? 'calm');
  const V = mapEmotion(emotion);
  const energy = c01(presence?.energy ?? 0.55, 0.55);
  const speak = speaking || !!presence?.speaking;
  const listen = listening || !!presence?.listening;

  const p = useSharedValue(0);
  const [blink, setBlink] = useState(false);

  // تنفس: أسرع مع الكلام، أبطأ مع انخفاض الطاقة
  useEffect(() => {
    p.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: speak ? 700 : 2600 + (1 - energy) * 1400, easing: Easing.inOut(Easing.sin) })
      ), -1, false);
  }, [speak, energy]);

  // رمش طبيعي 2.6-5.6ث
  useEffect(() => {
    let alive = true; let t1: any, t2: any;
    const loop = () => { if (!alive) return;
      t1 = setTimeout(() => { if (!alive) return; setBlink(true);
        t2 = setTimeout(() => { if (!alive) return; setBlink(false); loop(); }, 150);
      }, 2600 + Math.random() * 3000);
    };
    loop();
    return () => { alive = false; clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const body = useAnimatedStyle(() => ({ transform: [{ scale: 1 + p.value * 0.05 }], opacity: 0.75 + p.value * 0.25 }));
  const aura = useAnimatedStyle(() => ({ transform: [{ scale: 1 + p.value * 0.09 }], opacity: Math.min(1, (0.25 + energy * 0.3) * (listen ? 1.25 : 1)) }));

  const eyeH = blink ? size * 0.008 : size * 0.035 * Math.max(0.25, V.eyeOpenness);
  return (
    <View accessible accessibilityLabel={`MyTwin: ${emotion}`}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* القرص الكوزمي */}
      <View style={{ position: 'absolute', width: size * 0.96, height: size * 0.96, borderRadius: size, backgroundColor: '#05010D', opacity: 0.95 }} />
      {/* حلقة الهالة/الإصغاء */}
      <Animated.View style={[{ position: 'absolute', width: size * 0.8, height: size * 0.8, borderRadius: size, borderWidth: 1.2, borderColor: V.glow }, aura]} />
      {/* الوجه البيضاوي */}
      <Animated.View style={[{
        width: size * 0.46, height: size * 0.52, borderRadius: size * 0.26,
        backgroundColor: V.primary, shadowColor: V.glow, shadowOpacity: 0.6 * intensity, shadowRadius: 34, elevation: 6,
      }, body]} />
      {/* العيون (ترمش وتنخفض حسب الشعور) */}
      <View style={{ position: 'absolute', top: size * 0.40, flexDirection: 'row', gap: size * 0.11 }}>
        <View style={{ width: size * 0.065, height: eyeH, borderRadius: 999, backgroundColor: '#FFFFFF', opacity: 0.95 }} />
        <View style={{ width: size * 0.065, height: eyeH, borderRadius: 999, backgroundColor: '#FFFFFF', opacity: 0.95 }} />
      </View>
      {/* الفم (يتسع مع الكلام، منحني حسب الشعور) */}
      <View style={{
        position: 'absolute', top: size * 0.54,
        width: size * (speak ? 0.16 : 0.10), height: size * 0.014, borderRadius: 999,
        backgroundColor: V.secondary, opacity: speak ? 0.9 : 0.55,
        transform: [{ rotate: `${V.mouthCurve * -4}deg` }],
      }} />
      {/* نواة الصدر */}
      <Animated.View style={[{
        position: 'absolute', top: size * 0.62, width: size * 0.13, height: size * 0.13, borderRadius: size,
        backgroundColor: V.secondary, opacity: 0.45 + energy * 0.35,
        shadowColor: V.glow, shadowOpacity: 0.5, shadowRadius: 18, elevation: 4,
      }, body]} />
    </View>
  );
}
