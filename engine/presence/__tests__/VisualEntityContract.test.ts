import {
  EMOTION_LIKE_STATES, CONVERSATION_STATES, VISUAL_LAYERS, VISUAL_NORTH_STAR,
  VISUAL_ENTITY_POLICY, normalizeVisualEmotion, deriveEnergyMode,
} from '../VisualEntityContract';
import { buildVisualState } from '../VisualState';

describe('S6V Living Visual Entity contract', () => {
  test('north star contains the complete canonical visual vocabulary', () => {
    expect(VISUAL_LAYERS).toHaveLength(6);
    expect(EMOTION_LIKE_STATES).toEqual(expect.arrayContaining(['calm','happy','curious','thinking','sad','surprised','angry','sleepy']));
    expect(CONVERSATION_STATES).toEqual(['idle','listening','processing','understanding','responding']);
    expect(VISUAL_NORTH_STAR.sameEntityAcrossThemes).toBe(true);
    expect(VISUAL_NORTH_STAR.tagline).toBe('Not an effect. A presence.');
  });

  test('renderer policy is presentation-only', () => {
    expect(VISUAL_ENTITY_POLICY.cannotWrite).toEqual(expect.arrayContaining(['identity','memory','bond','emotion','continuity','intention','action']));
  });

  test('emotion normalization is deterministic and bounded', () => {
    expect(normalizeVisualEmotion('neutral')).toBe('calm');
    expect(normalizeVisualEmotion('surprise')).toBe('surprised');
    expect(normalizeVisualEmotion('unknown')).toBe('calm');
    expect(deriveEnergyMode(0.1)).toBe('sleep');
    expect(deriveEnergyMode(0.9)).toBe('high_energy');
    expect(deriveEnergyMode(0.5)).toBe('normal');
  });

  test('VisualState is a pure projection of PresenceState', () => {
    const a = buildVisualState({ emotion: 'curious', energy: 0.8, listening: true }, undefined, 1);
    const b = buildVisualState({ emotion: 'curious', energy: 0.8, listening: true }, undefined, 1);
    expect(a).toEqual(b);
    expect(a.contractVersion).toBe('s6v.0');
    expect(a.energyMode).toBe('high_energy');
  });
});
