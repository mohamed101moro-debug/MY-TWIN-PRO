/**
 * EVENT BUS — Central Event Bus for MyTwin
 * =========================================
 * Added missing event types for full backward compatibility.
 */
type Listener = (payload?: any) => void;

export type EventName =
  | 'USER_OPEN_APP'
  | 'USER_SEND_MESSAGE'
  | 'AI_START_THINKING'
  | 'AI_FINISH_THINKING'
  | 'MEMORY_SURFACED'
  | 'MEMORY_CREATED'
  | 'TRUST_EVENT'
  | 'RELATIONSHIP_MILESTONE'
  | 'WORKSPACE_TRANSFORM_START'
  | 'WORKSPACE_TRANSFORM_COMPLETE'
  | 'APP_BACKGROUND'
  | 'CAPABILITY_ACTIVATED'
  | 'CAPABILITY_DEACTIVATED'
  | 'STUDY_TOPIC_ADDED'
  | 'TWIN_SPEAK'
  | 'DAILY_STATE_CHANGED'
  | 'LIVING_STATE_APPLIED'
  | 'SIGNATURE_MOMENT'
  | 'SOUL_POINTS_EARNED'
  | 'SOUL_POINTS_SPENT'
  | 'EXPLORER_PASS_ACTIVATED'
  | 'EXPLORER_PASS_EXPIRED'
  | 'AD_REWARD_EARNED'
  | 'PRESENCE_CHANGED'
  | 'EMOTIONAL_STATE_CHANGED'
  | 'EMOTION_CHANGED'
  | 'BOND_CHANGED'
  | 'OPEN_SOUL_OBSERVATORY'
  | string;

// واجهة اختيارية لتوثيق أنواع payload لكل حدث
export interface EventPayloads {
  'USER_OPEN_APP': void;
  'USER_SEND_MESSAGE': { message: string; timestamp: number };
  'AI_START_THINKING': void;
  'AI_FINISH_THINKING': void;
  'MEMORY_SURFACED': { memoryId: string };
  'MEMORY_CREATED': { memoryId: string };
  'TRUST_EVENT': { type: string; points: number };
  'RELATIONSHIP_MILESTONE': { phase: string };
  'WORKSPACE_TRANSFORM_START': { from: string; to: string };
  'WORKSPACE_TRANSFORM_COMPLETE': { to: string };
  'APP_BACKGROUND': void;
  'CAPABILITY_ACTIVATED': { capability: string };
  'CAPABILITY_DEACTIVATED': { capability: string };
  'STUDY_TOPIC_ADDED': { topic: any };
  'TWIN_SPEAK': { phrase: string; tone: string };
  'DAILY_STATE_CHANGED': void;
  'LIVING_STATE_APPLIED': void;
  'SIGNATURE_MOMENT': { type: string; color: string };
  'SOUL_POINTS_EARNED': { source: string; amount: number };
  'SOUL_POINTS_SPENT': { amount: number; description: string };
  'EXPLORER_PASS_ACTIVATED': void;
  'EXPLORER_PASS_EXPIRED': void;
  'AD_REWARD_EARNED': { userId: string; points: number };
  'PRESENCE_CHANGED': { from: number; to: number };
  'EMOTIONAL_STATE_CHANGED': { emotion: string; intensity: number };
  'EMOTION_CHANGED': { from: string; to: string };
  'BOND_CHANGED': { phase: string; bondLevel: number };
  'OPEN_SOUL_OBSERVATORY': void;
  [key: string]: any;
}

class EventBusClass {
  private listeners: Map<string, Listener[]> = new Map();

  on(event: EventName, callback: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
    return () => {
      const arr = this.listeners.get(event);
      if (arr) { const idx = arr.indexOf(callback); if (idx > -1) arr.splice(idx, 1); }
    };
  }

  // إضافة دالة once المفقودة
  once(event: EventName, callback: Listener): () => void {
    const onceWrapper = (payload?: any) => {
      callback(payload);
      off();
    };
    const off = this.on(event, onceWrapper);
    return off;
  }

  emit(event: EventName, payload?: any): void {
    const arr = this.listeners.get(event);
    if (arr) arr.forEach(cb => { try { cb(payload); } catch (e) { console.warn(`[EventBus] Error: ${event}`, e); } });
  }

  clear(): void { this.listeners.clear(); }
}

export const EventBus = new EventBusClass();
