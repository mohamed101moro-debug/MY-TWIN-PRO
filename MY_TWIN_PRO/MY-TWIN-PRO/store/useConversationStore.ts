import { create } from 'zustand';
import { useCreditsStore } from './useCreditsStore';
import { useTwinCoreStore } from './useTwinCoreStore';
import { unifiedBrainBridge } from '../src/core/UnifiedBrainBridge';

export interface ChatMessage {
  id: string;
  role: 'user' | 'twin' | 'system';
  content: string;
  timestamp: number;
  emotion?: string;
  provider?: string;
  failed?: boolean;
  image?: string;
  thinkingStage?: string;
}

interface ConversationState {
  chatHistory: ChatMessage[];
  totalMessages: number;
  isThinking: boolean;
  thinkingStage: string;
  streamingText: string;
  activeProjectContext: any | null;
  suggestedCapability: { type: string; route: string; label_ar: string; label_en: string } | null;
  menuVisible: boolean;

  addMessage: (msg: Partial<ChatMessage>) => void;
  sendMessage: (message: string) => Promise<{ success: boolean; error?: string }>;
  setThinking: (thinking: boolean) => void;
  setThinkingStage: (stage: string) => void;
  setStreamingText: (text: string) => void;
  clearHistory: () => void;
  loadProjectContext: (project: any) => void;
  clearProjectContext: () => void;
  openMenu: () => void;
  closeMenu: () => void;
}

const generateId = () => 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);

export const useConversationStore = create<ConversationState>((set, get) => ({
  chatHistory: [],
  totalMessages: 0,
  isThinking: false,
  thinkingStage: 'idle',
  streamingText: '',
  activeProjectContext: null,
  suggestedCapability: null,
  menuVisible: false,

  addMessage: (msg) =>
    set((s) => ({
      chatHistory: [...s.chatHistory, {
        id: msg.id || generateId(),
        role: msg.role || 'user',
        content: msg.content || '',
        timestamp: msg.timestamp || Date.now(),
        emotion: msg.emotion,
        provider: msg.provider,
        failed: msg.failed,
        image: msg.image,
        thinkingStage: msg.thinkingStage,
      }].slice(-200),
      totalMessages: s.totalMessages + 1,
    })),

  sendMessage: async (message: string) => {
    const state = get();
    const core = useTwinCoreStore.getState();

    if (!useCreditsStore.getState().consumeCredits(1)) {
      return { success: false, error: 'out_of_credits' };
    }

    set({ isThinking: true, thinkingStage: 'thinking' });
    state.addMessage({ role: 'user', content: message });
    const twinMsgId = generateId();
    state.addMessage({ id: twinMsgId, role: 'twin', content: '', thinkingStage: 'thinking' });

    try {
      // ✅ استخدام Unified Brain Bridge بدلاً من apiPost('/api/chat')
      const response = await unifiedBrainBridge.process(message, {
        typingSpeed: 0,
        messageLength: message.length,
        absenceDurationMinutes: 0,
        timeOfDay: 'morning',
        userState: 'normal',
      });

      set((s) => ({
        chatHistory: s.chatHistory.map((m) =>
          m.id === twinMsgId ? { ...m, content: response.reply, provider: 'unified_brain', thinkingStage: 'complete' } : m
        ),
        isThinking: false,
        thinkingStage: 'complete',
        suggestedCapability: response ? { type: response.tone, route: '', label_ar: '', label_en: '' } : null,
      }));
      return { success: true };
    } catch (error) {
      set((s) => ({
        chatHistory: s.chatHistory.map((m) =>
          m.id === twinMsgId ? { ...m, content: 'عذراً، حدث خطأ في الاتصال 💜', failed: true } : m
        ),
        isThinking: false,
        thinkingStage: 'complete',
      }));
      return { success: false, error: 'network_error' };
    }
  },

  setThinking: (thinking) => set({ isThinking: thinking }),
  setThinkingStage: (stage) => set({ thinkingStage: stage }),
  setStreamingText: (text) => set({ streamingText: text }),
  clearHistory: () => set({ chatHistory: [], totalMessages: 0 }),
  loadProjectContext: (project) => set({ activeProjectContext: project }),
  clearProjectContext: () => set({ activeProjectContext: null }),
  openMenu: () => set({ menuVisible: true }),
  closeMenu: () => set({ menuVisible: false }),
}));
