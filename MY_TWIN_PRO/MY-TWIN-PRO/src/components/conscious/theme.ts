import { useAppTheme } from '../../../engine/colors';
import type { ThemeColors } from '../../../engine/colors';
import { useTwinStore } from '../../../store/useTwinStore';
/**
 * conscious/theme v3 — اشتقاق من engine/colors (المصدر الواحد).
 * القرار: store.theme (الإعدادات لاحقًا) وإلا نظام الجهاز — نفس سياسة اللغة.
 * يحافظ على الـ API التاريخي (useTheme/getBondColor/getEnergyColor/getEmotionColor).
 */
export type { ThemeColors };
export function useTheme(): any {
  const colors = useAppTheme();
  const stored = useTwinStore((s: any) => s.theme);
  const isDark = stored ? stored === 'dark' : colors.isDark;
  return {
    ...colors,
    bondLow: isDark ? '#60A5FA' : '#3B82F6', bondMedium: '#A855F7', bondHigh: '#EC4899',
    energyLow: isDark ? '#EF4444' : '#DC2626', energyMedium: isDark ? '#F59E0B' : '#D97706', energyHigh: isDark ? '#10B981' : '#16A34A',
    emotionJoy: '#F59E0B', emotionSad: '#60A5FA', emotionFear: '#A78BFA', emotionLove: '#EC4899', emotionAnger: '#EF4444',
    emotionNeutral: isDark ? '#8B7BA3' : '#6B6B6B',
    name: isDark ? 'dark' : 'light', mode: isDark ? 'dark' : 'light', isDark,
  };
}
export function getBondColor(bondLevel: number, colors: any): string {
  if (bondLevel >= 70) return colors.bondHigh;
  if (bondLevel >= 40) return colors.bondMedium;
  return colors.bondLow;
}
export function getEnergyColor(energy: number, colors: any): string {
  if (energy >= 70) return colors.energyHigh;
  if (energy >= 30) return colors.energyMedium;
  return colors.energyLow;
}
export function getEmotionColor(emotion: string, colors: any): string {
  const map: Record<string, string> = {
    joy: colors.emotionJoy, sadness: colors.emotionSad, fear: colors.emotionFear,
    love: colors.emotionLove, anger: colors.emotionAnger,
  };
  return map[emotion] || colors.emotionNeutral;
}
