/**
 * MicroParticles v3.1 — الجسيمات الدقيقة المتحركة (نسخة متكاملة محليًا)
 * =================================================
 * 80-200 جسيم صغير تتحرك حول الكيان:
 * - تتنفس مع إيقاع الكيان
 * - تتدفق كالسائل حول الغشاء
 * - تتجمع حول العيون عند التركيز (thinking)
 * - تتبعثر عند الدهشة
 * - تتباطأ عند النعاس
 * الإصلاحات: تمركز محلي + تكامل حي + جسيمات ديناميكية + focusMode.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { stateBus } from '../../core/StateBus';
import { presenceEngine } from '../../core/PresenceBridge';

const clamp01 = (n: unknown, fb = 0) => { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb; };
const mapState = (e: string): MicroParticlesProps['state'] => {
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

export interface ParticleConfig {
  count: number;
  minSize: number;
  maxSize: number;
  speed: number;
  spread: number;
  color: string;
  opacity: number;
}

export interface MicroParticlesProps {
  state?: 'idle' | 'calm' | 'listening' | 'thinking' | 'responding' | 'happy' | 'sad' | 'angry' | 'surprised' | 'sleepy';
  energy?: number;
  size?: number;
  proximity?: number;
  auto?: boolean;                    // قيادة حية من المحركات
  focusMode?: boolean;               // تركيز حول العيون عند thinking
  breathPhase?: Animated.SharedValue<number>; // تزامن مع الغشاء
}

const PARTICLE_CONFIGS: Record<string, ParticleConfig> = {
  idle: { count: 40, minSize: 1, maxSize: 3, speed: 0.3, spread: 0.8, color: '#7C5FD4', opacity: 0.3 },
  calm: { count: 60, minSize: 1, maxSize: 3, speed: 0.5, spread: 0.9, color: '#8B6FD4', opacity: 0.4 },
  listening: { count: 80, minSize: 1.5, maxSize: 4, speed: 0.7, spread: 1.0, color: '#5BA3D4', opacity: 0.5 },
  thinking: { count: 70, minSize: 1, maxSize: 3, speed: 0.4, spread: 0.7, color: '#6B7BD4', opacity: 0.45 },
  responding: { count: 90, minSize: 1.5, maxSize: 4, speed: 0.8, spread: 1.1, color: '#7B6BD4', opacity: 0.55 },
  happy: { count: 120, minSize: 2, maxSize: 5, speed: 1.2, spread: 1.3, color: '#F0C040', opacity: 0.7 },
  sad: { count: 30, minSize: 1, maxSize: 2, speed: 0.2, spread: 0.6, color: '#4A7BD4', opacity: 0.25 },
  angry: { count: 100, minSize: 1.5, maxSize: 4, speed: 1.5, spread: 1.2, color: '#FF6060', opacity: 0.6 },
  surprised: { count: 110, minSize: 2, maxSize: 5, speed: 1.0, spread: 1.4, color: '#60F0F0', opacity: 0.65 },
  sleepy: { count: 20, minSize: 1, maxSize: 2, speed: 0.15, spread: 0.5, color: '#6B5BD4', opacity: 0.2 },
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const MicroParticles: React.FC<MicroParticlesProps> = ({
  state = 'calm',
  energy = 0.5,
  size = 300,
  proximity = 0,
  auto = false,
  focusMode = false,
  breathPhase,
}) => {
  const [liveState, setLiveState] = useState<NonNullable<MicroParticlesProps['state']>>('calm');
  const effectiveState = auto ? liveState : state;
  const config = PARTICLE_CONFIGS[effectiveState] || PARTICLE_CONFIGS.calm;

  const time = useSharedValue(0);
  const energyVal = useSharedValue(energy);
  const proximityVal = useSharedValue(proximity);
  const focusVal = useSharedValue(focusMode ? 1 : 0);

  // قيادة حية من المحركات (اختياري)
  useEffect(() => {
    if (!auto) return;
    const iv = setInterval(() => {
      const st: any = stateBus.getState();
      const pres: any = presenceEngine.getSnapshot();
      energyVal.value = withSpring(clamp01(st.energy ?? 0.5));
      proximityVal.value = withSpring(clamp01(st.proximity ?? 0));
      focusVal.value = withSpring(st.thinking ? 1 : 0);
      setLiveState(mapState(String(pres?.emotion ?? st?.emotion ?? 'calm')));
    }, 300);
    return () => clearInterval(iv);
  }, [auto]);

  useEffect(() => {
    time.value = withRepeat(
      withTiming(1000, { duration: 60000, easing: Easing.linear }),
      -1,
      false
    );
    if (!auto) {
      energyVal.value = withSpring(energy, { damping: 15, stiffness: 100 });
      proximityVal.value = withSpring(proximity, { damping: 20, stiffness: 80 });
      focusVal.value = withSpring(focusMode ? 1 : 0);
    }
  }, [energy, proximity, focusMode, auto]);

  // جسيمات ديناميكية تتكيف مع الطاقة
  const particles = useMemo(() => {
    const count = Math.round(config.count * (0.6 + energy * 0.4));
    return Array.from({ length: count }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = size * (0.3 + Math.random() * config.spread);
      return {
        id: i,
        baseAngle: angle,
        baseDistance: distance,
        size: config.minSize + Math.random() * (config.maxSize - config.minSize),
        speed: config.speed * (0.5 + Math.random()),
        phase: Math.random() * Math.PI * 2,
        opacity: config.opacity * (0.5 + Math.random() * 0.5),
        orbitSpeed: (0.2 + Math.random() * 0.8) * (Math.random() > 0.5 ? 1 : -1),
      };
    });
  }, [config, size, energy]);

  const C = size / 2; // تمركز محلي

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {particles.map((particle) => (
          <Particle
            key={particle.id}
            particle={particle}
            time={time}
            energyVal={energyVal}
            proximityVal={proximityVal}
            focusVal={focusVal}
            config={config}
            cx={C}
            cy={C}
            breathPhase={breathPhase}
          />
        ))}
      </Svg>
    </View>
  );
};

interface ParticleProps {
  particle: {
    id: number;
    baseAngle: number;
    baseDistance: number;
    size: number;
    speed: number;
    phase: number;
    opacity: number;
    orbitSpeed: number;
  };
  time: Animated.SharedValue<number>;
  energyVal: Animated.SharedValue<number>;
  proximityVal: Animated.SharedValue<number>;
  focusVal: Animated.SharedValue<number>;
  config: ParticleConfig;
  cx: number;
  cy: number;
  breathPhase?: Animated.SharedValue<number>;
}

const Particle: React.FC<ParticleProps> = ({
  particle,
  time,
  energyVal,
  proximityVal,
  focusVal,
  config,
  cx,
  cy,
  breathPhase,
}) => {
  const particleProps = useAnimatedProps(() => {
    const t = time.value * 0.001;
    const energy = energyVal.value;
    const prox = proximityVal.value;
    const focus = focusVal.value;
    const breath = breathPhase ? (Math.sin(breathPhase.value) * 0.5 + 0.5) * 0.15 : 0;

    // حركة مدارية (أبطأ عند التركيز)
    const speedMul = 1 - focus * 0.5;
    const angle = particle.baseAngle + t * particle.orbitSpeed * particle.speed * energy * speedMul;

    // تموج المسافة (تنفس) + تركيز حول العيون
    const baseDist = particle.baseDistance * (1 + breath) * (1 + prox * 0.1);
    const focusDist = baseDist * (1 - focus * 0.4); // تقل المسافة عند التركيز
    const distance = focusDist;

    // اهتزاز عشوائي (أقل عند التركيز)
    const jitterMul = 1 - focus * 0.6;
    const jitterX = Math.sin(t * 3 + particle.phase) * 3 * energy * jitterMul;
    const jitterY = Math.cos(t * 2.5 + particle.phase) * 3 * energy * jitterMul;

    // موضع الجسيم
    const x = cx + Math.cos(angle) * distance + jitterX;
    const y = cy + Math.sin(angle) * distance + jitterY;

    // حجم متغير
    const size = particle.size * (0.8 + Math.sin(t + particle.phase) * 0.2) * (0.5 + energy * 0.5);

    // شفافية متغيرة
    const opacity = particle.opacity * energy * (0.5 + Math.sin(t * 0.5 + particle.phase) * 0.5);

    return {
      cx: x,
      cy: y,
      r: Math.max(0.5, size),
      opacity: Math.max(0, opacity),
    };
  });

  return <AnimatedCircle animatedProps={particleProps} fill={config.color} />;
};

const styles = StyleSheet.create({});

export default MicroParticles;
