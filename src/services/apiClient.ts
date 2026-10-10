/**
 * API CLIENT v2.0 — عميل API موحد
 * ==================================
 * يغلف lib/httpClient.ts الموجود.
 * يوفر واجهة موحدة لجميع استدعاءات Backend.
 *
 * يستخدم: lib/httpClient.ts (apiPost, apiGet, apiDelete, apiPut, apiStream)
 */

import { apiPost, apiGet, apiDelete, apiPut, apiStream } from '../../lib/httpClient';

// ═══════════════════════════════════════════
// كائن apiClient الموحد (يُستخدم من UnifiedBrainBridge)
// ═══════════════════════════════════════════
export const apiClient = {
  post: apiPost,
  get: apiGet,
  delete: apiDelete,
  put: apiPut,
  stream: apiStream,
};

// ═══════════════════════════════════════════
// Chat
// ═══════════════════════════════════════════
export async function sendMessage(message: string, history: any[] = [], lang: string = 'ar') {
  return apiPost('/api/chat', { message, history, lang });
}

export async function streamMessage(
  message: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
) {
  return apiStream('/api/chat/stream', { message }, onChunk, onDone, onError);
}

// ═══════════════════════════════════════════
// Memory
// ═══════════════════════════════════════════
export async function getRecentContext() {
  return apiGet('/api/memories/recent');
}

export async function saveMemory(content: string, type: string = 'conversation') {
  return apiPost('/api/memories', { content, type });
}

export async function retrieveMemories(query: string, limit: number = 5) {
  return apiGet(`/api/memories/search?query=${encodeURIComponent(query)}&limit=${limit}`);
}

// ═══════════════════════════════════════════
// Relationship
// ═══════════════════════════════════════════
export async function getRelationshipInsights(userId: string) {
  return apiGet(`/api/relationship/insights?user_id=${userId}`);
}

export async function getRelationshipHealth(userId: string) {
  return apiGet(`/api/relationship/health?user_id=${userId}`);
}

// ═══════════════════════════════════════════
// Twin State
// ═══════════════════════════════════════════
export async function getTwinState() {
  return apiGet('/api/twin-state');
}

export async function updateTwinState(state: Record<string, any>) {
  return apiPost('/api/twin-state', state);
}

// ═══════════════════════════════════════════
// Awareness
// ═══════════════════════════════════════════
export async function getAwarenessCheck(userId: string, lang: string = 'ar') {
  return apiGet(`/api/awareness/check?user_id=${userId}&lang=${lang}`);
}
