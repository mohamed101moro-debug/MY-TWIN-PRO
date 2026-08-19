import { useColorScheme } from 'react-native';
/** الثيم الرئيسي v3 — Superset شامل: التطبيق + طبقة design + الكيان (مصدر وحيد للحقيقة). */
export interface AppColors {
  isDark: boolean;
  bg: string; card: string; border: string; text: string; textSecondary: string; accent: string; primary: string;
  inputBg: string; rose: string; success: string; gold: string; danger: string;
  primaryLight: string; entityPurple: string; entityBlue: string; entityPink: string; entityCyan: string;
  auraGlow: string; accentGlow: string;
}
const DARK: AppColors = {
  isDark: true, bg: '#06030F', card: '#120820EE', border: '#9B6FFF33',
  text: '#E8DEFF', textSecondary: '#FFFFFF60', accent: '#9B6FFF', primary: '#9B6FFF',
  inputBg: '#1A0F2E', rose: '#FF82DC', success: '#4ADE80', gold: '#FBBF24', danger: '#F87171',
  primaryLight: '#B476FF', entityPurple: '#9B6FFF', entityBlue: '#548BFF',
  entityPink: '#FF82DC', entityCyan: '#46E2FF', auraGlow: '#6B3FD455', accentGlow: '#46E2FF22',
};
const LIGHT: AppColors = {
  isDark: false, bg: '#F5F3FF', card: '#FFFFFFEE', border: '#6B3FD433',
  text: '#1A0840', textSecondary: '#00000060', accent: '#6B3FD4', primary: '#6B3FD4',
  inputBg: '#FFFFFF', rose: '#EC4899', success: '#16A34A', gold: '#D97706', danger: '#DC2626',
  primaryLight: '#8B5CF6', entityPurple: '#7C3AED', entityBlue: '#3B82F6',
  entityPink: '#EC4899', entityCyan: '#06B6D4', auraGlow: '#8B5CF633', accentGlow: '#06B6D41A',
};
export const DARK_THEME = DARK;
export const LIGHT_THEME = LIGHT;
export type ThemeColors = AppColors;
export const ThemeColors: { dark: AppColors; light: AppColors } = { dark: DARK, light: LIGHT };
export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const FONTS = {
  ai: 'Cairo-Medium',
  arabicBold: 'Cairo-Bold',
  arabicMedium: 'Cairo-Medium',
  arabicRegular: 'Cairo-Regular',
  sizes: { body: 16, small: 13, subtitle: 20, tiny: 11, title: 28 },
};
export function syncInitialTheme(): void {
  try { /* الثيم يُدار لحظيًا عبر useColorScheme داخل المكونات */ } catch {}
}
export function useAppTheme() {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const colors = isDark ? DARK : LIGHT;
  return { isDark, colors, theme: colors };
}
export function useTheme(): AppColors { return useAppTheme().colors; }
export function useColors(): AppColors { return useAppTheme().colors; }
export default useAppTheme;
