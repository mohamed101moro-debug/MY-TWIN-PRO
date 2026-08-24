/**
 * EnergyCore v3.1 — النواة الضوئية النابضة (نسخة متكاملة محليًا)
 * =========================================
 * نواة ضوئية في مركز الكيان:
 * - تنبض بإيقاع القلب
 * - تتألق حسب الطاقة
 * - تتغير شدة الضوء حسب المزاج
 * - تتمدد عند الاستجابة (speaking/listening)
 * الإصلاحات: تمركز محلي + معرّفات فريدة + تكامل حي + blur خفيف + تزامن مع الغشاء.
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from 'react-native-svg';
import { stateBus } from '../../core/StateBus';
import { presenceEngine } from '../../core/PresenceBridge';

const clamp01 = (n: unknown, fb = 0) => { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb; };
const mapState = (e: string): EnergyCoreProps['state'] => {
  const s = String(e || '').toLowerCase();
  if (s.includes('happ') || s.includes('joy') || s.includes('excit')) return 'happy';
  if (s.includes('think') || s.includes('focus')) return 'thinking';
  if (s.includes('sad') || s.includes('fear')) return 'sad';
  if (s.includes('ang')) return 'angry';
  if (s.includes('surpr')) return 'surprised';
  if (s.includes('sleep')) return 'sleepy';
  if (s.includes('listen')) return 'listening';
  if (s.includes('respond') || s.includes('speak')) return 'responding';
  return 'calm';
};

export interface EnergyCoreProps {
  state?: 'idle' | 'calm' | 'listening' | 'thinking' | 'responding' | 'happy' | 'sad' | 'angry' | 'surprised' | 'sleepy';
  energy?: number;
  size?: number;
  pulseIntensity?: number;
  auto?: boolean;           // قيادة حية من المحركات
  speaking?: boolean;       // تألق عند الكلام
  listening?: boolean;      // تألق عند الإصغاء
  breathPhase?: Animated.SharedValue<number>; // تزامن مع الغشاء
  blurIntensity?: number;   // 0.5-2.0 (افتراضي 1.0)
}

const CORE_COLORS = {
  idle: { inner: '#6B3FD4', outer: '#2D1B4D', glow: '#6B3FD450' },
  calm: { inner: '#7C5FD4', outer: '#3D2B6B', glow: '#7C5FD460' },
  listening: { inner: '#5BA3D4', outer: '#2D5A7B', glow: '#5BA3D470' },
  thinking: { inner: '#6B7BD4', outer: '#3D4B7B', glow: '#6B7BD470' },
  responding: { inner: '#7B6BD4', outer: '#4D3B7B', glow: '#7B6BD480' },
  happy: { inner: '#F0C040', outer: '#B0801D', glow: '#F0C04080' },
  sad: { inner: '#4A7BD4', outer: '#1D3B6B', glow: '#4A7BD440' },
  angry: { inner: '#FF6060', outer: '#B02020', glow: '#FF606080' },
  surprised: { inner: '#60F0F0', outer: '#2AB0B0', glow: '#60F0F080' },
  sleepy: { inner: '#6B5BD4', outer: '#3D2B5B', glow: '#6B5BD430' },
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const EnergyCore: React.FC<EnergyCoreProps> = ({
  state = 'calm',
  energy = 0.5,
  size = 300,
  pulseIntensity = 1,
  auto = false,
  speaking = false,
  listening = false,
  breathPhase,
  blurIntensity = 1.0,
}) => {
  const uid = React.useId();
  const [liveState, setLiveState] = useState<NonNullable<EnergyCoreProps['state']>>('calm');
  const [liveSpeaking, setLiveSpeaking] = useState(false);
  const [liveListening, setLiveListening] = useState(false);
  const effectiveState = auto ? liveState : state;
  const effectiveSpeaking = auto ? liveSpeaking : speaking;
  const effectiveListening = auto ? liveListening : listening;
  const colors = CORE_COLORS[effectiveState] || CORE_COLORS.calm;

  const pulsePhase = useSharedValue(0);
  const energyVal = useSharedValue(energy);
  const speakVal = useSharedValue(effectiveSpeaking ? 1 : 0);
  const listenVal = useSharedValue(effectiveListening ? 1 : 0);

  // قيادة حية من المحركات (اختياري)
  useEffect(() => {
    if (!auto) return;
    const iv = setInterval(() => {
      const st: any = stateBus.getState();
      const pres: any = presenceEngine.getSnapshot();
      energyVal.value = withSpring(clamp01(st.energy ?? 0.5));
      setLiveSpeaking(!!st.speaking);
      setLiveListening(!!st.listening);
      setLiveState(mapState(String(pres?.emotion ?? st?.emotion ?? 'calm')));
    }, 300);
    return () => clearInterval(iv);
  }, [auto]);

  useEffect(() => {
    const pulseSpeed = effectiveState === 'angry' ? 600 : effectiveState === 'surprised' ? 800 : effectiveState === 'sleepy' ? 3000 : 1500;
    pulsePhase.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(Math.PI * 2, { duration: pulseSpeed, easing: Easing.inOutSine })
      ),
      -1,
      false
    );
    if (!auto) {
      energyVal.value = withSpring(energy, { damping: 15, stiffness: 100 });
      speakVal.value = withSpring(effectiveSpeaking ? 1 : 0);
      listenVal.value = withSpring(effectiveListening ? 1 : 0);
    }
  }, [effectiveState, energy, effectiveSpeaking, effectiveListening, auto]);

  const C = size / 2; // تمركز محلي

  const innerCoreProps = useAnimatedProps(() => {
    const pulse = Math.sin(pulsePhase.value) * 0.5 + 0.5;
    const breath = breathPhase ? (Math.sin(breathPhase.value) * 0.5 + 0.5) * 0.2 : 0;
    const speak = speakVal.value;
    const baseRadius = size * 0.08;
    const radius = baseRadius * (1 + (pulse + breath) * 0.3 * energyVal.value * pulseIntensity + speak * 0.25);
    return {
      r: radius,
      opacity: 0.8 + pulse * 0.2 * energyVal.value + speak * 0.15,
    };
  });

  const midCoreProps = useAnimatedProps(() => {
    const pulse = Math.sin(pulsePhase.value) * 0.5 + 0.5;
    const breath = breathPhase ? (Math.sin(breathPhase.value) * 0.5 + 0.5) * 0.15 : 0;
    const speak = speakVal.value;
    const listen = listenVal.value;
    const baseRadius = size * 0.12;
    const radius = baseRadius * (1 + (pulse + breath) * 0.2 * energyVal.value * pulseIntensity + speak * 0.2 + listen * 0.15);
    return {
      r: radius,
      opacity: 0.4 + pulse * 0.15 * energyVal.value + speak * 0.1 + listen * 0.08,
    };
  });

  const outerGlowProps = useAnimatedProps(() => {
    const pulse = Math.sin(pulsePhase.value) * 0.5 + 0.5;
    const breath = breathPhase ? (Math.sin(breathPhase.value) * 0.5 + 0.5) * 0.1 : 0;
    const speak = speakVal.value;
    const listen = listenVal.value;
    const baseRadius = size * 0.2;
    const radius = baseRadius * (1 + (pulse + breath) * 0.4 * energyVal.value * pulseIntensity + speak * 0.3 + listen * 0.2);
    return {
      r: radius,
      opacity: 0.2 + pulse * 0.3 * energyVal.value + speak * 0.15 + listen * 0.1,
    };
  });

  const innerCoreGrad = `${uid}-innerCoreGrad`;
  const midCoreGrad = `${uid}-midCoreGrad`;
  const outerGlowGrad = `${uid}-outerGlowGrad`;
  const coreBlur = `${uid}-coreBlur`;

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id={innerCoreGrad} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="30%" stopColor={colors.inner} stopOpacity="0.9" />
            <Stop offset="100%" stopColor={colors.outer} stopOpacity="0.5" />
          </RadialGradient>
          <RadialGradient id={midCoreGrad} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.inner} stopOpacity="0.8" />
            <Stop offset="50%" stopColor={colors.outer} stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#00000000" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={outerGlowGrad} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.glow} stopOpacity="0.6" />
            <Stop offset="50%" stopColor={colors.glow} stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#00000000" stopOpacity="0" />
          </RadialGradient>
          <Filter id={coreBlur}>
            <FeGaussianBlur stdDeviation={String(4 * blurIntensity)} result="blur" />
            <FeMerge>
              <FeMergeNode in="blur" />
              <FeMergeNode in="SourceGraphic" />
            </FeMerge>
          </Filter>
        </Defs>
        <AnimatedCircle cx={C} cy={C} animatedProps={outerGlowProps} fill={`url(#${outerGlowGrad})`} filter={`url(#${coreBlur})`} />
        <AnimatedCircle cx={C} cy={C} animatedProps={midCoreProps} fill={`url(#${midCoreGrad})`} />
        <AnimatedCircle cx={C} cy={C} animatedProps={innerCoreProps} fill={`url(#${innerCoreGrad})`} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({});

export default EnergyCore;
