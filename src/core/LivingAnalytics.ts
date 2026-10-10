import { EventBus } from './EventBus';

type AnalyticsEvent = 
  | 'awakening_completed' | 'memory_surfaced' | 'relationship_increased'
  | 'capability_used' | 'digital_soul_shift' | 'conversation_length'
  | 'silence_duration' | 'trust_built' | 'voice_usage' | 'dream_created';

export class LivingAnalytics {
  private events: { type: AnalyticsEvent; data: any; timestamp: number }[] = [];

  constructor() {
    this.bindEvents();
  }

  private log(type: AnalyticsEvent, data: any) {
    this.events.push({ type, data: this.sanitize(data), timestamp: Date.now() });
    // في الإصدار النهائي، يتم إرسال هذه البيانات إلى خدمة التحليلات
    if (this.events.length > 100) this.events = this.events.slice(-50);
  }

  private sanitize(data: any): any {
    // إزالة أي بيانات شخصية أو محادثات
    const { message, content, text, ...rest } = data || {};
    return rest;
  }

  private bindEvents() {
    EventBus.on('SESSION_STARTED', (data) => this.log('awakening_completed', data));
    EventBus.on('MEMORY_SURFACED', (data) => this.log('memory_surfaced', data));
    EventBus.on('TRUST_EVENT', (data) => this.log('trust_built', data));
    EventBus.on('CAPABILITY_ACTIVATED', (data) => this.log('capability_used', data));
    EventBus.on('SOUL_UPDATED', (data) => this.log('digital_soul_shift', data));
    EventBus.on('SILENCE_START', (data) => this.log('silence_duration', data));
  }
}
