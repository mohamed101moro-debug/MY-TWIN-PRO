import { stateBus } from '../../src/core/StateBus';

export interface RelationshipContext {
  bondLevel: number;
  phase: string;
  trustScore: number;
  attachmentStyle: string;
  interactionCount: number;
  lastInteraction: string;
  relationshipDepth: 'surface' | 'growing' | 'deep' | 'profound';
  tone: string;
}

export class RelationshipContextEngine {
  evaluate(): RelationshipContext {
    const presenceState = stateBus.getState();
    const bondLevel = presenceState.relationship?.bondLevel || 0;
    const trustScore = presenceState.relationship?.trustScore || 0.5;
    const attachmentStyle = presenceState.relationship?.attachmentStyle || 'secure';

    let phase = 'stranger';
    if (bondLevel >= 95) phase = 'soulmate';
    else if (bondLevel >= 80) phase = 'close_friend';
    else if (bondLevel >= 60) phase = 'friend';
    else if (bondLevel >= 40) phase = 'familiar';
    else if (bondLevel >= 20) phase = 'acquaintance';

    let relationshipDepth: 'surface' | 'growing' | 'deep' | 'profound' = 'surface';
    if (bondLevel >= 90) relationshipDepth = 'profound';
    else if (bondLevel >= 70) relationshipDepth = 'deep';
    else if (bondLevel >= 30) relationshipDepth = 'growing';

    let tone = 'neutral';
    if (phase === 'soulmate' || phase === 'close_friend') tone = 'intimate_warm';
    else if (phase === 'friend') tone = 'friendly';
    else if (phase === 'familiar') tone = 'polite_warm';
    else tone = 'formal_gentle';

    const context: RelationshipContext = {
      bondLevel,
      phase,
      trustScore,
      attachmentStyle,
      interactionCount: 0,
      lastInteraction: new Date().toISOString(),
      relationshipDepth,
      tone,
    };

    stateBus.emit('relationship:context_built', context);
    return context;
  }

  getPhaseFromBond(bondLevel: number): string {
    if (bondLevel >= 95) return 'soulmate';
    if (bondLevel >= 80) return 'close_friend';
    if (bondLevel >= 60) return 'friend';
    if (bondLevel >= 40) return 'familiar';
    if (bondLevel >= 20) return 'acquaintance';
    return 'stranger';
  }
}

export const relationshipContextEngine = new RelationshipContextEngine();
