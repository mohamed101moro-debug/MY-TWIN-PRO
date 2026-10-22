/**
 * S6V — Living Visual Entity Contract.
 *
 * This is the formal visual language for My Twin. It is a projection contract,
 * not a state authority. The renderer may express canonical state, but it must
 * never create identity, memory, bond, emotion, intention, continuity or action.
 */

export const VISUAL_ENTITY_CONTRACT_VERSION = 's6v.0';

export const VISUAL_LAYERS = [
  'outer_halo',
  'energy_membrane',
  'emotional_aura',
  'core_light',
  'expressive_eyes',
  'micro_particles',
] as const;

export type VisualLayer = typeof VISUAL_LAYERS[number];

export const EMOTION_LIKE_STATES = [
  'calm', 'happy', 'curious', 'thinking', 'sad', 'surprised', 'angry', 'sleepy',
] as const;
export type EmotionLikeVisualState = typeof EMOTION_LIKE_STATES[number];

export const CONVERSATION_STATES = [
  'idle', 'listening', 'processing', 'understanding', 'responding',
] as const;
export type VisualConversationState = typeof CONVERSATION_STATES[number];

export const ENVIRONMENTAL_REACTIONS = [
  'low_light', 'bright_light', 'loud_noise', 'soft_voice', 'user_near', 'motion_detected', 'camera_on',
] as const;
export type EnvironmentalReaction = typeof ENVIRONMENTAL_REACTIONS[number];

export const ENERGY_MODES = ['sleep', 'normal', 'high_energy'] as const;
export type VisualEnergyMode = typeof ENERGY_MODES[number];

export const VISUAL_THEMES = ['light', 'dark'] as const;
export type VisualTheme = typeof VISUAL_THEMES[number];

export const PERFORMANCE_TIERS = ['ultra', 'high', 'balanced', 'low'] as const;
export const VISUAL_ACCESSIBILITY_MODES = ['full', 'reduced_motion'] as const;
export type VisualAccessibilityMode = typeof VISUAL_ACCESSIBILITY_MODES[number];
export type VisualPerformanceTier = typeof PERFORMANCE_TIERS[number];

export interface VisualEntityPolicy {
  readonly canRead: readonly string[];
  readonly cannotWrite: readonly string[];
}

export const VISUAL_ENTITY_POLICY: VisualEntityPolicy = {
  canRead: [
    'canonical_state', 'presence_state', 'visual_state', 'conversation_state',
    'environment_evidence', 'performance_tier', 'theme',
  ],
  cannotWrite: [
    'identity', 'entity_id', 'memory', 'bond', 'trust', 'emotion', 'curiosity',
    'continuity', 'goal', 'intention', 'life_intention', 'constitution', 'action',
  ],
};

export const VISUAL_NORTH_STAR = {
  name: 'My Twin Living Visual Entity Specification — Light & Dark',
  contractVersion: VISUAL_ENTITY_CONTRACT_VERSION,
  tagline: 'Not an effect. A presence.',
  engineeringMeaning: 'presence_presentation',
  themes: VISUAL_THEMES,
  layers: VISUAL_LAYERS,
  emotionLikeStates: EMOTION_LIKE_STATES,
  conversationStates: CONVERSATION_STATES,
  environmentalReactions: ENVIRONMENTAL_REACTIONS,
  energyModes: ENERGY_MODES,
  performanceTiers: PERFORMANCE_TIERS,
  accessibilityModes: VISUAL_ACCESSIBILITY_MODES,
  sameEntityAcrossThemes: true,
} as const;

export function isEmotionLikeVisualState(value: unknown): value is EmotionLikeVisualState {
  return typeof value === 'string' && (EMOTION_LIKE_STATES as readonly string[]).includes(value);
}

export function normalizeVisualEmotion(value: unknown): EmotionLikeVisualState {
  const raw = String(value ?? 'calm').trim().toLowerCase();
  const aliases: Record<string, EmotionLikeVisualState> = {
    neutral: 'calm', joy: 'happy', excited: 'happy', surprise: 'surprised',
    sadness: 'sad', anger: 'angry', tired: 'sleepy', resting: 'sleepy',
  };
  const normalized = aliases[raw] ?? raw;
  return isEmotionLikeVisualState(normalized) ? normalized : 'calm';
}

export function deriveEnergyMode(energy: number, emotion?: string): VisualEnergyMode {
  const e = Math.max(0, Math.min(1, Number.isFinite(Number(energy)) ? Number(energy) : 0.55));
  if (normalizeVisualEmotion(emotion) === 'sleepy' || e < 0.25) return 'sleep';
  if (e >= 0.75) return 'high_energy';
  return 'normal';
}
