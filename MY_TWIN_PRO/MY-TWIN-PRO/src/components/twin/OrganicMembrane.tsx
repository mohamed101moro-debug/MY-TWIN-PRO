/**
 * OrganicMembrane v3.1 — الغشاء الحي المتموج (نسخة متكاملة مع المصادر الحية)
 * ==============================================
 * غشاء عضوي شفاف متعدد الطبقات يشبه الوجه البشري.
 * يتنفس، يتموج، ويتكيف مع الحالة العاطفية والبيئية.
 * التعديلات التكاملية: مصادر البيانات من StateBus/PresenceBridge + تمركز محلي داخل المقاس.
 */
import React, { useMemo, useEffect, useState } from 'react';
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
import Svg, {
  Path,
  Defs,
  RadialGradient,
  Stop,
  Filter,
  FeGaussianBlur,
  FeMerge,
  FeMergeNode,
} from 'react-native-svg';
import { stateBus } from '../../core/StateBus';
import { presenceEngine } from '../../core/PresenceBridge';

const clamp01 = (n: unknown, fb = 0) => { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb; };
const mapState = (e: string): MembraneProps['state'] => {
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

export interface MembraneLayer {
  id: number;
  radius: number;
  opacity: number;
  color: string;
  speed: number;
  amplitude: number;
  phase: number;
  blur: number;
}

export interface MembraneProps {
  size?: number;
  state?: 'idle' | 'calm' | 'listening' | 'thinking' | 'responding' | 'happy' | 'sad' | 'angry' | 'surprised' | 'sleepy';
  energy?: number;      // 0-1 (إن لم يُمرر ⇒ حي من StateBus)
  proximity?: number;   // 0-1 (إن لم يُمرر ⇒ حي من StateBus)
  touchActive?: boolean;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
}

function generateOrganicWave(
  cx: number,
  cy: number,
  baseRadius: number,
  time: number,
  amplitude: number,
  frequency: number,
  phase: number,
  points: number = 60
): string {
  'worklet';
  const path: string[] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const wave1 = Math.sin(angle * frequency + time + phase) * amplitude;
    const wave2 = Math.sin(angle * frequency * 2.3 + time * 1.7 + phase * 1.3) * amplitude * 0.5;
    const wave3 = Math.sin(angle * frequency * 0.7 + time * 0.5 + phase * 0.8) * amplitude * 0.3;
    const noise = Math.sin(angle * 5.7 + time * 0.3) * Math.cos(angle * 3.3 + time * 0.7) * amplitude * 0.15;
    const r = baseRadius + wave1 + wave2 + wave3 + noise;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) {
      path.push(`M ${x.toFixed(2)} ${y.toFixed(2)}`);
    } else {
      const prevAngle = ((i - 1) / points) * Math.PI * 2;
      const cpR = baseRadius + (wave1 + wave2 + wave3 + noise) * 0.5;
      const cpx = cx + Math.cos(prevAngle + 0.05) * cpR;
      const cpy = cy + Math.sin(prevAngle + 0.05) * cpR;
      path.push(`Q ${cpx.toFixed(2)} ${cpy.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
  }
  path.push('Z');
  return path.join(' ');
}

const MEMBRANE_COLORS = {
  idle:      { primary: '#4A3F6B', secondary: '#2D1B4D', glow: '#6B3FD420' },
  calm:      { primary: '#5B4F8C', secondary: '#3D2B6B', glow: '#7C5FD430' },
  listening: { primary: '#4A7C9B', secondary: '#2D5A7B', glow: '#5BA3D440' },
  thinking:  { primary: '#5B6B9B', secondary: '#3D4B7B', glow: '#6B7BD440' },
  responding:{ primary: '#6B5B9B', secondary: '#4D3B7B', glow: '#7B6BD450' },
  happy:     { primary: '#8B6B3B', secondary: '#6B4D1B', glow: '#D4A03D60' },
  sad:       { primary: '#3B5B8B', secondary: '#1D3B6B', glow: '#4A7BD430' },
  angry:     { primary: '#8B3B3B', secondary: '#6B1D1D', glow: '#D44A4A50' },
  surprised: { primary: '#3B8B8B', secondary: '#1D6B6B', glow: '#4AD4D450' },
  sleepy:    { primary: '#5B4B7B', secondary: '#3D2B5B', glow: '#6B5BD420' },
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

export const OrganicMembrane: React.FC<MembraneProps> = ({
  size = 280,
  state,
  energy,
  proximity,
  touchActive,
  onTouchStart,
  onTouchEnd,
}) => {
  const C = size / 2;
  const [live, setLive] = useState({ energy: 0.5, proximity: 0, touch: false, emotionState: 'calm' as MembraneProps['state'] });
  useEffect(() => {
    const iv = setInterval(() => {
      const st: any = stateBus.getState();
      const pres: any = presenceEngine.getSnapshot();
      setLive({
        energy: clamp01(st.energy ?? 0.5),
        proximity: clamp01(st.proximity ?? 0),
        touch: !!st.touch,
        emotionState: mapState(String(pres?.emotion ?? st?.emotion ?? 'calm')),
      });
    }, 300);
    return () => clearInterval(iv);
  }, []);
  const E = clamp01(energy ?? live.energy);
  const P = clamp01(proximity ?? live.proximity);
  const T = touchActive ?? live.touch;
  const S = state ?? live.emotionState;

  const time = useSharedValue(0);
  const breathPhase = useSharedValue(0);
  const energyPulse = useSharedValue(E);
  const proximityScale = useSharedValue(P);
  const touchGlow = useSharedValue(T ? 1 : 0);

  useEffect(() => {
    time.value = withRepeat(withTiming(1000, { duration: 60000, easing: Easing.linear }), -1, false);
    breathPhase.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(Math.PI * 2, { duration: 3000 + (1 - E) * 2000, easing: Easing.inOutSine })
      ),
      -1,
      false
    );
  }, [E]);

  useEffect(() => {
    energyPulse.value = withSpring(E, { damping: 15, stiffness: 100 });
    proximityScale.value = withSpring(P, { damping: 20, stiffness: 80 });
    touchGlow.value = withSpring(T ? 1 : 0, { damping: 10, stiffness: 150 });
  }, [E, P, T]);

  const colors = (MEMBRANE_COLORS as any)[S] || MEMBRANE_COLORS.calm;

  const layers = useMemo(() => {
    const baseLayers: MembraneLayer[] = [
      { id: 0, radius: size * 0.45, opacity: 0.08, color: colors.glow, speed: 0.3, amplitude: 8, phase: 0, blur: 20 },
      { id: 1, radius: size * 0.42, opacity: 0.12, color: colors.secondary, speed: 0.5, amplitude: 6, phase: 0.5, blur: 15 },
      { id: 2, radius: size * 0.40, opacity: 0.18, color: colors.primary, speed: 0.7, amplitude: 5, phase: 1.0, blur: 12 },
      { id: 3, radius: size * 0.38, opacity: 0.25, color: colors.primary, speed: 0.9, amplitude: 4, phase: 1.5, blur: 10 },
      { id: 4, radius: size * 0.36, opacity: 0.35, color: colors.secondary, speed: 1.1, amplitude: 3, phase: 2.0, blur: 8 },
      { id: 5, radius: size * 0.34, opacity: 0.50, color: colors.primary, speed: 1.3, amplitude: 2, phase: 2.5, blur: 6 },
      { id: 6, radius: size * 0.32, opacity: 0.70, color: colors.primary, speed: 1.5, amplitude: 1.5, phase: 3.0, blur: 4 },
    ];
    return baseLayers.map(layer => ({
      ...layer,
      amplitude: layer.amplitude * (0.5 + E * 0.5) * (1 + P * 0.3),
      speed: layer.speed * (0.5 + E * 0.5),
      opacity: layer.opacity * (0.5 + E * 0.5),
      radius: layer.radius * (1 + P * 0.05),
    }));
  }, [size, E, P, colors]);

  const membranePath = useAnimatedProps(() => {
    const t = time.value * 0.001;
    const breath = Math.sin(breathPhase.value) * 0.5 + 0.5;
    const prox = proximityScale.value;
    const touch = touchGlow.value;
    const mainRadius = size * 0.38 * (1 + breath * 0.03) * (1 + prox * 0.05) * (1 + touch * 0.02);
    const mainAmp = 6 * (1 + energyPulse.value * 0.5) * (1 + prox * 0.3);
    return { d: generateOrganicWave(C, C, mainRadius, t, mainAmp, 3, 0) };
  });

  const breathStyle = useAnimatedStyle(() => {
    const breath = Math.sin(breathPhase.value) * 0.5 + 0.5;
    const prox = proximityScale.value;
    const touch = touchGlow.value;
    return {
      transform: [{ scale: 1 + breath * 0.02 + prox * 0.03 + touch * 0.01 }],
      opacity: 0.3 + breath * 0.2 + energyPulse.value * 0.3,
    };
  });

  const gradientColors = useMemo(() => ({ inner: colors.primary, outer: colors.secondary, glow: colors.glow }), [colors]);

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Animated.View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, breathStyle]}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Defs>
            <RadialGradient id="membraneGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={gradientColors.inner} stopOpacity="0.8" />
              <Stop offset="50%" stopColor={gradientColors.outer} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={gradientColors.outer} stopOpacity="0.1" />
            </RadialGradient>
            <Filter id="glow">
              <FeGaussianBlur stdDeviation="8" result="blur" />
              <FeMerge>
                <FeMergeNode in="blur" />
                <FeMergeNode in="SourceGraphic" />
              </FeMerge>
            </Filter>
            <RadialGradient id="auraGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={gradientColors.glow} stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#00000000" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <AnimatedPath animatedProps={membranePath} fill="url(#auraGrad)" opacity={0.3} />
          {layers.map((layer) => (
            <MembraneLayerComponent
              key={layer.id}
              layer={layer}
              time={time}
              breathPhase={breathPhase}
              energyPulse={energyPulse}
              proximityScale={proximityScale}
              centerX={C}
              centerY={C}
            />
          ))}
          <AnimatedPath
            animatedProps={membranePath}
            fill="url(#membraneGrad)"
            stroke={colors.primary}
            strokeWidth={1.5}
            strokeOpacity={0.6}
            filter="url(#glow)"
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

interface LayerProps {
  layer: MembraneLayer;
  time: Animated.SharedValue<number>;
  breathPhase: Animated.SharedValue<number>;
  energyPulse: Animated.SharedValue<number>;
  proximityScale: Animated.SharedValue<number>;
  centerX: number;
  centerY: number;
}

const MembraneLayerComponent: React.FC<LayerProps> = ({
  layer, time, breathPhase, energyPulse, proximityScale, centerX, centerY,
}) => {
  const layerPath = useAnimatedProps(() => {
    const t = time.value * 0.001 * layer.speed;
    const breath = Math.sin(breathPhase.value + layer.phase) * 0.5 + 0.5;
    const prox = proximityScale.value;
    const radius = layer.radius * (1 + breath * 0.02) * (1 + prox * 0.03);
    const amp = layer.amplitude * (0.5 + energyPulse.value * 0.5);
    return { d: generateOrganicWave(centerX, centerY, radius, t, amp, 3 + layer.id * 0.5, layer.phase) };
  });
  return (
    <AnimatedPath
      animatedProps={layerPath}
      fill={layer.color}
      fillOpacity={layer.opacity}
      stroke={layer.color}
      strokeWidth={0.5}
      strokeOpacity={layer.opacity * 0.5}
    />
  );
};

const styles = StyleSheet.create({});

export default OrganicMembrane;
