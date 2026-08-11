import { useTwinCoreStore } from '../store/useTwinCoreStore';
import { Appearance } from 'react-native';

export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  card: string;
  header: string;
  chatBg: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryLight: string;
  gold: string;
  rose: string;
  accent: string;
  accentGlow: string;
  border: string;
  inputBg: string;
  twinBubble: string;
  danger: string;
  success: string;
  white: string;
  glass: string;
}

export const FONTS = {
  arabicBold: 'Tajawal_700Bold',
  arabicMedium: 'Tajawal_500Medium',
  arabicRegular: 'Tajawal_400Regular',
  ai: 'Orbitron_700Bold',
  sizes: { title: 28, subtitle: 18, body: 16, small: 14, tiny: 12 },
};

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const DARK_THEME: ThemeColors = {
  bg: '#120B1E',
  bgSecondary: '#1A1226',
  card: '#1A1226',
  header: '#130D20',
  chatBg: '#120B1E',
  text: '#F3F0FF',
  textSecondary: '#A09BB5',
  primary: '#D8B4FE',
  primaryLight: '#E9D5FF',
  gold: '#F59E0B',
  rose: '#F472B6',
  accent: '#A855F7',
  accentGlow: 'rgba(168, 85, 247, 0.2)',
  border: '#2D1B4D',
  inputBg: '#161122',
  twinBubble: '#1A1226',
  danger: '#FF6B6B',
  success: '#4ADE80',
  white: '#FFFFFF',
  glass: 'rgba(42, 42, 42, 0.7)',
};

export const LIGHT_THEME: ThemeColors = {
  bg: '#F8F6F2',
  bgSecondary: '#F3F0FF',
  card: '#FFFFFF',
  header: '#FDFDFB',
  chatBg: '#F8F6F2',
  text: '#1A1226',
  textSecondary: '#6B5B8A',
  primary: '#6B21A8',
  primaryLight: '#A855F7',
  gold: '#B8860B',
  rose: '#C08497',
  accent: '#6B21A8',
  accentGlow: 'rgba(107, 33, 168, 0.1)',
  border: '#E0D9F5',
  inputBg: '#FFFFFF',
  twinBubble: '#F3F0FF',
  danger: '#DC2626',
  success: '#16A34A',
  white: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.7)',
};

export function useColors(): ThemeColors {
  const theme = useTwinCoreStore((s) => s.theme);
  return theme === 'dark' ? DARK_THEME : LIGHT_THEME;
}

export function getColors(isDark: boolean): ThemeColors {
  return isDark ? DARK_THEME : LIGHT_THEME;
}

export function useAppTheme() {
  const theme = useTwinCoreStore((s) => s.theme);
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_THEME : LIGHT_THEME;
  return { colors, isDark };
}

export function syncInitialTheme() {
  const store = useTwinCoreStore.getState();
  if (!store.themeManuallySet) {
    const systemTheme = Appearance.getColorScheme();
    if (systemTheme) {
      store.syncSystemTheme?.();
    }
  }
}
