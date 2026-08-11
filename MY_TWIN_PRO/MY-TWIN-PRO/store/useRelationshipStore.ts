import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet } from '../lib/httpClient';

interface RelationshipState {
  bondLevel: number;
  twinEnergy: number;
  relationshipDims: Record<string, number>;
  journeyPhase: string;
  attachmentStyle: string;

  setBondLevel: (level: number) => void;
  setTwinEnergy: (val: number) => void;
  updateBond: (val: number) => void;
  getEnergyPercent: () => number;
  getRelationshipInsights: (userId: string) => Promise<void>;
  getRelationshipHealth: (userId: string) => Promise<void>;
  getMemories: (userId: string, limit?: number) => Promise<void>;
  getWeeklyReport: (userId: string) => Promise<void>;
  updateFromUnifiedResponse: (data: any) => void;
  reset: () => void;
}

const initialState = {
  bondLevel: 0,
  twinEnergy: 100,
  relationshipDims: {},
  journeyPhase: 'introduction',
  attachmentStyle: 'unknown',
};

export const useRelationshipStore = create<RelationshipState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setBondLevel: (level) => set({ bondLevel: Math.min(100, Math.max(0, Math.round(level))) }),
      setTwinEnergy: (val) => set({ twinEnergy: Math.max(0, Math.min(100, Math.round(val))) }),
      updateBond: (val) => set({ bondLevel: Math.min(100, Math.round(val)) }),
      getEnergyPercent: () => get().twinEnergy,

      getRelationshipInsights: async (userId) => {
        try { await apiGet(`/api/relationship/insights?user_id=${userId}`); } catch (e) {}
      },
      getRelationshipHealth: async (userId) => {
        try { await apiGet(`/api/relationship/health?user_id=${userId}`); } catch (e) {}
      },
      getMemories: async (userId, limit = 20) => {
        try { await apiGet(`/api/memories?user_id=${userId}&limit=${limit}`); } catch (e) {}
      },
      getWeeklyReport: async (userId) => {
        try { await apiGet(`/api/reports/weekly?user_id=${userId}`); } catch (e) {}
      },

      // ✅ استقبال تحديثات العلاقة من الـ Backend
      updateFromUnifiedResponse: (data: any) => {
        if (!data) return;
        set((state) => ({
          bondLevel: data.bond_level ?? data.bondLevel ?? state.bondLevel,
          journeyPhase: data.stage ?? data.journeyPhase ?? state.journeyPhase,
        }));
      },

      reset: () => set({ ...initialState }),
    }),
    {
      name: 'mytwin-relationship-v2',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        bondLevel: state.bondLevel,
        journeyPhase: state.journeyPhase,
        attachmentStyle: state.attachmentStyle,
      }),
    }
  )
);
