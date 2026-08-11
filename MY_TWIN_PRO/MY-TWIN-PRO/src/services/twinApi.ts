import { apiPost, apiGet, apiStream } from '../../lib/httpClient';

export interface ChatResponse {
  reply: string;
  provider: string;
  use_voice?: boolean;
  twin_emotional_state?: {
    current_emotion: string;
    real_emotion?: string;
    confidence?: number;
    intensity?: number;
    recommendation?: string;
    cultural_analysis?: string;
    is_culturally_disguised?: boolean;
  };
  relationship_update?: {
    bond_level: number;
    stage: string;
    trust: number;
    trend: 'improving' | 'declining' | 'stable';
  };
}

export interface TwinStateResponse {
  mood: string;
  energy_level: number;
  presence_level: number;
}

export async function sendMessage(
  message: string,
  history: Array<{ role: string; content: string }>,
  lang: string,
  userId?: string
): Promise<ChatResponse> {
  const response = await apiPost('/api/chat', {
    message,
    history,
    lang,
    user_id: userId,
  });
  return response as ChatResponse;
}

export async function streamMessage(
  message: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
  lang?: string
): Promise<void> {
  try {
    await apiStream('/api/chat/stream', { message, lang }, onChunk, onDone, onError);
  } catch (e: any) {
    onError(e.message || 'Stream error');
  }
}

export async function getTwinState(userId: string, lang: string): Promise<TwinStateResponse> {
  const response = await apiGet(`/api/twin/state?user_id=${userId}&lang=${lang}`);
  return response as TwinStateResponse;
}

export async function getRecentMemories(userId: string, limit: number = 5): Promise<any> {
  const response = await apiGet(`/api/memories?user_id=${userId}&limit=${limit}`);
  return response;
}

export async function storeMemory(userId: string, content: string, type: string, importance: number): Promise<any> {
  const response = await apiPost('/api/memories', {
    user_id: userId,
    content,
    type,
    importance,
  });
  return response;
}

export async function getRelationshipHealth(userId: string): Promise<any> {
  const response = await apiGet(`/api/relationship?user_id=${userId}`);
  return response;
}

export async function getRelationshipInsights(userId: string): Promise<any> {
  const response = await apiGet(`/api/relationship/insights?user_id=${userId}`);
  return response;
}
