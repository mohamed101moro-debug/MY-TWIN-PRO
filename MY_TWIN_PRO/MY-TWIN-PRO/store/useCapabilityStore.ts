import { create } from 'zustand';
import { apiPost, apiGet } from '../lib/httpClient';
import { useCreditsStore } from './useCreditsStore';

const CAPABILITY_COSTS: Record<string, number> = {
  chat: 1,
  dream: 5,
  business_canvas: 12,
  business_feasibility: 15,
  generate_image: 15,
  study_session: 8,
  code_generation: 8,
  life_coach_session: 5,
  content_creation: 6,
  smart_home: 0.5,
  memory_search: 2,
  reflection: 3,
  voice: 4,
};

export interface CapabilityState {
  activeStudySession: any;
  activeBusinessProject: any;
  activeLifePlan: any;
  recentDreams: any[];
  tasks: any[];
  recommendations: string[];
  proactiveMessage: string;
  userStats: any;

  generateBusinessIdea: (userId: string, budget: number, interests: string, location: string, lang: string) => Promise<any>;
  analyzeMarket: (userId: string, query: string, lang: string) => Promise<any>;
  generateFeasibility: (userId: string, idea: string, budget: number, lang: string) => Promise<any>;
  generateBusinessCanvas: (userId: string, idea: string, lang: string) => Promise<any>;
  generateMarketingPlan: (userId: string, idea: string, budget: number, lang: string) => Promise<any>;
  startStudySession: (userId: string, concept: string, lang: string) => Promise<any>;
  getStudyQuestion: (userId: string, topic: string, lang: string) => Promise<any>;
  answerStudyQuestion: (userId: string, questionId: string, answer: string, lang: string) => Promise<any>;
  endStudySession: (userId: string) => Promise<void>;
  startCoachingSession: (userId: string, topic: string, lang: string) => Promise<any>;
  getLifeAdvice: (userId: string, topic: string, lang: string) => Promise<any>;
  getNutritionPlan: (userId: string, goal: string, lang: string) => Promise<any>;
  getFitnessPlan: (userId: string, goal: string, lang: string) => Promise<any>;
  createLifePlan: (userId: string, details: string, lang: string) => Promise<any>;
  getDeviceStatus: (userId: string) => Promise<any>;
  sendDeviceCommand: (userId: string, device: string, command: string) => Promise<any>;
  smartHomeCommand: (userId: string, command: string) => Promise<any>;
  generateImage: (userId: string, prompt: string, style: string) => Promise<string>;
  generateContent: (userId: string, type: string, topic: string, lang: string) => Promise<any>;
  createTask: (userId: string, title: string, dueDate?: string, priority?: string) => Promise<any>;
  listTasks: (userId: string) => Promise<void>;
  completeTask: (userId: string, taskId: string) => Promise<any>;
  generateCode: (userId: string, prompt: string, language: string) => Promise<any>;
  debugCode: (userId: string, code: string, language: string) => Promise<any>;
  interpretDream: (userId: string, dreamText: string, lang: string) => Promise<any>;
  getUserStats: (userId: string) => Promise<void>;
  getRecommendations: (userId: string) => Promise<void>;
}

const consumeIfNeeded = (capability: string): boolean => {
  const cost = CAPABILITY_COSTS[capability] || 1;
  return useCreditsStore.getState().consumeCredits(cost);
};

export const useCapabilityStore = create<CapabilityState>((set, get) => ({
  activeStudySession: null,
  activeBusinessProject: null,
  activeLifePlan: null,
  recentDreams: [] as any[],
  tasks: [] as any[],
  recommendations: [] as string[],
  proactiveMessage: '',
  userStats: null,

  generateBusinessIdea: async (userId, budget, interests, location, lang) => {
    if (!consumeIfNeeded('business_canvas')) return { error: 'no_credits' };
    return await apiPost('/api/business/generate-idea', { user_id: userId, budget, interests, location, lang });
  },
  analyzeMarket: async (userId, query, lang) => {
    if (!consumeIfNeeded('business_canvas')) return { error: 'no_credits' };
    return await apiPost('/api/business/market-research', { user_id: userId, query, lang });
  },
  generateFeasibility: async (userId, idea, budget, lang) => {
    if (!consumeIfNeeded('business_feasibility')) return { error: 'no_credits' };
    return await apiPost('/api/business/feasibility', { user_id: userId, idea, budget, lang });
  },
  generateBusinessCanvas: async (userId, idea, lang) => {
    if (!consumeIfNeeded('business_canvas')) return { error: 'no_credits' };
    return await apiPost('/api/business/canvas', { user_id: userId, idea, lang });
  },
  generateMarketingPlan: async (userId, idea, budget, lang) => {
    if (!consumeIfNeeded('business_canvas')) return { error: 'no_credits' };
    return await apiPost('/api/business/marketing-plan', { user_id: userId, idea, budget, lang });
  },

  startStudySession: async (userId, concept, lang) => {
    if (!consumeIfNeeded('study_session')) return { error: 'no_credits' };
    const result = await apiPost('/api/study/start', { user_id: userId, concept, language: lang });
    set({ activeStudySession: { concept, explanation: result.explanation, depth: 0, accuracy: 0 } });
    return result;
  },
  getStudyQuestion: async (userId, topic, lang) => {
    return await apiPost('/api/study/question', { user_id: userId, topic, lang });
  },
  answerStudyQuestion: async (userId, questionId, answer, lang) => {
    return await apiPost('/api/study/answer', { user_id: userId, question_id: questionId, answer, lang });
  },
  endStudySession: async (userId) => {
    await apiPost('/api/study/end', { user_id: userId });
    set({ activeStudySession: null });
  },

  startCoachingSession: async (userId, topic, lang) => {
    if (!consumeIfNeeded('life_coach_session')) return { error: 'no_credits' };
    return await apiPost('/api/life-coach/start', { user_id: userId, topic, lang });
  },
  getLifeAdvice: async (userId, topic, lang) => {
    return await apiPost('/api/life-coach/advice', { user_id: userId, topic, lang });
  },
  getNutritionPlan: async (userId, goal, lang) => {
    return await apiPost('/api/life-coach/nutrition', { user_id: userId, goal, lang });
  },
  getFitnessPlan: async (userId, goal, lang) => {
    return await apiPost('/api/life-coach/fitness', { user_id: userId, goal, lang });
  },
  createLifePlan: async (userId, details, lang) => {
    const result = await apiPost('/api/life-coach/plan', { user_id: userId, details, lang });
    set({ activeLifePlan: result });
    return result;
  },

  getDeviceStatus: async (userId) => {
    return await apiGet(`/api/smart-home/status?user_id=${userId}`);
  },
  sendDeviceCommand: async (userId, device, command) => {
    return await apiPost('/api/smart-home/command', { user_id: userId, device, command });
  },
  smartHomeCommand: async (userId, command) => {
    return await apiPost('/api/smart-home/command', { user_id: userId, command });
  },

  generateImage: async (userId, prompt, style) => {
    if (!consumeIfNeeded('generate_image')) return '';
    const res = await apiPost('/api/image-lab/generate', { user_id: userId, prompt, style });
    return res.image_url || '';
  },
  generateContent: async (userId, type, topic, lang) => {
    if (!consumeIfNeeded('content_creation')) return { error: 'no_credits' };
    return await apiPost('/api/content/generate', { user_id: userId, type, topic, lang });
  },

  createTask: async (userId, title, dueDate, priority) => {
    const res = await apiPost('/api/tasks/create', { user_id: userId, title, due_date: dueDate, priority });
    set((s) => ({ tasks: [...s.tasks, res.task || res] }));
    return res;
  },
  listTasks: async (userId) => {
    try { const res = await apiGet(`/api/tasks?user_id=${userId}`); set({ tasks: res.tasks || res || [] }); } catch (e) {}
  },
  completeTask: async (userId, taskId) => {
    const res = await apiPost('/api/tasks/complete', { user_id: userId, task_id: taskId });
    set((s) => ({ tasks: s.tasks.map((t: any) => t.id === taskId ? { ...t, status: 'completed' } : t) }));
    return res;
  },

  generateCode: async (userId, prompt, language) => {
    if (!consumeIfNeeded('code_generation')) return { error: 'no_credits' };
    return await apiPost('/api/code-lab/generate', { user_id: userId, prompt, language });
  },
  debugCode: async (userId, code, language) => {
    if (!consumeIfNeeded('code_generation')) return { error: 'no_credits' };
    return await apiPost('/api/code-lab/debug', { user_id: userId, code, language });
  },

  interpretDream: async (userId, dreamText, lang) => {
    if (!consumeIfNeeded('dream')) return { error: 'no_credits' };
    return await apiPost('/api/dreams/interpret', { user_id: userId, dream_text: dreamText, lang });
  },

  getUserStats: async (userId) => {
    try { const res = await apiGet(`/api/stats/dashboard?user_id=${userId}`); set({ userStats: res }); } catch (e) {}
  },
  getRecommendations: async (userId) => {
    try { const res = await apiGet(`/api/recommendations/daily?user_id=${userId}`); set({ recommendations: res.recommendations?.map((r: any) => r.message) || [] }); } catch (e) {}
  },
}));
