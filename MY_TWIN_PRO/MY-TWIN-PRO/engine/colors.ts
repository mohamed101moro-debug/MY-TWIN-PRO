import { useColorScheme } from 'react-native';
/** الثيم الرئيسي المطوّر — ألوان التطبيق + ألوان الكيان (مصدر وحيد للحقيقة). */
export interface AppColors {
  isDark: boolean;
  bg: string; card: string; border: string; text: string; textSecondary: string; accent: string;
  primaryLight: string; entityPurple: string; entityBlue: string; entityPink: string; entityCyan: string;
  auraGlow: string; accentGlow: string;
}
const DARK: AppColors = {
  isDark: true, bg: '#06030F', card: '#120820EE', border: '#9B6FFF33',
  text: '#E8DEFF', textSecondary: '#FFFFFF60', accent: '#9B6FFF',
  primaryLight: '#B476FF', entityPurple: '#9B6FFF', entityBlue: '#548BFF',
  entityPink: '#FF82DC', entityCyan: '#46E2FF', auraGlow: '#6B3FD455', accentGlow: '#46E2FF22',
};
const LIGHT: AppColors = {
  isDark: false, bg: '#F5F3FF', card: '#FFFFFFEE', border: '#6B3FD433',
  text: '#1A0840', textSecondary: '#00000060', accent: '#6B3FD4',
  primaryLight: '#8B5CF6', entityPurple: '#7C3AED', entityBlue: '#3B82F6',
  entityPink: '#EC4899', entityCyan: '#06B6D4', auraGlow: '#8B5CF633', accentGlow: '#06B6D41A',
};
export function useAppTheme() {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const colors = isDark ? DARK : LIGHT;
  return { isDark, colors, theme: colors };
}
export function useTheme(): AppColors { return useAppTheme().colors; }
export default useAppTheme;
