/** Client-side credit display mirror. The backend remains the authority for entitlements. */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tier } from './useTwinCoreStore';

interface CreditsState {
  dailyCreditsUsed: number;
  dailyAdsWatched: number;
  dailyCreditsLimit: number;
  lastResetDate: string;
  tier: Tier;
  consumeCredits: (amount: number) => boolean;
  addCredits: (amount: number) => void;
  getRemainingCredits: () => number;
  resetDaily: () => void;
  resetForSession: () => void;
  setTier: (tier: Tier) => void;
  syncFromServer: (remaining: number) => void;
}

const today = () => new Date().toISOString().split('T')[0];
const LIMITS: Record<Tier, number> = { free: 50, plus: 200, premium: 500, pro: 2000, yearly: 5000 };
const defaultCreditState = {
  dailyCreditsUsed: 0,
  dailyAdsWatched: 0,
  dailyCreditsLimit: LIMITS.free,
  lastResetDate: today(),
  tier: 'free' as Tier,
};

export const useCreditsStore = create<CreditsState>()(
  persist(
    (set, get) => ({
      ...defaultCreditState,
      consumeCredits: (amount) => {
        const state = get();
        if (state.lastResetDate !== today()) state.resetDaily();
        const refreshed = get();
        if (refreshed.dailyCreditsUsed + amount > refreshed.dailyCreditsLimit) return false;
        set({ dailyCreditsUsed: refreshed.dailyCreditsUsed + amount });
        return true;
      },
      addCredits: (_amount) => {
        console.warn('[Credits] addCredits deprecated — server authoritative');
      },
      getRemainingCredits: () => {
        if (get().lastResetDate !== today()) get().resetDaily();
        const state = get();
        return Math.max(0, state.dailyCreditsLimit - state.dailyCreditsUsed);
      },
      resetDaily: () => set({
        dailyCreditsUsed: 0,
        dailyAdsWatched: 0,
        dailyCreditsLimit: LIMITS[get().tier] || LIMITS.free,
        lastResetDate: today(),
      }),
      resetForSession: () => set({ ...defaultCreditState, lastResetDate: today() }),
      setTier: (tier) => set({ tier, dailyCreditsLimit: LIMITS[tier] || LIMITS.free }),
      syncFromServer: (remaining) => set({ dailyCreditsLimit: remaining + get().dailyCreditsUsed }),
    }),
    { name: 'mytwin-credits-v2', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
