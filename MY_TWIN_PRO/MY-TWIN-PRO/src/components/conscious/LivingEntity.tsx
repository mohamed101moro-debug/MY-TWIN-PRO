// @ts-nocheck — ملف بصري خالص (transform unions في Reanimated)
import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from './theme';
export type EntityState = 'idle'|'calm'|'listening'|'thinking'|'understanding'|'responding'|'happy'|'curious'|'sad'|'surprised'|'angry'|'sleepy';
export interface LivingEntityProps { state?: EntityState; size?: number; intensity?: number; speaking?: boolean; interactive?: boolean; style?: ViewStyle; onPress?: () => void; }
type Palette = { core: string; membrane: string; aura: string; accent: string; gaze: { x: number; y: number }; tempo: number };
const AnimatedView = Animated.View;
function getPalette(state: EntityState, theme: ReturnType<typeof useTheme>): Palette {
  const base = { core: theme.entityPurple, membrane: theme.entityBlue, aura: theme.entityPink, accent: theme.entityCyan, gaze: { x: 0, y: 0 }, tempo: 4200 };
  const palettes: Partial<Record<EntityState, Partial<Palette>>> = {
    idle: { tempo: 5200 }, calm: { aura: '#B996FF', tempo: 5600 },
    listening: { core: '#6C7BFF', membrane: '#4BE7FF', aura: '#C68CFF', accent: '#B8F7FF', tempo: 2800, gaze: { x: -2, y: 1 } },
    thinking: { core: '#536DFF', membrane: '#6E48AA', aura: '#8C75FF', accent: '#7FE8FF', tempo: 2100, gaze: { x: -3, y: -2 } },
    understanding: { core: '#B06CFF', membrane: '#6366F1', aura: '#FF9FDC', accent: '#9AF8FF', tempo: 2400, gaze: { x: 1, y: -1 } },
    responding: { core: '#D56BFF', membrane: '#7B4DFF', aura: '#FF8ED4', accent: '#7EE9FF', tempo: 1800 },
    happy: { core: '#FF9EDE', membrane: '#9D50BB', aura: '#FFD38A', accent: '#A5F9FF', tempo: 2300 },
    curious: { core: '#B476FF', membrane: '#507BFF', aura: '#F59CFF', accent: '#A5F1FF', tempo: 3000, gaze: { x: 3, y: -2 } },
    sad: { core: '#526CFF', membrane: '#273E9B', aura: '#728DFF', accent: '#8CCBFF', tempo: 6200, gaze: { x: 0, y: 3 } },
    surprised: { core: '#FF9B7A', membrane: '#ED64D8', aura: '#FFC7A1', accent: '#B9F9FF', tempo: 1600 },
    angry: { core: '#FF476F', membrane: '#7D164D', aura: '#FF775C', accent: '#FFA2A2', tempo: 1300, gaze: { x: 0, y: -1 } },
    sleepy: { core: '#8064B8', membrane: '#302452', aura: '#8E76C4', accent: '#B4A9FF', tempo: 7600, gaze: { x: 0, y: 3 } },
  };
  return { ...base, ...(palettes[state] || {}) } as Palette;
}
function Eye({ size, color, blink, gaze, gazeShift, side, openness = 1 }: { size: number; color: string; blink: any; gaze: { x: number; y: number }; gazeShift: { x: any; y: any }; side: 'left' | 'right'; openness?: number }) {
  const eyeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: gaze.x + gazeShift.x.value }, { translateY: gaze.y + gazeShift.y.value }, { scaleY: interpolate(blink.value, [0, 1], [openness, 0.10]) }],
  }));
  return (
    <AnimatedView pointerEvents="none" style={[styles.eye, { width: size * 0.22, height: size * 0.14, left: side === 'left' ? size * 0.285 : size * 0.505, top: size * 0.425, borderColor: color + 'AA', shadowColor: color }, eyeStyle]}>
      <View style={[styles.iris, { width: size * 0.115, height: size * 0.115, backgroundColor: color, shadowColor: color }]}>
        <View style={[styles.irisInner, { backgroundColor: '#10051F' }]} />
        <View style={[styles.eyeSpark, { backgroundColor: '#FFFFFF' }]} />
      </View>
    </AnimatedView>
  );
}
export function LivingEntity({ state = 'idle', size = 220, intensity = 1, speaking = false, interactive = true, style, onPress }: LivingEntityProps) {
  const theme = useTheme();
  const palette = useMemo(() => getPalette(state, theme), [state, theme]);
  const eyeOpenness = state === 'sleepy' ? 0.48 : state === 'sad' ? 0.68 : state === 'angry' ? 0.72 : state === 'surprised' ? 1.12 : 1;
  const breath = useSharedValue(0); const pulse = useSharedValue(0); const rotation = useSharedValue(0);
  const blink = useSharedValue(0); const headTilt = useSharedValue(0);
  const gazeShiftX = useSharedValue(0); const gazeShiftY = useSharedValue(0);
  const previousState = useRef<EntityState | null>(null);
  useEffect(() => {
    if (previousState.current === state) return;
    previousState.current = state;
    try {
      if (state === 'responding' || state === 'surprised') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (state === 'sad' || state === 'angry') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      else if (state === 'listening' || state === 'thinking' || state === 'understanding') Haptics.selectionAsync();
    } catch {}
  }, [state]);
  useEffect(() => {
    const tiltByState: Partial<Record<EntityState, number>> = { listening: -2.4, thinking: 3.2, understanding: -1.4, responding: 1.2, curious: 4.2, sad: -2.8, surprised: 0, angry: -3.6, sleepy: 2.2 };
    const targetTilt = tiltByState[state] ?? 0;
    headTilt.value = withSequence(withTiming(targetTilt * 0.45, { duration: 130, easing: Easing.out(Easing.cubic) }), withTiming(targetTilt, { duration: 420, easing: Easing.inOut(Easing.sin) }));
    gazeShiftX.value = withTiming(palette.gaze.x * 0.55, { duration: 520, easing: Easing.inOut(Easing.sin) });
    gazeShiftY.value = withTiming(palette.gaze.y * 0.55, { duration: 520, easing: Easing.inOut(Easing.sin) });
  }, [state, palette.gaze.x, palette.gaze.y]);
  useEffect(() => {
    breath.value = withRepeat(withTiming(1, { duration: Math.max(900, palette.tempo), easing: Easing.inOut(Easing.sin) }), -1, true);
    pulse.value = withRepeat(withTiming(1, { duration: speaking ? 560 : Math.max(1100, palette.tempo * 0.7), easing: Easing.inOut(Easing.sin) }), -1, true);
    rotation.value = withRepeat(withTiming(360, { duration: 24000, easing: Easing.linear }), -1, false);
    blink.value = withRepeat(withSequence(withTiming(0, { duration: 3200 }), withTiming(1, { duration: 90 }), withTiming(0, { duration: 150 }), withTiming(0, { duration: 1800 })), -1, false);
  }, [palette.tempo, speaking]);
  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + interpolate(breath.value, [0, 1], [0.005, 0.035]) * intensity }] }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: interpolate(breath.value, [0, 1], [0.34, 0.72]) * intensity, transform: [{ scale: 1 + interpolate(breath.value, [0, 1], [0.02, 0.12]) * intensity }] }));
  const coreStyle = useAnimatedStyle(() => ({ opacity: interpolate(pulse.value, [0, 1], [0.72, 1]), transform: [{ scale: 1 + interpolate(pulse.value, [0, 1], [0.02, speaking ? 0.18 : 0.08]) }] }));
  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const gestureStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${headTilt.value}deg` }, { translateY: interpolate(breath.value, [0, 1], [0, -1.8]) }] }));
  const entity = (
    <AnimatedView accessible accessibilityRole="image" accessibilityLabel="My Twin living digital being" style={[styles.stage, { width: size, height: size }, style, gestureStyle]}>
      <AnimatedView pointerEvents="none" style={[styles.halo, { width: size * 1.16, height: size * 1.16, borderRadius: size, shadowColor: palette.aura, backgroundColor: palette.aura }, haloStyle]} />
      <AnimatedView pointerEvents="none" style={[styles.orbit, { width: size * 1.12, height: size * 0.62, top: size * 0.19, left: -size * 0.06 }, orbitStyle]}>
        <Svg width={size * 1.12} height={size * 0.62} viewBox="0 0 240 132">
          <Ellipse cx="120" cy="66" rx="108" ry="42" fill="none" stroke={palette.accent} strokeWidth="1.2" opacity="0.42" />
          <Ellipse cx="120" cy="66" rx="99" ry="34" fill="none" stroke={palette.membrane} strokeWidth="1.1" opacity="0.6" />
          <Circle cx="19" cy="66" r="2.8" fill={palette.accent} opacity="0.9" />
          <Circle cx="222" cy="66" r="2.2" fill={palette.aura} opacity="0.85" />
        </Svg>
      </AnimatedView>
      <AnimatedView pointerEvents="none" style={[styles.body, { width: size, height: size }, bodyStyle]}>
        <Svg width={size} height={size} viewBox="0 0 240 240">
          <Defs>
            <RadialGradient id="entityFace" cx="45%" cy="38%" rx="70%" ry="70%">
              <Stop offset="0" stopColor={palette.membrane} stopOpacity="0.92" />
              <Stop offset="0.46" stopColor={palette.core} stopOpacity="0.82" />
              <Stop offset="1" stopColor="#11051F" stopOpacity="0.98" />
            </RadialGradient>
            <RadialGradient id="entityCore" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="0.22" stopColor={palette.accent} stopOpacity="0.95" />
              <Stop offset="1" stopColor={palette.aura} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="120" cy="120" r="88" fill="url(#entityFace)" opacity="0.96" />
          <Path d="M42 111 C55 53 94 29 126 39 C173 24 207 62 198 116 C209 157 176 200 126 203 C75 211 36 167 42 111Z" fill="none" stroke={palette.aura} strokeWidth="3" opacity="0.58" />
          <Path d="M54 81 C91 30 158 27 192 76 M43 143 C76 190 157 214 196 151" fill="none" stroke={palette.accent} strokeWidth="1.6" opacity="0.55" />
          <Path d="M69 60 C96 45 106 47 120 57 C135 43 162 45 178 62" fill="none" stroke={palette.membrane} strokeWidth="7" strokeLinecap="round" opacity="0.64" />
          <Circle cx="120" cy="182" r="26" fill="url(#entityCore)" opacity="0.8" />
          <Circle cx="120" cy="187" r="3.5" fill="#FFFFFF" opacity="0.95" />
          <G opacity="0.85">
            <Circle cx="32" cy="100" r="1.6" fill={palette.accent} />
            <Circle cx="208" cy="91" r="1.8" fill={palette.aura} />
            <Circle cx="60" cy="191" r="1.4" fill={palette.accent} />
            <Circle cx="186" cy="182" r="1.5" fill={palette.membrane} />
          </G>
        </Svg>
        <Eye size={size} color={palette.accent} blink={blink} gaze={palette.gaze} gazeShift={{ x: gazeShiftX, y: gazeShiftY }} openness={eyeOpenness} side="left" />
        <Eye size={size} color={palette.accent} blink={blink} gaze={palette.gaze} gazeShift={{ x: gazeShiftX, y: gazeShiftY }} openness={eyeOpenness} side="right" />
      </AnimatedView>
      <AnimatedView pointerEvents="none" style={[styles.core, { width: size * 0.30, height: size * 0.30, left: size * 0.35, top: size * 0.38 }, coreStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="coreGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
              <Stop offset="0.22" stopColor={palette.accent} stopOpacity="0.9" />
              <Stop offset="1" stopColor={palette.accent} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="50" r="50" fill="url(#coreGlow)" />
        </Svg>
      </AnimatedView>
      <View pointerEvents="none" style={[styles.statusDot, { backgroundColor: palette.accent, shadowColor: palette.accent }]} />
    </AnimatedView>
  );
  if (!interactive) return entity;
  return (
    <Pressable onPress={() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} onPress?.(); }} style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}>
      {entity}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  halo: { position: 'absolute', opacity: 0.5, shadowOpacity: 0.8, shadowRadius: 36, elevation: 18 },
  orbit: { position: 'absolute', zIndex: 1 },
  body: { position: 'absolute', zIndex: 2 },
  core: { position: 'absolute', zIndex: 4 },
  eye: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.2, shadowOpacity: 0.9, shadowRadius: 10, elevation: 4, zIndex: 5 },
  iris: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.95, shadowRadius: 11, elevation: 8 },
  irisInner: { width: '42%', height: '42%', borderRadius: 999 },
  eyeSpark: { position: 'absolute', width: '17%', height: '17%', borderRadius: 999, top: '18%', left: '24%' },
  statusDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, right: 12, top: 18, zIndex: 10, shadowOpacity: 0.95, shadowRadius: 8, elevation: 4 },
});
export default LivingEntity;
export { getPalette };
