import { apiPost, apiGet } from '../../lib/httpClient';

export interface UnifiedResponse {
  reply: string;
  provider: string;
  tone: string;
  emotion: string;
  intensity: number;
  silence_ms: number;
  energy: number;
  bond_level: number;
  phase: string;
  latency_ms: number;
  limits: { can_send: boolean; remaining: number };
  memory_surfaced: any;
  suggested_question: string | null;
  twin_emotional_state: any;
  twin_state_update: any;
  extended?: any;
  continuity_context?: any;
  continuity_persisted?: boolean;
  cognitive_state?: any;
}

class UnifiedBrainBridge {
  private userId: string = '';
  private lang: string = 'ar';

  setUserId(id: string): void { this.userId = id; }
  setLang(lang: string): void { this.lang = lang; }
  clearSession(): void { this.userId = ''; this.lang = 'ar'; }

  async process(message: string): Promise<UnifiedResponse> {
    if (!this.userId) throw new Error('AUTH_REQUIRED');
    return await apiPost('/api/chat', { message, lang: this.lang });
  }

  // ✅ الطرق الجديدة المفقودة
  async storeMemory(type: string, content: string, importance: number = 50, emotion: string = 'neutral', relatedTo: string[] = []): Promise<void> {
    try {
      await apiPost('/api/memories/store', {
        user_id: this.userId, type, content, importance, emotion, related_to: relatedTo,
      });
    } catch (e) {}
  }

  async getCapabilityMemory(capabilityType: string, limit: number = 10): Promise<any[]> {
    try {
      const response = await apiGet(`/api/memories/capability?user_id=${this.userId}&capability=${capabilityType}&limit=${limit}`);
      return response?.memories || [];
    } catch (e) { return []; }
  }

  async getTwinState(): Promise<any> {
    try {
      return await apiGet('/api/twin/state') || {};
    } catch (e) { return {}; }
  }

  async getOnThisDay(limit: number = 5): Promise<any[]> {
    try {
      const response = await apiGet(`/api/memories/on_this_day?user_id=${this.userId}&limit=${limit}`);
      return response?.memories || [];
    } catch (e) { return []; }
  }

  async getMostVisitedWorld(): Promise<string> {
    try {
      const memories = await this.getCapabilityMemory('world', 1);
      return memories.length > 0 ? (memories[0].content || memories[0].expressed_text || '') : '';
    } catch (e) { return ''; }
  }

  async getMostUsedCapability(): Promise<string> {
    try {
      const response = await apiGet(`/api/memories/most_used_capability?user_id=${this.userId}`);
      return response?.capability || '';
    } catch (e) { return ''; }
  }

  async getMemoryCount(): Promise<number> {
    try {
      const response = await apiGet(`/api/memories/count?user_id=${this.userId}`);
      return response?.count || 0;
    } catch (e) { return 0; }
  }

  async getCoreMemories(limit: number = 12): Promise<any[]> {
    try {
      const response = await apiGet(`/api/memories/core?user_id=${this.userId}&limit=${limit}`);
      return response?.memories || [];
    } catch (e) { return []; }
  }

  async getRecentEmotions(limit: number = 5): Promise<string[]> {
    try {
      const response = await apiGet(`/api/memories/recent_emotions?user_id=${this.userId}&limit=${limit}`);
      return response?.emotions || [];
    } catch (e) { return []; }
  }
}

export const unifiedBrainBridge = new UnifiedBrainBridge();
