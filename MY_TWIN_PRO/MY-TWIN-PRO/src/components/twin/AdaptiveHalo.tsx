/**
 * AdaptiveHalo v3.1 — الهالة الخارجية المتكيفة (نسخة متكاملة محليًا)
 * ================================================
 * هالة خارجية تستجيب للبيئة والحالة:
 * - تتسع عند قرب المستخدم
 * - تتقلص عند الإضاءة المنخفضة
 * - تتغير لونها حسب المزاج
 * - تتأرجح مع الحركة
 * - تنبض مع النواة
 * - تتوهج عند الكلام/الإصغاء
 * الإصلاحات: تمركز محلي + معرّفات فريدة + تكامل حي + sweep ring + جسيمات مدارية + تزامن مع الغشاء.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop, SweepGradient, Filter, FeGaussianBlur } from 'react-native-svg';
import { stateBus } from '../../core/StateBus';
import { presenceEngine } from '../../core/PresenceBridge';

const clamp01 = (n: unknown, fb = 0) => { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb; };
const mapState = (e: string): AdaptiveHaloProps['state'] => {
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

export interface AdaptiveHaloProps {
  state?: 'idle' | 'calm' | 'listening' | 'thinking' | 'responding' | 'happy' | 'sad' | 'angry' | 'surprised' | 'sleepy';
  energy?: number;
  size?: number;
  proximity?: number;
  ambientLight?: number;
  movement?: number;
  auto?: boolean;
  speaking?: boolean;
  listening?: boolean;
  breathPhase?: Animated.SharedValue<number>;
  blurIntensity?: number;
}

const HALO_CONFIGS = {
  idle: { color: '#4A3F6B', secondary: '#2D1B4D', opacity: 0.15, speed: 5000, sweepOpacity: 0.08 },
  calm: { color: '#5B4F8C', secondary: '#3D2B6B', opacity: 0.20, speed: 4000, sweepOpacity: 0.12 },
  listening: { color: '#4A7C9B', secondary: '#2D5A7B', opacity: 0.25, speed: 3500, sweepOpacity: 0.18 },
  thinking: { color: '#5B6B9B', secondary: '#3D4B7B', opacity: 0.22, speed: 3000, sweepOpacity: 0.20 },
  responding: { color: '#6B5B9B', secondary: '#4D3B7B', opacity: 0.30, speed: 2500, sweepOpacity: 0.24 },
  happy: { color: '#D4A03D', secondary: '#B0801D', opacity: 0.40, speed: 2000, sweepOpacity: 0.30 },
  sad: { color: '#3B5B8B', secondary: '#1D3B6B', opacity: 0.15, speed: 6000, sweepOpacity: 0.08 },
  angry: { color: '#D44A4A', secondary: '#B02020', opacity: 0.45, speed: 1500, sweepOpacity: 0.35 },
  surprised: { color: '#4AD4D4', secondary: '#2AB0B0', opacity: 0.40, speed: 1800, sweepOpacity: 0.32 },
  sleepy: { color: '#5B4B7B', secondary: '#3D2B5B', opacity: 0.10, speed: 7000, sweepOpacity: 0.05 },
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const AdaptiveHalo: React.FC<AdaptiveHaloProps> = ({
  state = 'calm',
  energy = 0.5,
  size = 300,
  proximity = 0,
  ambientLight = 0.5,
  movement = 0,
  auto = false,
  speaking = false,
  listening = false,
  breathPhase,
  blurIntensity = 1.0,
}) => {
  const uid = React.useId();
  const [liveState, setLiveState] = useState<NonNullable<AdaptiveHaloProps['state']>>('calm');
  const [liveSpeaking, setLiveSpeaking] = useState(false);
  const [liveListening, setLiveListening] = useState(false);
  const effectiveState = auto ? liveState : state;
  const effectiveSpeaking = auto ? liveSpeaking : speaking;
  const effectiveListening = auto ? liveListening : listening;
  const config = HALO_CONFIGS[effectiveState] || HALO_CONFIGS.calm;

  const pulsePhase = useSharedValue(0);
  const energyVal = useSharedValue(energy);
  const proximityVal = useSharedValue(proximity);
  const lightVal = useSharedValue(ambientLight);
  const movementVal = useSharedValue(movement);
  const speakVal = useSharedValue(effectiveSpeaking ? 1 : 0);
  const listenVal = useSharedValue(effectiveListening ? 1 : 0);

  useEffect(() => {
    if (!auto) return;
    const iv = setInterval(() => {
      const st: any = stateBus.getState();
      const pres: any = presenceEngine.getSnapshot();
      energyVal.value = withSpring(clamp01(st.energy ?? 0.5));
      proximityVal.value = withSpring(clamp01(st.proximity ?? 0));
      lightVal.value = withSpring(clamp01(st.ambientLight ?? 0.5));
      movementVal.value = withSpring(clamp01(st.movement ?? 0));
      setLiveSpeaking(!!st.speaking);
      setLiveListening(!!st.listening);
      setLiveState(mapState(String(pres?.emotion ?? st?.emotion ?? 'calm')));
    }, 300);
    return () => clearInterval(iv);
  }, [auto]);

  useEffect(() => {
    pulsePhase.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(Math.PI * 2, { duration: config.speed, easing: Easing.inOutSine })
      ),
      -1,
      false
    );
    if (!auto) {
      energyVal.value = withSpring(energy, { damping: 15, stiffness: 100 });
      proximityVal.value = withSpring(proximity, { damping: 20, stiffness: 80 });
      lightVal.value = withSpring(ambientLight, { damping: 10, stiffness: 50 });
      movementVal.value = withSpring(movement, { damping: 10, stiffness: 50 });
      speakVal.value = withSpring(effectiveSpeaking ? 1 : 0);
      listenVal.value = withSpring(effectiveListening ? 1 : 0);
    }
  }, [effectiveState, energy, proximity, ambientLight, movement, effectiveSpeaking, effectiveListening, config.speed, auto]);

  // جسيمات مدارية للهالة (تتكاثر مع الطاقة)
  const haloParticles = useMemo(() => {
    const count = Math.round(8 + energy * 12);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (i / count) * Math.PI * 2,
      distance: size * 0.78,
      speed: 0.3 + Math.random() * 0.5,
      size: 1.5 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [energy, size]);

  const C = size / 2; // تمركز محلي

  // الهالة الخارجية الرئيسية
  const outerHaloProps = useAnimatedProps(() => {
    const pulse = Math.sin(pulsePhase.value) * 0.5 + 0.5;
    const breath = breathPhase ? (Math.sin(breathPhase.value) * 0.5 + 0.5) * 0.12 : 0;
    const prox = proximityVal.value;
    const light = lightVal.value;
    const move = movementVal.value;
    const speak = speakVal.value;
    const baseRadius = size * 0.80;
    const radius = baseRadius * (1 + prox * 0.20) * (1 + move * 0.10) * (1 + (pulse + breath) * 0.05 + speak * 0.08);
    const opacity = config.opacity * energyVal.value * Math.max(0.2, light) * (0.5 + pulse * 0.5) + speak * 0.15;
    return { r: radius, opacity: Math.max(0, opacity) };
  });

  // الهالة الداخلية (أكثر تركيزًا)
  const innerHaloProps = useAnimatedProps(() => {
    const pulse = Math.sin(pulsePhase.value + Math.PI) * 0.5 + 0.5; // معاكس للخارجية
    const breath = breathPhase ? (Math.sin(breathPhase.value + Math.PI) * 0.5 + 0.5) * 0.15 : 0;
    const prox = proximityVal.value;
    const light = lightVal.value;
    const speak = speakVal.value;
    const listen = listenVal.value;
    const baseRadius = size * 0.58;
    const radius = baseRadius * (1 + prox * 0.12) * (1 + (pulse + breath) * 0.08 + speak * 0.06 + listen * 0.04);
    const opacity = (config.opacity + 0.12) * energyVal.value * Math.max(0.25, light) * (0.6 + pulse * 0.4) + speak * 0.12 + listen * 0.08;
    return { r: radius, opacity: Math.max(0, opacity) };
  });

  // حلقة sweep دوارة (تأثير الدوران الكوني)
  const sweepRingProps = useAnimatedProps(() => {
    const pulse = Math.sin(pulsePhase.value * 2) * 0.5 + 0.5;
    const speak = speakVal.value;
    const baseRadius = size * 0.68;
    const radius = baseRadius * (1 + speak * 0.05);
    const opacity = config.sweepOpacity * energyVal.value * (0.6 + pulse * 0.4) + speak * 0.08;
    return { r: radius, opacity: Math.max(0, opacity) };
  });

  const outerGrad = `${uid}-outerGrad`;
  const innerGrad = `${uid}-innerGrad`;
  const sweepGrad = `${uid}-sweepGrad`;
  const outerBlur = `${uid}-outerBlur`;

  const containerStyle = useAnimatedStyle(() => {
    const move = movementVal.value;
    const angle = Math.sin(pulsePhase.value * 0.3) * move * 1.5;
    return { transform: [{ rotate: `${angle}deg` }] };
  });

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Animated.View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, containerStyle]}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Defs>
            <RadialGradient id={outerGrad} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={config.color} stopOpacity="0.4" />
              <Stop offset="50%" stopColor={config.secondary} stopOpacity="0.2" />
              <Stop offset="100%" stopColor="#00000000" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id={innerGrad} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={config.color} stopOpacity="0.6" />
              <Stop offset="60%" stopColor={config.secondary} stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#00000000" stopOpacity="0" />
            </RadialGradient>
            <SweepGradient id={sweepGrad} cx="50%" cy="50%">
              <Stop offset="0%" stopColor={config.color} stopOpacity="0.6" />
              <Stop offset="25%" stopColor="#FFFFFF00" stopOpacity="0" />
              <Stop offset="50%" stopColor={config.secondary} stopOpacity="0.4" />
              <Stop offset="75%" stopColor="#FFFFFF00" stopOpacity="0" />
              <Stop offset="100%" stopColor={config.color} stopOpacity="0.6" />
            </SweepGradient>
            <Filter id={outerBlur}>
              <FeGaussianBlur stdDeviation={String(6 * blurIntensity)} />
            </Filter>
          </Defs>

          {/* الهالة الخارجية الكبيرة */}
          <AnimatedCircle
            cx={C}
            cy={C}
            animatedProps={outerHaloProps}
            fill={`url(#${outerGrad})`}
            filter={`url(#${outerBlur})`}
          />

          {/* حلقة sweep الدوارة */}
          <AnimatedCircle
            cx={C}
            cy={C}
            animatedProps={sweepRingProps}
            stroke={`url(#${sweepGrad})`}
            strokeWidth={1.5}
            fill="#00000000"
          />

          {/* الهالة الداخلية */}
          <AnimatedCircle
            cx={C}
            cy={C}
            animatedProps={innerHaloProps}
            fill={`url(#${innerGrad})`}
          />

          {/* جسيمات مدارية حول الهالة */}
          {haloParticles.map((p) => (
            <HaloParticle
              key={p.id}
              particle={p}
              pulsePhase={pulsePhase}
              energyVal={energyVal}
              speakVal={speakVal}
              config={config}
              cx={C}
              cy={C}
            />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
};

interface HaloParticleProps {
  particle: {
    id: number;
    angle: number;
    distance: number;
    speed: number;
    size: number;
    phase: number;
  };
  pulsePhase: Animated.SharedValue<number>;
  energyVal: Animated.SharedValue<number>;
  speakVal: Animated.SharedValue<number>;
  config: { color: string; opacity: number };
  cx: number;
  cy: number;
}

const HaloParticle: React.FC<HaloParticleProps> = ({
  particle,
  pulsePhase,
  energyVal,
  speakVal,
  config,
  cx,
  cy,
}) => {
  const particleProps = useAnimatedProps(() => {
    const t = pulsePhase.value;
    const energy = energyVal.value;
    const speak = speakVal.value;
    const angle = particle.angle + t * particle.speed * (0.5 + energy * 0.5) * 0.2;
    const distance = particle.distance * (1 + Math.sin(t + particle.phase) * 0.08 * energy + speak * 0.04);
    const x = cx + Math.cos(angle) * distance;
    const y = cy + Math.sin(angle) * distance;
    const size = particle.size * (0.7 + Math.sin(t * 2 + particle.phase) * 0.3) * (0.5 + energy * 0.5);
    const opacity = config.opacity * (0.4 + energy * 0.4) * (0.6 + Math.sin(t + particle.phase) * 0.4);
    return { cx: x, cy: y, r: Math.max(0.5, size), opacity: Math.max(0, opacity) };
  });
  return <AnimatedCircle animatedProps={particleProps} fill={config.color} />;
};

const styles = StyleSheet.create({});

export default AdaptiveHalo;
