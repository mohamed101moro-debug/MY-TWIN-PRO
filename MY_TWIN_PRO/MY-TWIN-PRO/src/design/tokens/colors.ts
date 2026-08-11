import type { ThemeColors } from '../../../engine/colors';
import { useAppTheme } from '../../../engine/colors';

export {
  DARK_THEME,
  LIGHT_THEME,
  useColors,
  useAppTheme,
} from '../../../engine/colors';
export type { ThemeColors } from '../../../engine/colors';

export { useLivingTheme } from '../../../engine/living-theme';
export type {
  LivingTheme,
  MotionConfig,
  GlassConfig,
  GlowConfig,
  LivingColors,
} from '../../../engine/living-theme';

export function getBondColor(bondLevel: number, colors?: ThemeColors): string {
  const c = colors || useAppTheme().colors;
  if (bondLevel >= 70) return c.rose;
  if (bondLevel >= 40) return c.accent;
  return c.primary;
}

export function getEnergyColor(energy: number, colors?: ThemeColors): string {
  const c = colors || useAppTheme().colors;
  if (energy >= 70) return c.success;
  if (energy >= 30) return c.gold;
  return c.danger;
}

export function getEmotionColor(emotion: string, colors?: ThemeColors): string {
  const c = colors || useAppTheme().colors;
  const map: Record<string, string> = {
    joy: c.gold,
    sadness: '#3B82F6',
    fear: c.accent,
    love: c.rose,
    anger: c.danger,
  };
  return map[emotion] || c.textSecondary;
}
