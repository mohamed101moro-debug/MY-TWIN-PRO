/**
 * Portable Memory Engine v3.0 — تصدير الذاكرة والمحادثات
 * ==========================================================
 * للاستخدام الداخلي للشركة فقط (تدريب Llama AI).
 * يستدعي API الخلفية المحمي بمفتاح.
 */

export interface TrainingDataExport {
  exportId: string;
  exportedAt: string;
  totalConversations: number;
  totalMemories: number;
  conversations: Array<{
    userId: string;
    messages: Array<{ role: string; content: string; emotion: string; timestamp: string }>;
  }>;
  memories: Array<{
    content: string;
    emotion: string;
    importance: number;
    createdAt: string;
  }>;
  identityData: Array<{
    role: string;
    phase: string;
    coreValues: string[];
    personalityTraits: string[];
  }>;
}

const INTERNAL_API_KEY = 'SOUL_SYNC_INTERNAL_KEY'; // يجب تخزينها في متغيرات البيئة

export class PortableMemoryEngine {
  /**
   * تصدير بيانات التدريب (للاستخدام الداخلي فقط)
   */
  async exportForTraining(): Promise<TrainingDataExport> {
    try {
      const response = await fetch(`/api/v1/admin/export/training?api_key=${INTERNAL_API_KEY}`);
      const data = await response.json();
      
      return {
        exportId: data.export_id,
        exportedAt: new Date().toISOString(),
        totalConversations: 0, // تحسب من الخلفية
        totalMemories: data.total_records,
        conversations: [],
        memories: data.data.map((m: any) => ({
          content: m.instruction || '',
          emotion: m.emotion || 'neutral',
          importance: m.importance || 50,
          createdAt: ''
        })),
        identityData: [],
      };
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  /**
   * تصدير بتنسيق Llama (للتدريب المباشر)
   */
  async exportForLlama(): Promise<string> {
    const response = await fetch(`/api/v1/admin/export/training?api_key=${INTERNAL_API_KEY}`);
    const data = await response.json();
    return JSON.stringify(data.data, null, 2);
  }

  /**
   * تقدير حجم بيانات التدريب
   */
  async getTrainingDataStats(): Promise<{
    totalConversations: number;
    totalMemories: number;
    estimatedTokens: number;
    estimatedFileSizeMB: number;
  }> {
    try {
      const response = await fetch(`/api/v1/admin/export/training?api_key=${INTERNAL_API_KEY}`);
      const data = await response.json();
      const count = data.total_records || 0;
      const estimatedTokens = count * 50;
      const estimatedFileSizeMB = (estimatedTokens * 4) / (1024 * 1024);
      
      return {
        totalConversations: 0,
        totalMemories: count,
        estimatedTokens,
        estimatedFileSizeMB: Math.round(estimatedFileSizeMB * 100) / 100,
      };
    } catch {
      return { totalConversations: 0, totalMemories: 0, estimatedTokens: 0, estimatedFileSizeMB: 0 };
    }
  }
}

export const portableMemoryEngine = new PortableMemoryEngine();
