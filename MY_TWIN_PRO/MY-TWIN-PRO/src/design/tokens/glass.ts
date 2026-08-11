/**
 * GLASS TOKENS v1.0 — مرجع الزجاج الموحد
 * ==========================================
 * يعيد تصدير GlassConfig من engine/living-theme.ts
 * ويضيف glass tokens مسماة.
 *
 * الاستخدام:
 *   import { GLASS } from 'src/design/tokens/glass';
 *   <BlurView intensity={GLASS.card.blur} />
 */

export type { GlassConfig } from '../../../engine/living-theme';

export const GLASS = {
  card: {
    opacity: 0.12,
    blur: 14,
    borderOpacity: 0.16,
  },
  panel: {
    opacity: 0.10,
    blur: 12,
    borderOpacity: 0.14,
  },
  input: {
    opacity: 0.08,
    blur: 10,
    borderOpacity: 0.10,
  },
  heavy: {
    opacity: 0.18,
    blur: 20,
    borderOpacity: 0.22,
  },
} as const;
