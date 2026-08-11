/**
 * MOTION TOKENS v1.0 — مرجع الحركة الموحد
 * ============================================
 * يعيد تصدير MotionConfig من engine/living-theme.ts
 * ويضيف motion tokens مسماة لاستخدامها في أي Animation.
 *
 * الاستخدام:
 *   import { MOTION } from 'src/design/tokens/motion';
 *   withTiming(value, { duration: MOTION.breath.slow })
 */

// ── إعادة تصدير النوع من engine ──────────────────────
export type { MotionConfig } from '../../../engine/living-theme';

// ── Tokens حركية مسماة ──────────────────────────────
export const MOTION = {
  breath: {
    slow: 6000,       // نائم
    resting: 4000,    // خامل
    normal: 3500,     // واعي
    active: 2500,     // يفكر
    fast: 1500,       // يتحدث
    deep: 7000,       // يحلم
  },
  pulse: {
    slow: 4000,
    resting: 2500,
    normal: 1800,
    active: 1200,
    fast: 800,
    deep: 5000,
  },
  thinking: {
    slow: 1500,
    normal: 900,
    fast: 500,
    deep: 3000,
  },
  transition: {
    slow: 1000,
    normal: 500,
    fast: 300,
    workspace: 600,
  },
  wave: {
    slow: 5000,
    normal: 1200,
    fast: 600,
    speaking: 400,
  },
} as const;

// ── قيم جاهزة للـ Reanimated ────────────────────────
export const SPRING = {
  gentle: { mass: 1, damping: 15, stiffness: 120 },
  snappy: { mass: 0.8, damping: 12, stiffness: 200 },
  bouncy: { mass: 1, damping: 10, stiffness: 150 },
  heavy: { mass: 2, damping: 18, stiffness: 100 },
  breath: { mass: 1.5, damping: 20, stiffness: 80 },
} as const;

export const DURATION = {
  instant: 100,
  fast: 200,
  normal: 400,
  slow: 600,
  workspace: 800,
  ambient: 2000,
} as const;
