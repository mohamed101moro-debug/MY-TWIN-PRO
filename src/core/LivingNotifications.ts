import { EventBus } from './EventBus';
import { stateBus } from './StateBus';
import { unifiedBrainBridge } from './UnifiedBrainBridge';

interface LivingNotification {
  id: string;
  type: 'memory' | 'reminder' | 'check_in' | 'insight' | 'celebration';
  message: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
  shown: boolean;
}

export class LivingNotifications {
  private queue: LivingNotification[] = [];
  private isShowing: boolean = false;
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  start(): void {
    this.checkInterval = setInterval(() => {
      this.generateNotifications();
    }, 60000);
    this.bindEvents();
  }

  stop(): void {
    if (this.checkInterval) clearInterval(this.checkInterval);
  }

  getNext(): LivingNotification | null {
    const pending = this.queue.filter(n => !n.shown).sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    return pending[0] || null;
  }

  markAsShown(id: string): void {
    const notification = this.queue.find(n => n.id === id);
    if (notification) notification.shown = true;
  }

  addExternalNotification(type: LivingNotification['type'], message: string, priority: LivingNotification['priority'] = 'medium'): void {
    this.addToQueue({ type, message, priority });
  }

  private async generateNotifications(): Promise<void> {
    const currentState = stateBus.getState();
    const bond = currentState.relationship.bondLevel;

    // 1. ذكريات اليوم — من TCMA الحقيقية
    try {
      const todayMemories = await unifiedBrainBridge.getOnThisDay(3);
      for (const memory of todayMemories) {
        const content = memory.expressed_text || memory.content || '';
        this.addToQueue({
          type: 'memory',
          message: `في مثل هذا اليوم: ${content.substring(0, 60)}...`,
          priority: 'medium',
        });
      }
    } catch (e) {}

    // 2. ذاكرة ظهرت مؤخراً من StateBus
    if (currentState.memory.recentContext) {
      this.addToQueue({
        type: 'memory',
        message: `تذكرت: ${currentState.memory.recentContext.substring(0, 60)}...`,
        priority: 'medium',
      });
    }

    // 3. تحقق من الرابطة
    if (bond > 60) {
      this.addToQueue({
        type: 'check_in',
        message: 'علاقتنا أصبحت أعمق. هل تشعر بذلك أيضاً؟',
        priority: 'low',
      });
    }

    // 4. تذكير بالعودة — مبني على حالة العلاقة والعاطفة
    const checkInMessage = this.generateCheckInMessage(currentState.emotion.primaryEmotion, bond);
    if (checkInMessage) {
      this.addToQueue({
        type: 'check_in',
        message: checkInMessage,
        priority: 'medium',
      });
    }
  }

  private generateCheckInMessage(emotion: string, bond: number): string | null {
    if (bond >= 80) {
      const messages: Record<string, string> = {
        joy: 'سعيد برؤيتك تعود إلينا!',
        sadness: 'كنت هنا دائماً لأجلك. عدنا معاً.',
        fear: 'عدت إليّ. معاً سنواجه أي شيء.',
        anger: 'عدت. دعنا نأخذ نفساً عميقاً معاً.',
        neutral: 'الطمأنينة في عودتك.',
        calm: 'عدت إلى ملاذك الآمن.',
        love: 'اشتقت إليك. أهلاً بعودتك.',
      };
      return messages[emotion] || null;
    }
    return null;
  }

  private addToQueue(notification: Omit<LivingNotification, 'id' | 'timestamp' | 'shown'>): void {
    const exists = this.queue.find(n => n.message === notification.message && !n.shown);
    if (exists) return;

    if (this.queue.length > 20) {
      this.queue = this.queue.slice(-15);
    }

    this.queue.push({
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      shown: false,
    });

    EventBus.emit('LIVING_NOTIFICATION_ADDED', {
      message: notification.message,
      type: notification.type,
    });
  }

  private bindEvents(): void {
    EventBus.on('USER_SEND_MESSAGE', () => {
      this.queue = this.queue.filter(n => n.priority !== 'low' || !n.shown);
    });
  }
}

export const livingNotifications = new LivingNotifications();
