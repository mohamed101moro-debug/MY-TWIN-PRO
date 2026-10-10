/**
 * TWIN STATE v2.0 – مصدر الحقيقة الوحيد (منظم)
 * ================================================
 * مقسم داخلياً إلى مجموعات مع API موحد.
 */
import { create } from 'zustand';

export type ConsciousnessMode = 'sleeping' | 'listening' | 'thinking' | 'analyzing' | 'learning' | 'speaking' | 'dreaming' | 'emotional' | 'deep_thinking' | 'searching_memory';
export type Emotion = 'joy' | 'sadness' | 'calm' | 'love' | 'anger' | 'fear' | 'neutral' | 'curious' | 'focused' | 'inspired' | 'concerned' | 'happy';
export type PresenceLevel = 'dormant' | 'aware' | 'focused' | 'deep' | 'flow';
export type AwarenessLevel = 'Dormant' | 'Aware' | 'Focused' | 'DeepThinking' | 'Flow' | 'Conscious';
export type ThinkingStage = 'idle' | 'observing' | 'reflecting' | 'doubting' | 'connecting' | 'planning' | 'deciding' | 'concluding';

export interface TwinState {
  // ── الوعي والعاطفة ──
  consciousnessMode: ConsciousnessMode;
  emotion: Emotion;
  thinkingStage: ThinkingStage;

  // ── الحضور والانتباه ──
  presenceLevel: PresenceLevel;
  awarenessLevel: AwarenessLevel;
  attention: number;
  confidence: number;

  // ── العلاقة والطاقة ──
  bondLevel: number;
  energy: number;

  // ── الحالة اللحظية ──
  isThinking: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isSearchingMemory: boolean;

  // ── Setters ──
  setMode: (mode: ConsciousnessMode) => void;
  setEmotion: (emotion: Emotion) => void;
  setThinkingStage: (stage: ThinkingStage) => void;
  setPresence: (level: PresenceLevel) => void;
  setAwarenessLevel: (level: AwarenessLevel) => void;
  setAttention: (value: number) => void;
  setConfidence: (value: number) => void;
  setBondLevel: (value: number) => void;
  setEnergy: (value: number) => void;
  setIsThinking: (value: boolean) => void;
  setIsSpeaking: (value: boolean) => void;
  setIsListening: (value: boolean) => void;
  setIsProcessing: (value: boolean) => void;
  setIsSearchingMemory: (value: boolean) => void;

  // ── دوال مركبة ──
  startThinking: () => void;
  startSpeaking: () => void;
  stopSpeaking: () => void;
}

const initialState = {
  consciousnessMode: 'listening' as ConsciousnessMode,
  emotion: 'neutral' as Emotion,
  thinkingStage: 'idle' as ThinkingStage,
  presenceLevel: 'aware' as PresenceLevel,
  awarenessLevel: 'Aware' as AwarenessLevel,
  attention: 80, confidence: 70,
  bondLevel: 50, energy: 80,
  isThinking: false, isSpeaking: false, isListening: true, isProcessing: false,
  isSearchingMemory: false,
};

export const useTwinState = create<TwinState>((set) => ({
  ...initialState,
  setMode: (mode) => set({ consciousnessMode: mode }),
  setEmotion: (emotion) => set({ emotion }),
  setThinkingStage: (stage) => set({ thinkingStage: stage }),
  setPresence: (level) => set({ presenceLevel: level }),
  setAwarenessLevel: (level) => set({ awarenessLevel: level }),
  setAttention: (v) => set({ attention: Math.min(100, Math.max(0, v)) }),
  setConfidence: (v) => set({ confidence: Math.min(100, Math.max(0, v)) }),
  setBondLevel: (v) => set({ bondLevel: Math.min(100, Math.max(0, v)) }),
  setEnergy: (v) => set({ energy: Math.min(100, Math.max(0, v)) }),
  setIsThinking: (v) => set({ isThinking: v }),
  setIsSpeaking: (v) => set({ isSpeaking: v }),
  setIsListening: (v) => set({ isListening: v }),
  setIsProcessing: (v) => set({ isProcessing: v }),
  setIsSearchingMemory: (v) => set({ isSearchingMemory: v }),
  startThinking: () => set({ consciousnessMode: 'thinking', isThinking: true, isListening: false }),
  startSpeaking: () => set({ consciousnessMode: 'speaking', isSpeaking: true, isThinking: false }),
  stopSpeaking: () => set({ consciousnessMode: 'listening', isSpeaking: false, isListening: true }),
}));
