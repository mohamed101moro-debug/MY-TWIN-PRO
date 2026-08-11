import { stateBus } from '../../src/core/StateBus';
import { unifiedBrainBridge } from '../../src/core/UnifiedBrainBridge';

export interface MemoryContext {
  recentMemories: string[];
  relatedMemories: string[];
  onThisDay: string[];
  emotionalPattern: string;
  dominantPastEmotion: string;
  memoryCount: number;
  hasRelatedContext: boolean;
}

export class MemoryContextEngine {
  private memoryCache: MemoryContext = {
    recentMemories: [],
    relatedMemories: [],
    onThisDay: [],
    emotionalPattern: 'neutral',
    dominantPastEmotion: 'neutral',
    memoryCount: 0,
    hasRelatedContext: false,
  };

  async build(query: string): Promise<MemoryContext> {
    try {
      // Fetch from TCMA via UnifiedBrainBridge
      const recentMems = await unifiedBrainBridge.getCapabilityMemory('conversation', 3);
      const relatedMems = await unifiedBrainBridge.getCapabilityMemory(query.substring(0, 20), 2);
      const onThisDay = await unifiedBrainBridge.getOnThisDay(1);
      const memoryCount = await unifiedBrainBridge.getMemoryCount();

      this.memoryCache.recentMemories = recentMems.map((m: any) => m.expressed_text || m.content || '');
      this.memoryCache.relatedMemories = relatedMems.map((m: any) => m.expressed_text || m.content || '');
      this.memoryCache.onThisDay = onThisDay.map((m: any) => m.expressed_text || m.content || '');
      this.memoryCache.memoryCount = memoryCount;
      this.memoryCache.hasRelatedContext = this.memoryCache.relatedMemories.length > 0;

      // Determine emotional pattern
      const allEmotions = [...recentMems, ...relatedMems].map((m: any) => m.real_emotion || 'neutral');
      if (allEmotions.length > 0) {
        const emotionCounts: Record<string, number> = {};
        allEmotions.forEach(e => { emotionCounts[e] = (emotionCounts[e] || 0) + 1; });
        const dominant = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
        this.memoryCache.dominantPastEmotion = dominant[0];
        this.memoryCache.emotionalPattern = dominant[1] > 2 ? dominant[0] : 'varied';
      }
    } catch (e) {
      // Silent fail — memory context is optional
    }

    stateBus.emit('memory:context_built', this.memoryCache);
    return this.memoryCache;
  }

  getCachedContext(): MemoryContext {
    return { ...this.memoryCache };
  }
}

export const memoryContextEngine = new MemoryContextEngine();
