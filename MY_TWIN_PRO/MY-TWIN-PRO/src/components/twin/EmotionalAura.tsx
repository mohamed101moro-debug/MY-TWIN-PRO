/**
 * EmotionalAura v3.1 — الهالة العاطفية الملونة (نسخة متكاملة محليًا)
 * ==============================================
 * هالة ضوئية حول الكيان تتغير لونها وكثافتها وسرعتها
 * بناءً على الحالة العاطفية والطاقة والقرب.
 * الإصلاحات: تمركز محلي + معرّفات فريدة + جسيمات ديناميكية + تكامل حي + blur خفيف.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from 'react-native-svg';
import { stateBus } from '../../core/StateBus';
import { presenceEngine } from '../../core/PresenceBridge';

const clamp01 = (n: unknown, fb = 0) => { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb; };
const mapState = (e: string): EmotionalAuraProps['state'] => {
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

export interface AuraConfig {
  color: string;
  secondaryColor: string;
  glowColor: string;
  pulseSpeed: number;
  intensity: number;
  particleCount: number;
  turbulence: number;
}

export interface EmotionalAuraProps {
  state?: 'idle' | 'calm' | 'listening' | 'thinking' | 'responding' | 'happy' | 'sad' | 'angry' | 'surprised' | 'sleepy';
  energy?: number;
  size?: number;
  proximity?: number;
  auto?: boolean;           // قيادة حية من المحركات
  breathPhase?: Animated.SharedValue<number>; // تزامن مع الغشاء
  blurIntensity?: number;   // 0.5-2.0 (افتراضي 1.0)
}

const AURA_CONFIGS: Record<string, AuraConfig> = {
  idle: { color: '#4A3F6B', secondaryColor: '#2D1B4D', glowColor: '#6B3FD420', pulseSpeed: 4000, intensity: 0.3, particleCount: 20, turbulence: 0.2 },
  calm: { color: '#5B4F8C', secondaryColor: '#3D2B6B', glowColor: '#7C5FD430', pulseSpeed: 3000, intensity: 0.4, particleCount: 30, turbulence: 0.3 },
  listening: { color: '#4A7C9B', secondaryColor: '#2D5A7B', glowColor: '#5BA3D440', pulseSpeed: 2500, intensity: 0.5, particleCount: 40, turbulence: 0.4 },
  thinking: { color: '#5B6B9B', secondaryColor: '#3D4B7B', glowColor: '#6B7BD440', pulseSpeed: 2000, intensity: 0.5, particleCount: 35, turbulence: 0.5 },
  responding: { color: '#6B5B9B', secondaryColor: '#4D3B7B', glowColor: '#7B6BD450', pulseSpeed: 1800, intensity: 0.6, particleCount: 45, turbulence: 0.4 },
  happy: { color: '#D4A03D', secondaryColor: '#B0801D', glowColor: '#F0C04060', pulseSpeed: 1500, intensity: 0.8, particleCount: 60, turbulence: 0.6 },
  sad: { color: '#3B5B8B', secondaryColor: '#1D3B6B', glowColor: '#4A7BD430', pulseSpeed: 5000, intensity: 0.3, particleCount: 15, turbulence: 0.2 },
  angry: { color: '#D44A4A', secondaryColor: '#B02020', glowColor: '#FF606060', pulseSpeed: 1000, intensity: 0.9, particleCount: 50, turbulence: 0.8 },
  surprised: { color: '#4AD4D4', secondaryColor: '#2AB0B0', glowColor: '#60F0F060', pulseSpeed: 1200, intensity: 0.85, particleCount: 55, turbulence: 0.7 },
  sleepy: { color: '#5B4B7B', secondaryColor: '#3D2B5B', glowColor: '#6B5BD420', pulseSpeed: 6000, intensity: 0.2, particleCount: 10, turbulence: 0.1 },
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const EmotionalAura: React.FC<EmotionalAuraProps> = ({
  state = 'calm',
  energy = 0.5,
  size = 300,
  proximity = 0,
  auto = false,
  breathPhase,
  blurIntensity = 1.0,
}) => {
  const uid = React.useId();
  const [liveState, setLiveState] = useState<NonNullable<EmotionalAuraProps['state']>>('calm');
  const effectiveState = auto ? liveState : state;
  const config = AURA_CONFIGS[effectiveState] || AURA_CONFIGS.calm;

  const pulsePhase = useSharedValue(0);
  const energyVal = useSharedValue(energy);
  const proximityVal = useSharedValue(proximity);

  // قيادة حية من المحركات (اختياري)
  useEffect(() => {
    if (!auto) return;
    const iv = setInterval(() => {
      const st: any = stateBus.getState();
      const pres: any = presenceEngine.getSnapshot();
      energyVal.value = withSpring(clamp01(st.energy ?? 0.5));
      proximityVal.value = withSpring(clamp01(st.proximity ?? 0));
      setLiveState(mapState(String(pres?.emotion ?? st?.emotion ?? 'calm')));
    }, 300);
    return () => clearInterval(iv);
  }, [auto]);

  useEffect(() => {
    pulsePhase.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(Math.PI * 2, { duration: config.pulseSpeed, easing: Easing.inOutSine })
      ),
      -1,
      false
    );
    if (!auto) {
      energyVal.value = withSpring(energy, { damping: 15, stiffness: 100 });
      proximityVal.value = withSpring(proximity, { damping: 20, stiffness: 80 });
    }
  }, [effectiveState, energy, proximity, config.pulseSpeed, auto]);

  // جسيمات ديناميكية تتكيف مع الطاقة
  const particles = useMemo(() => {
    const count = Math.round(config.particleCount * (0.6 + energy * 0.4));
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (i / count) * Math.PI * 2 + Math.random() * 0.5,
      distance: size * (0.5 + Math.random() * 0.4),
      speed: 0.5 + Math.random() * 1.5,
      size: 2 + Math.random() * 4,
      opacity: 0.3 + Math.random() * 0.5,
    }));
  }, [config.particleCount, size, energy]);

  // نمط النبض (مع تزامن اختياري مع breathPhase)
  const pulseStyle = useAnimatedStyle(() => {
    const pulse = Math.sin(pulsePhase.value) * 0.5 + 0.5;
    const breath = breathPhase ? (Math.sin(breathPhase.value) * 0.5 + 0.5) * 0.3 : 0;
    const prox = proximityVal.value;
    const baseScale = 1 + prox * 0.1;
    return {
      transform: [{ scale: baseScale + (pulse + breath) * 0.05 * energyVal.value }],
      opacity: 0.3 + (pulse + breath) * 0.2 * energyVal.value,
    };
  });

  const C = size / 2; // تمركز محلي

  const auraProps = useAnimatedProps(() => {
    const pulse = Math.sin(pulsePhase.value) * 0.5 + 0.5;
    const prox = proximityVal.value;
    const baseRadius = size * 0.6 * (1 + prox * 0.15);
    const radius = baseRadius + pulse * 20 * energyVal.value;
    return { r: radius };
  });

  const glowProps = useAnimatedProps(() => {
    const pulse = Math.sin(pulsePhase.value) * 0.5 + 0.5;
    return { r: size * 0.4 * (1 + pulse * 0.1) };
  });

  const auraGrad = `${uid}-auraGrad`;
  const glowGrad = `${uid}-glowGrad`;
  const auraBlur = `${uid}-auraBlur`;

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Animated.View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, pulseStyle]}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Defs>
            <RadialGradient id={auraGrad} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={config.color} stopOpacity="0" />
              <Stop offset="40%" stopColor={config.color} stopOpacity={config.intensity * 0.3} />
              <Stop offset="70%" stopColor={config.secondaryColor} stopOpacity={config.intensity * 0.15} />
              <Stop offset="100%" stopColor="#00000000" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id={glowGrad} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={config.glowColor} stopOpacity="0.5" />
              <Stop offset="100%" stopColor="#00000000" stopOpacity="0" />
            </RadialGradient>
            <Filter id={auraBlur}>
              <FeGaussianBlur stdDeviation={String(8 * blurIntensity)} result="blur" />
              <FeMerge>
                <FeMergeNode in="blur" />
                <FeMergeNode in="SourceGraphic" />
              </FeMerge>
            </Filter>
          </Defs>
          <AnimatedCircle cx={C} cy={C} animatedProps={auraProps} fill={`url(#${auraGrad})`} filter={`url(#${auraBlur})`} />
          <AnimatedCircle cx={C} cy={C} animatedProps={glowProps} fill={`url(#${glowGrad})`} opacity={0.6} />
          {particles.map((particle) => (
            <AuraParticle
              key={particle.id}
              particle={particle}
              pulsePhase={pulsePhase}
              energyVal={energyVal}
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

interface ParticleProps {
  particle: {
    id: number;
    angle: number;
    distance: number;
    speed: number;
    size: number;
    opacity: number;
  };
  pulsePhase: Animated.SharedValue<number>;
  energyVal: Animated.SharedValue<number>;
  config: AuraConfig;
  cx: number;
  cy: number;
}

const AuraParticle: React.FC<ParticleProps> = ({
  particle,
  pulsePhase,
  energyVal,
  config,
  cx,
  cy,
}) => {
  const particleProps = useAnimatedProps(() => {
    const t = pulsePhase.value * particle.speed;
    const pulse = Math.sin(pulsePhase.value) * 0.5 + 0.5;
    const angle = particle.angle + t * 0.1;
    const distance = particle.distance * (1 + pulse * 0.1 * energyVal.value);
    const turbulence = config.turbulence * Math.sin(t * 2) * 10;
    const x = cx + Math.cos(angle) * distance + turbulence;
    const y = cy + Math.sin(angle) * distance + turbulence;
    return {
      cx: x,
      cy: y,
      r: particle.size * (0.8 + pulse * 0.4),
      opacity: particle.opacity * energyVal.value * (0.5 + pulse * 0.5),
    };
  });
  return <AnimatedCircle animatedProps={particleProps} fill={config.color} />;
};

const styles = StyleSheet.create({});

export default EmotionalAura;
