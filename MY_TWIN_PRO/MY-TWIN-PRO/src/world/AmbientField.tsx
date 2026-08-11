import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import {
  Canvas, Circle, Paint, BlurMask,
  RadialGradient, SweepGradient, vec, Group,
} from "@shopify/react-native-skia";
import {
  useSharedValue, withTiming, useDerivedValue,
} from "react-native-reanimated";
import { stateBus } from '../core/StateBus';
import { useAppTheme } from '../../engine/colors';
import { lifeRhythmEngine } from '../../engine/life/LifeRhythmEngine';

const { width, height } = Dimensions.get('window');

// ═══════════════════════════════════════════
// توليد مواقع ديناميكية للطبقات
// ═══════════════════════════════════════════
interface LightNode {
  id: number;
  baseX: number;
  baseY: number;
  radius: number;
  speed: number;
  phase: number;
  colorWeight: number;
}

const generateLightNodes = (count: number): LightNode[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    baseX: width * (0.1 + Math.random() * 0.8),
    baseY: height * (0.1 + Math.random() * 0.8),
    radius: 60 + Math.random() * 180,
    speed: 0.2 + Math.random() * 0.8,
    phase: Math.random() * Math.PI * 2,
    colorWeight: 0.3 + Math.random() * 0.7,
  }));
};

export default function AmbientField() {
  const { colors } = useAppTheme();
  const nodes = useMemo(() => generateLightNodes(7), []);

  const energyLevel = useSharedValue(0.5);
  const warmth = useSharedValue(0.5);
  const silenceLevel = useSharedValue(0);
  const focusLevel = useSharedValue(0.5);
  const breathPhase = useSharedValue(0);
  const emotionColor = useSharedValue(colors.accent);
  const timeEnergy = useSharedValue(0.5);

  // ── الاستماع لـ StateBus ──
  useEffect(() => {
    const unsub = stateBus.on('presence:state_updated', (_: string, data: any) => {
      if (!data) return;
      energyLevel.value = withTiming(data.energyLevel || 0.5, { duration: 3000 });
      warmth.value = withTiming(data.warmth || 0.5, { duration: 4000 });
      silenceLevel.value = withTiming(data.silenceLevel || 0, { duration: 2000 });
      focusLevel.value = withTiming(data.focusLevel || 0.5, { duration: 1000 });
      breathPhase.value = data.breathPhase || 0;

      const emotionColors: Record<string, string> = {
        joy: '#F59E0B', sadness: '#3B82F6', calm: '#10B981', love: '#EC4899',
        anger: '#EF4444', fear: '#A78BFA', neutral: colors.accent,
      };
      emotionColor.value = withTiming(
        emotionColors[data.emotion] || colors.accent,
        { duration: 4000 }
      );
    });
    return unsub;
  }, [colors]);

  // ── تحديث إيقاع الحياة ──
  useEffect(() => {
    const interval = setInterval(() => {
      const rhythm = lifeRhythmEngine.getState();
      timeEnergy.value = withTiming(rhythm.energy, { duration: 5000 });
      warmth.value = withTiming(rhythm.warmth, { duration: 5000 });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // ── حساب المواقع المتحركة ──
  const getNodeProps = (node: LightNode) => {
    const now = Date.now() / 1000;
    const oscillationX = Math.sin(now * node.speed + node.phase) * 30;
    const oscillationY = Math.cos(now * node.speed * 0.7 + node.phase) * 30;
    return {
      cx: node.baseX + oscillationX,
      cy: node.baseY + oscillationY,
      r: node.radius * (0.8 + breathPhase.value * 0.4),
    };
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={{ flex: 1 }}>
        <Group>
          {/* ── الطبقة 0: الخلفية الكونية العميقة ── */}
          <Circle cx={width/2} cy={height/2} r={Math.max(width, height) * 0.7}>
            <Paint><BlurMask blur={120} style="normal" /></Paint>
            <RadialGradient
              c={vec(width/2, height/2)}
              r={Math.max(width, height) * 0.7}
              colors={['#0A0A14', '#0A0A14', '#000000']}
            />
          </Circle>

          {/* ── الطبقة 1: الحقل الزمني (Time Field) ── */}
          <Circle
            cx={width/2} cy={height * 0.3}
            r={width * 0.6}
            opacity={0.04 + timeEnergy.value * 0.08}
          >
            <Paint><BlurMask blur={80} style="normal" /></Paint>
            <RadialGradient
              c={vec(width/2, height * 0.3)}
              r={width * 0.6}
              colors={[emotionColor.value + '30', '#00000000']}
            />
          </Circle>

          {/* ── الطبقة 2: حقل الطاقة (Energy Field) ── */}
          <Circle
            cx={width * 0.7} cy={height * 0.6}
            r={width * 0.5}
            opacity={0.03 + energyLevel.value * 0.08}
          >
            <Paint><BlurMask blur={70} style="normal" /></Paint>
            <RadialGradient
              c={vec(width * 0.7, height * 0.6)}
              r={width * 0.5}
              colors={[emotionColor.value + '25', '#00000000']}
            />
          </Circle>

          {/* ── الطبقة 3: حقل الدفء (Warmth Field) ── */}
          {warmth.value > 0.3 && (
            <Circle
              cx={width * 0.3} cy={height * 0.5}
              r={width * 0.45}
              opacity={warmth.value * 0.1}
            >
              <Paint><BlurMask blur={65} style="normal" /></Paint>
              <RadialGradient
                c={vec(width * 0.3, height * 0.5)}
                r={width * 0.45}
                colors={['#FFD70020', '#00000000']}
              />
            </Circle>
          )}

          {/* ── الطبقة 4: عقد ضوئية ديناميكية (Dynamic Light Nodes) ── */}
          {nodes.slice(0, 5).map(node => {
            const props = getNodeProps(node);
            return (
              <Circle
                key={node.id}
                cx={props.cx}
                cy={props.cy}
                r={props.r}
                opacity={0.03 + energyLevel.value * 0.04 + silenceLevel.value * -0.02}
              >
                <Paint><BlurMask blur={50 + node.colorWeight * 30} style="normal" /></Paint>
                <RadialGradient
                  c={vec(props.cx, props.cy)}
                  r={props.r}
                  colors={[emotionColor.value + '15', '#00000000']}
                />
              </Circle>
            );
          })}

          {/* ── الطبقة 5: حقل التركيز (Focus Field) ── */}
          {focusLevel.value > 0.5 && (
            <Circle
              cx={width/2} cy={height/2}
              r={120}
              opacity={focusLevel.value * 0.12}
            >
              <Paint><BlurMask blur={45} style="normal" /></Paint>
              <SweepGradient
                c={vec(width/2, height/2)}
                colors={[emotionColor.value + '20', '#FFFFFF10', emotionColor.value + '20']}
              />
            </Circle>
          )}

          {/* ── الطبقة 6: حقل الصمت (Silence Field) ── */}
          {silenceLevel.value > 0.3 && (
            <>
              <Circle
                cx={width/2} cy={height/2}
                r={200}
                opacity={silenceLevel.value * 0.15}
              >
                <Paint style="stroke" strokeWidth={0.5} />
                <BlurMask blur={35} style="normal" />
                <RadialGradient
                  c={vec(width/2, height/2)}
                  r={200}
                  colors={['#FFFFFF10', '#00000000']}
                />
              </Circle>
              <Circle
                cx={width/2} cy={height/2}
                r={300}
                opacity={silenceLevel.value * 0.08}
              >
                <Paint style="stroke" strokeWidth={0.3} />
                <BlurMask blur={50} style="normal" />
              </Circle>
            </>
          )}

          {/* ── الطبقة 7: الجسيمات العميقة (Deep Particles) ── */}
          {Array.from({ length: 30 }).map((_, i) => {
            const angle = (i / 30) * Math.PI * 2 + Date.now() / 15000;
            const dist = 150 + Math.sin(Date.now() / 8000 + i) * 60;
            const px = width/2 + Math.cos(angle) * dist;
            const py = height/2 + Math.sin(angle) * dist;
            const pOpacity = 0.02 + (Math.sin(Date.now() / 3000 + i) + 1) * 0.03;
            return (
              <Circle
                key={`deep-${i}`}
                cx={px} cy={py}
                r={2 + Math.random() * 2}
                color={emotionColor.value}
                opacity={pOpacity * energyLevel.value}
              >
                <Paint><BlurMask blur={4} style="solid" /></Paint>
              </Circle>
            );
          })}
        </Group>
      </Canvas>
    </View>
  );
}

