import { unifiedBrainBridge } from '../core/UnifiedBrainBridge';

/**
 * أنواع القدرات المدعومة
 */
const ALL_CAPABILITIES = [
  'study', 'code_lab', 'business', 'content_creator',
  'dream', 'life_coach', 'task_manager', 'ai_image', 'smart_home',
];

/**
 * هيكل الذاكرة الموحد (متوافق مع TCMA)
 */
interface MemoryEntry {
  id: string;
  type: string;
  content: string;
  expressed_text?: string;
  real_emotion?: string;
  importance: number;
  confidence: number;
  timestamp: string;
  created_at?: string;
}

export interface UnifiedMemoryResult {
  capability: string;
  memories: MemoryEntry[];
}

export interface CrossCapabilityLink {
  source: { capability: string; memoryId: string; content: string };
  target: { capability: string; memoryId: string; content: string };
  reason: string;
  strength: number;
}

/**
 * UNIFIED CAPABILITY MEMORY v2.0
 * ===============================
 * طبقة توحد ذاكرة جميع القدرات.
 * ✅ تستخدم unifiedBrainBridge للاتصال بـ TCMA الحقيقية.
 */
export class UnifiedCapabilityMemory {
  /**
   * جلب ذكريات موحدة من جميع القدرات
   */
  async getAllCapabilitiesMemory(limit: number = 5): Promise<UnifiedMemoryResult[]> {
    const results: UnifiedMemoryResult[] = [];

    for (const capability of ALL_CAPABILITIES) {
      try {
        const memories = await unifiedBrainBridge.getCapabilityMemory(capability, limit);
        if (memories.length > 0) {
          const mapped: MemoryEntry[] = memories.map(m => ({
            id: m.id,
            type: capability,
            content: m.expressed_text || m.content || '',
            expressed_text: m.expressed_text,
            real_emotion: m.real_emotion,
            importance: m.importance || 50,
            confidence: m.confidence || 0.7,
            timestamp: m.created_at || m.timestamp || new Date().toISOString(),
            created_at: m.created_at,
          }));
          results.push({ capability, memories: mapped });
        }
      } catch (e) {}
    }

    return results;
  }

  /**
   * جلب أحدث الذكريات عبر جميع القدرات
   */
  async getRecentUnified(limit: number = 10): Promise<MemoryEntry[]> {
    const allMemories: MemoryEntry[] = [];

    for (const capability of ALL_CAPABILITIES) {
      try {
        const memories = await unifiedBrainBridge.getCapabilityMemory(capability, 3);
        const mapped = memories.map(m => ({
          id: m.id,
          type: capability,
          content: m.expressed_text || m.content || '',
          expressed_text: m.expressed_text,
          real_emotion: m.real_emotion,
          importance: m.importance || 50,
          confidence: m.confidence || 0.7,
          timestamp: m.created_at || m.timestamp || new Date().toISOString(),
          created_at: m.created_at,
        }));
        allMemories.push(...mapped);
      } catch (e) {}
    }

    return allMemories
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * اكتشاف روابط بين قدرات مختلفة
   */
  async findCrossCapabilityLinks(): Promise<CrossCapabilityLink[]> {
    const links: CrossCapabilityLink[] = [];
    const allMemories = await this.getAllCapabilitiesMemory(10);

    for (let i = 0; i < allMemories.length; i++) {
      for (let j = i + 1; j < allMemories.length; j++) {
        const capA = allMemories[i];
        const capB = allMemories[j];

        for (const memA of capA.memories) {
          for (const memB of capB.memories) {
            const reason = this.detectLink(memA, memB, capA.capability, capB.capability);
            if (reason) {
              links.push({
                source: { capability: capA.capability, memoryId: memA.id, content: memA.content },
                target: { capability: capB.capability, memoryId: memB.id, content: memB.content },
                reason,
                strength: Math.min(1, (memA.importance + memB.importance) / 200),
              });
            }
          }
        }
      }
    }

    return links.sort((a, b) => b.strength - a.strength);
  }

  /**
   * البحث عبر جميع الذكريات الموحدة
   */
  async searchUnified(query: string, limit: number = 10): Promise<MemoryEntry[]> {
    const allMemories: MemoryEntry[] = [];

    for (const capability of ALL_CAPABILITIES) {
      try {
        const memories = await unifiedBrainBridge.getCapabilityMemory(capability, limit * 2);
        const filtered = memories.filter(
          m => (m.expressed_text || m.content || '').toLowerCase().includes(query.toLowerCase())
        );
        const mapped = filtered.map(m => ({
          id: m.id,
          type: capability,
          content: m.expressed_text || m.content || '',
          expressed_text: m.expressed_text,
          real_emotion: m.real_emotion,
          importance: m.importance || 50,
          confidence: m.confidence || 0.7,
          timestamp: m.created_at || m.timestamp || new Date().toISOString(),
          created_at: m.created_at,
        }));
        allMemories.push(...mapped);
      } catch (e) {}
    }

    return allMemories
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  // ═══════════════════════════════════════════════════
  // Private
  // ═══════════════════════════════════════════════════

  private detectLink(
    memA: MemoryEntry, memB: MemoryEntry,
    capA: string, capB: string,
  ): string | null {
    const wordsA = memA.content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const wordsB = memB.content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const commonWords = wordsA.filter(w => wordsB.includes(w));

    if (commonWords.length >= 2) {
      return `رابط موضوعي: ${commonWords.slice(0, 2).join('، ')}`;
    }

    if (memA.real_emotion && memB.real_emotion && memA.real_emotion === memB.real_emotion && memA.real_emotion !== 'neutral') {
      return `نفس العاطفة: ${memA.real_emotion}`;
    }

    const timeDiff = Math.abs(
      new Date(memA.timestamp).getTime() - new Date(memB.timestamp).getTime()
    );
    if (timeDiff < 3600000) {
      return 'قريبان زمنياً';
    }

    return null;
  }
}

export const unifiedCapabilityMemory = new UnifiedCapabilityMemory();
