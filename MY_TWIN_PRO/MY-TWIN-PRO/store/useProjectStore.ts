import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost, apiGet, apiDelete } from '../lib/httpClient';

export type ProjectType = 'chat' | 'study' | 'code_lab' | 'business' | 'life_coach' | 'dream' | 'content' | 'image_lab' | 'smart_home' | 'task' | 'tool' | 'image';
export type ProjectState = 'planning' | 'working' | 'completed' | 'archived' | 'cancelled';

export interface ProjectItem {
  id: string;
  type: ProjectType;
  title: string;
  preview: string;
  created_at: string;
  updated_at: string;
  data: Record<string, any>;
  tags: string[];
  pinned: boolean;
  state: ProjectState;
  progress: number;
  aiContext: Record<string, any>;
}

interface ProjectStore {
  projects: ProjectItem[];
  loading: boolean;
  error: string | null;
  fetchProjects: (userId: string) => Promise<void>;
  addProject: (project: Omit<ProjectItem, 'id' | 'created_at' | 'updated_at' | 'state' | 'progress' | 'aiContext'> & { user_id?: string }) => Promise<ProjectItem | null>;
  updateProject: (id: string, updates: Partial<ProjectItem>) => Promise<void>;
  deleteProject: (id: string, userId?: string) => Promise<boolean>;
  getProjectsByType: (type: ProjectType) => ProjectItem[];
  getProjectsByState: (state: ProjectState) => ProjectItem[];
  searchProjects: (query: string) => ProjectItem[];
  updateProjectState: (id: string, state: ProjectState) => void;
  updateProjectProgress: (id: string, progress: number) => void;
  updateProjectAiContext: (id: string, context: Record<string, any>) => void;
  clearProjects: () => void;
}

const generateId = () => 'proj_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      loading: false,
      error: null,

      fetchProjects: async (userId: string) => {
        set({ loading: true, error: null });
        try {
          const res = await apiGet(`/api/projects?user_id=${userId}`);
          if (res?.projects) {
            const projects = res.projects.map((p: any) => ({ ...p, state: p.state || 'working', progress: p.progress || 0, aiContext: p.aiContext || {} }));
            set({ projects, loading: false });
          } else { set({ loading: false }); }
        } catch (e) { set({ error: 'Failed to fetch projects', loading: false }); }
      },

      addProject: async (project) => {
        const id = generateId();
        const now = new Date().toISOString();
        const newProject: ProjectItem = { ...project, id, created_at: now, updated_at: now, state: 'working', progress: 0, aiContext: {} };
        set((s) => ({ projects: [newProject, ...s.projects] }));
        try { await apiPost('/api/projects', { user_id: project.user_id, type: project.type, title: project.title, preview: project.preview, data: project.data, tags: project.tags, pinned: project.pinned }); } catch (e) {}
        return newProject;
      },

      updateProject: async (id, updates) => {
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p)) }));
      },

      deleteProject: async (id, userId) => {
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
        try { await apiDelete(`/api/projects/${id}?user_id=${userId || ''}`); return true; } catch (e) { return true; }
      },

      getProjectsByType: (type) => get().projects.filter((p) => p.type === type),
      getProjectsByState: (state) => get().projects.filter((p) => p.state === state),

      searchProjects: (query) => {
        const q = query.toLowerCase();
        return get().projects.filter((p) => p.title.toLowerCase().includes(q) || p.preview.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)));
      },

      updateProjectState: (id, state) => { set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, state, updated_at: new Date().toISOString() } : p)) })); },
      updateProjectProgress: (id, progress) => { set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, progress: Math.min(100, Math.max(0, progress)), updated_at: new Date().toISOString() } : p)) })); },
      updateProjectAiContext: (id, context) => { set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, aiContext: { ...p.aiContext, ...context }, updated_at: new Date().toISOString() } : p)) })); },
      clearProjects: () => set({ projects: [] }),
    }),
    {
      name: 'mytwin-projects-v2',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ projects: state.projects.slice(0, 100) }),
    }
  )
);
