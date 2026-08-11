import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type Tier = 'free' | 'plus' | 'premium' | 'pro' | 'yearly';
export type TwinGender = 'female' | 'male';
export type TwinStyle = 'supportive' | 'coach' | 'wise' | 'fun' | 'calm';
export type ReplyStyle = 'short' | 'medium' | 'long';
export type Theme = 'dark' | 'light';
export type Lang = 'ar' | 'en';
export type VoicePersonality = 'friend' | 'mentor' | 'romantic' | 'energetic' | 'calm' | 'genz';

export interface TwinCore {
  userId: string;
  twinName: string;
  twinGender: TwinGender;
  twinStyle: TwinStyle;
  twinTraits: string[];
  replyStyle: ReplyStyle;
  tier: Tier;
  theme: Theme;
  themeManuallySet: boolean;
  lang: Lang;
  calmMode: boolean;
  voiceEnabled: boolean;
  voicePersonality: VoicePersonality;
  voiceSpeed: number;
  voicePitch: number;
  personalityDNA: Record<string, number>;

  setAuth: (userId: string) => void;
  setTier: (tier: Tier) => void;
  setLang: (lang: Lang) => void;
  toggleTheme: () => void;
  syncSystemTheme: () => void;
  toggleCalmMode: () => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setVoicePersonality: (personality: VoicePersonality) => void;
  setVoiceSpeed: (speed: number) => void;
  setVoicePitch: (pitch: number) => void;
  setTwinName: (name: string) => void;
  setTwinGender: (gender: TwinGender) => void;
  setTwinStyle: (style: TwinStyle) => void;
  setReplyStyle: (style: ReplyStyle) => void;
  setTwinTraits: (traits: string[]) => void;
  setPersonalityDNA: (dna: Record<string, number>) => void;
  reset: () => void;
}

const initialState = {
  userId: '',
  twinName: 'توأمك',
  twinGender: 'female' as TwinGender,
  twinStyle: 'supportive' as TwinStyle,
  twinTraits: [] as string[],
  replyStyle: 'medium' as ReplyStyle,
  tier: 'free' as Tier,
  theme: 'dark' as Theme,
  themeManuallySet: false,
  lang: 'ar' as Lang,
  calmMode: false,
  voiceEnabled: true,
  voicePersonality: 'friend' as VoicePersonality,
  voiceSpeed: 1.0,
  voicePitch: 1.0,
  personalityDNA: {
    empathy: 0.85,
    curiosity: 0.80,
    humor: 0.50,
    initiative: 0.60,
    reflection: 0.90,
    logic: 0.75,
    creativity: 0.80,
    calmness: 0.85,
  },
};

export const useTwinCoreStore = create<TwinCore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuth: (userId) => set({ userId }),
      setTier: (tier) => set({ tier }),
      setLang: (lang) => set({ lang }),
      toggleTheme: () =>
        set((s) => ({
          theme: s.theme === 'dark' ? 'light' : 'dark',
          themeManuallySet: true,
        })),
      syncSystemTheme: () => {
        const state = get();
        if (!state.themeManuallySet) {
          const systemTheme = Appearance.getColorScheme();
          if (systemTheme) {
            set({ theme: systemTheme, themeManuallySet: false });
          }
        }
      },
      toggleCalmMode: () => set((s) => ({ calmMode: !s.calmMode })),
      setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),
      setVoicePersonality: (personality) => set({ voicePersonality: personality }),
      setVoiceSpeed: (speed) => set({ voiceSpeed: Math.max(0.5, Math.min(2.0, speed)) }),
      setVoicePitch: (pitch) => set({ voicePitch: Math.max(0.5, Math.min(2.0, pitch)) }),
      setTwinName: (name) => set({ twinName: name }),
      setTwinGender: (gender) => set({ twinGender: gender }),
      setTwinStyle: (style) => set({ twinStyle: style }),
      setReplyStyle: (style) => set({ replyStyle: style }),
      setTwinTraits: (traits) => set({ twinTraits: traits }),
      setPersonalityDNA: (dna) => set((s) => ({ personalityDNA: { ...s.personalityDNA, ...dna } })),
      reset: () => set({ ...initialState }),
    }),
    {
      name: 'mytwin-core-v2',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
