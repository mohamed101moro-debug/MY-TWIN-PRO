import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useLivingTheme } from '../../../engine/living-theme';

export type Status = 'idle' | 'thinking' | 'analyzing' | 'learning' | 'remembering' | 'speaking' | 'connecting' | 'planning' | 'researching';
export type Emotion = 'neutral' | 'happy' | 'focused' | 'curious' | 'concerned' | 'inspired' | 'calm';
export type Variant = 'twin' | 'user' | 'warning' | 'success' | 'memory' | 'dream' | 'glass';

interface LivingSurfaceProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  variant?: Variant;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
}

export const LivingSurface = ({
  children, style, variant = 'glass', title, subtitle, onPress,
}: LivingSurfaceProps) => {
  const theme = useLivingTheme();

  const variantStyles = useMemo(() => {
    const map: Record<Variant, any> = {
      twin:    { bg: theme.colors.card, border: theme.colors.accent + '50' },
      user:    { bg: theme.colors.card, border: theme.colors.border },
      warning: { bg: '#F59E0B10', border: '#F59E0B50' },
      success: { bg: '#10B98110', border: '#10B98150' },
      memory:  { bg: '#8B5CF610', border: '#8B5CF650' },
      dream:   { bg: '#6366F110', border: '#6366F150' },
      glass:   { bg: theme.colors.card, border: theme.colors.border },
    };
    return map[variant] || map.glass;
  }, [variant, theme]);

  const Container = onPress ? TouchableOpacity : View;

  return (
    <View style={[st.surface, { backgroundColor: variantStyles.bg, borderColor: variantStyles.border, borderRadius: theme.radius.lg }, style]}>
      <Container onPress={onPress} activeOpacity={0.8}>
        {(title || subtitle) && (
          <View style={st.header}>
            {title && <Text style={[st.title, { color: theme.colors.text }]}>{title}</Text>}
            {subtitle && <Text style={[st.subtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>}
          </View>
        )}
        <View style={st.body}>{children}</View>
      </Container>
    </View>
  );
};

const st = StyleSheet.create({
  surface: { borderWidth: 1.5, padding: 16, marginBottom: 10, overflow: 'hidden' },
  header: { marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  body: {},
});
