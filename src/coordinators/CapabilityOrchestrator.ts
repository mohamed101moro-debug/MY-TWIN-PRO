import { capabilityResolver, CapabilityType } from './CapabilityResolver';
import { unifiedCapabilityMemory } from './UnifiedCapabilityMemory';
import { unifiedBrainBridge } from '../core/UnifiedBrainBridge';
import { EventBus } from '../core/EventBus';

/**
 * قرار مبني على حالة الكيان الحية
 */
interface Decision {
  action: string;
  workspaceType?: string;
  confidence: number;
  reasoning: string;
}

/**
 * نتيجة تنسيق القدرات
 */
export interface OrchestrationResult {
  primaryCapability: CapabilityType;
  secondaryCapabilities: CapabilityType[];
  decision: Decision;
  memoriesUsed: number;
  crossLinks: number;
  reasoning: string;
}

/**
 * CAPABILITY ORCHESTRATOR v3.0
 * ==============================
 * العقل الذي ينسق بين جميع القدرات.
 * ✅ القرار مبني على حالة الكيان من Unified Brain.
 */
export class CapabilityOrchestrator {
  async orchestrate(
    message: string,
    userId: string,
  ): Promise<OrchestrationResult> {
    const primary = capabilityResolver.resolve(message);

    // ✅ قرار مبني على حالة الكيان الحية من Unified Brain
    let decision: Decision = {
      action: primary.confidence > 0.6 ? 'activate_capability' : 'general_conversation',
      workspaceType: primary.capability !== 'general' ? primary.capability : undefined,
      confidence: primary.confidence,
      reasoning: primary.confidence > 0.6
        ? `تم اكتشاف نية قوية نحو ${primary.capability}`
        : 'لم يتم اكتشاف نية محددة',
    };

    try {
      const twinState = await unifiedBrainBridge.getTwinState();
      const emotion = twinState?.twin_emotional_state?.current_emotion || 'neutral';
      const bondLevel = twinState?.twin_state_update?.relationship?.bond_level || 0;
      
      const adjustedConfidence = primary.confidence + (emotion === 'focused' ? 0.1 : emotion === 'sad' ? -0.1 : 0);
      decision = {
        action: adjustedConfidence > 0.6 ? 'activate_capability' : 'general_conversation',
        workspaceType: primary.capability !== 'general' ? primary.capability : undefined,
        confidence: Math.min(1, Math.max(0, adjustedConfidence)),
        reasoning: adjustedConfidence > 0.6
          ? `نية قوية نحو ${primary.capability} (ثقة: ${adjustedConfidence.toFixed(2)})`
          : 'لم يتم اكتشاف نية محددة',
      };
    } catch (e) {}

    let secondaryCapabilities: CapabilityType[] = [];
    let memoriesUsed = 0;
    let crossLinks = 0;

    if (primary.confidence > 0.5) {
      try {
        const links = await unifiedCapabilityMemory.findCrossCapabilityLinks();
        crossLinks = links.length;

        const recentUnified = await unifiedCapabilityMemory.getRecentUnified(10);
        memoriesUsed = recentUnified.length;

        for (const link of links.slice(0, 3)) {
          const sourceCap = link.source.capability as CapabilityType;
          const targetCap = link.target.capability as CapabilityType;
          if (sourceCap === primary.capability && !secondaryCapabilities.includes(targetCap)) {
            secondaryCapabilities.push(targetCap);
          }
          if (targetCap === primary.capability && !secondaryCapabilities.includes(sourceCap)) {
            secondaryCapabilities.push(sourceCap);
          }
        }

        if (decision.action === 'suggest_workspace' && decision.workspaceType) {
          const suggested = decision.workspaceType as CapabilityType;
          if (suggested !== primary.capability && !secondaryCapabilities.includes(suggested)) {
            secondaryCapabilities.push(suggested);
          }
        }
      } catch (e) {}
    }

    const reasoning = this.buildReasoning(primary.capability, secondaryCapabilities, crossLinks);

    EventBus.emit('CAPABILITY_ORCHESTRATION_COMPLETE', {
      primary: primary.capability,
      secondary: secondaryCapabilities,
      reasoning,
    });

    return {
      primaryCapability: primary.capability,
      secondaryCapabilities,
      decision,
      memoriesUsed,
      crossLinks,
      reasoning,
    };
  }

  async activateChain(capabilities: CapabilityType[]): Promise<void> {
    if (capabilities.length === 0) return;
    const primary = capabilities[0];
    capabilityResolver.activate(primary);
    for (let i = 1; i < capabilities.length; i++) {
      setTimeout(() => {
        capabilityResolver.activate(capabilities[i]);
      }, i * 2000);
    }
  }

  private buildReasoning(
    primary: CapabilityType,
    secondary: CapabilityType[],
    crossLinks: number,
  ): string {
    let reasoning = `القدرة الأساسية: ${primary}. `;
    if (secondary.length > 0) {
      reasoning += `قدرات مساعدة: ${secondary.join('، ')}. `;
    }
    if (crossLinks > 0) {
      reasoning += `تم العثور على ${crossLinks} روابط عبر الذاكرة الموحدة.`;
    }
    return reasoning;
  }
}

export const capabilityOrchestrator = new CapabilityOrchestrator();
