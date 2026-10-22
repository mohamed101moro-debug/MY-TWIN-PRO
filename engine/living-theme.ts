/**
 * LIVING THEME ENGINE v2.0 — محرك الثيم الحي
 * ==============================================
 * يولد ثيم متكامل بناءً على حالة التوأم الحية.
 * ✅ يستخدم useAppTheme() من engine/colors كمصدر وحيد للألوان.
 */
import { useAppTheme } from './colors';
import { stateBus } from '../src/core/StateBus';
import type { ThemeColors } from './colors';

export interface MotionConfig {
  breathDuration: number;
  pulseDuration: number;
  thinkingDuration: number;
  waveDuration: number;
  transitionDuration: number;
}

export interface GlowConfig {
  color: string;
  intensity: number;
  speed: number;
  size: number;
}

export interface GlassConfig {
  opacity: number;
  blur: number;
  borderOpacity: number;
}

export interface LivingColors {
  breathingGlow: string;
  neuron: string;
  memory: string;
  dream: string;
  emotion: string;
  awareness: string;
  energy: string;
  bond: string;
}

export interface LivingTheme {
  colors: ThemeColors;
  motion: MotionConfig;
  radius: { sm: number; md: number; lg: number; bubble: number; avatar: number };
  shadow: { soft: any; medium: any; glow: any };
  glass: GlassConfig;
  living: LivingColors;
  glow: GlowConfig;
  status: string;
}

const MOTION_CONFIGS: Record<string, MotionConfig> = {
  listening:   { breathDuration: 3500, pulseDuration: 1800, thinkingDuration: 900,  waveDuration: 1200, transitionDuration: 400 },
  thinking:    { breathDuration: 2500, pulseDuration: 1200, thinkingDuration: 600,  waveDuration: 900,  transitionDuration: 300 },
  speaking:    { breathDuration: 1500, pulseDuration: 800,  thinkingDuration: 400,  waveDuration: 600,  transitionDuration: 200 },
  dormant:     { breathDuration: 6000, pulseDuration: 4000, thinkingDuration: 3000, waveDuration: 5000, transitionDuration: 1000 },
  default:     { breathDuration: 3500, pulseDuration: 1800, thinkingDuration: 900,  waveDuration: 1200, transitionDuration: 400 },
};

const EMOTION_LIVING_COLORS: Record<string, Partial<LivingColors>> = {
  joy:       { emotion: '#F59E0B', breathingGlow: '#FBBF24' },
  sadness:   { emotion: '#4A90E2', breathingGlow: '#60A5FA' },
  calm:      { emotion: '#14B8A6', breathingGlow: '#5EEAD4' },
  love:      { emotion: '#EC4899', breathingGlow: '#F472B6' },
  anger:     { emotion: '#EF4444', breathingGlow: '#FCA5A5' },
  fear:      { emotion: '#9C27B0', breathingGlow: '#C084FC' },
  neutral:   { emotion: '#A78BFA', breathingGlow: '#C4B5FD' },
  curious:   { emotion: '#8B5CF6', breathingGlow: '#A78BFA' },
  focused:   { emotion: '#3B82F6', breathingGlow: '#60A5FA' },
  inspired:  { emotion: '#10B981', breathingGlow: '#34D399' },
  concerned: { emotion: '#F97316', breathingGlow: '#FB923C' },
  happy:     { emotion: '#FBBF24', breathingGlow: '#FDE68A' },
};

export function useLivingTheme(): LivingTheme {
  const { colors } = useAppTheme();
  
  // ✅ من StateBus: العاطفة والطاقة والوعي والرابطة
  const currentState = stateBus.getState();
  const emotion = currentState.emotion.primaryEmotion;
  const energy = Math.round(currentState.emotion.intensity * 100);
  const awareness = currentState.interfaceState;
  const bond = currentState.relationship.bondLevel;
  const mode = currentState.interfaceState;

  const motion = MOTION_CONFIGS[mode] || MOTION_CONFIGS.default;
  const emotionColors = EMOTION_LIVING_COLORS[emotion] || EMOTION_LIVING_COLORS.neutral;

  const awarenessMultiplier = 
    mode === 'dormant' ? 0.3 :
    mode === 'aware' ? 0.5 :
    mode === 'attentive' ? 0.7 :
    mode === 'thinking' ? 0.85 :
    mode === 'speaking' ? 1.0 :
    0.7;

  const glow: GlowConfig = {
    color: emotionColors.breathingGlow || colors.accent,
    intensity: 0.2 + (energy / 100) * 0.3 * awarenessMultiplier,
    speed: motion.breathDuration,
    size: 200 + energy * 1.5,
  };

  const glass: GlassConfig = {
    opacity: 0.10 + awarenessMultiplier * 0.04,
    blur: 12 + awarenessMultiplier * 6,
    borderOpacity: 0.14 + awarenessMultiplier * 0.04,
  };

  const living: LivingColors = {
    breathingGlow: emotionColors.breathingGlow || colors.accent,
    neuron: '#7C3AED',
    memory: '#8B5CF6',
    dream: '#6366F1',
    emotion: emotionColors.emotion || colors.rose,
    awareness: '#14B8A6',
    energy: energy > 70 ? colors.success : energy > 40 ? colors.gold : colors.danger,
    bond: bond > 70 ? colors.rose : bond > 40 ? colors.gold : '#60A5FA',
  };

  return {
    colors,
    motion,
    radius: { sm: 8, md: 16, lg: 24, bubble: 28, avatar: 999 },
    shadow: {
      soft: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
      medium: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
      glow: { shadowColor: glow.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: glow.intensity, shadowRadius: glow.size / 10, elevation: 10 },
    },
    glass,
    living,
    glow,
    status: mode,
  };
}
