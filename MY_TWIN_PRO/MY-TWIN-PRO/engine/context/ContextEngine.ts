import { stateBus } from '../../src/core/StateBus';
import { PerceptionResult } from '../perception/PerceptionEngine';

export interface ContextData {
  timeOfDay: string;
  dayOfWeek: string;
  isWeekend: boolean;
  isQuietTime: boolean;
  sessionDuration: number;
  messageCount: number;
  lastTopic: string;
  environmentMood: string;
  userActivityLevel: 'low' | 'medium' | 'high';
}

export class ContextEngine {
  private messageCount: number = 0;
  private sessionStartTime: number = Date.now();
  private lastTopic: string = '';

  build(perception: PerceptionResult): ContextData {
    const now = new Date();
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const hour = now.getHours();

    this.messageCount++;
    const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 60000);

    if (perception.rawMessage && perception.rawMessage.length > 0) {
      this.lastTopic = perception.rawMessage.substring(0, 50);
    }

    let environmentMood = 'neutral';
    if (hour >= 5 && hour < 9) environmentMood = 'morning_fresh';
    else if (hour >= 9 && hour < 18) environmentMood = 'daytime_active';
    else if (hour >= 18 && hour < 22) environmentMood = 'evening_warm';
    else environmentMood = 'night_quiet';

    let userActivityLevel: 'low' | 'medium' | 'high' = 'medium';
    if (perception.typingSpeed > 7 && perception.messageLength > 50) userActivityLevel = 'high';
    else if (perception.typingSpeed < 3 && perception.messageLength < 30) userActivityLevel = 'low';

    const context: ContextData = {
      timeOfDay: perception.timeOfDay,
      dayOfWeek,
      isWeekend: dayOfWeek === 'friday' || dayOfWeek === 'saturday',
      isQuietTime: hour >= 22 || hour < 6,
      sessionDuration,
      messageCount: this.messageCount,
      lastTopic: this.lastTopic,
      environmentMood,
      userActivityLevel,
    };

    stateBus.emit('context:built', context);
    return context;
  }

  resetSession(): void {
    this.messageCount = 0;
    this.sessionStartTime = Date.now();
  }
}

export const contextEngine = new ContextEngine();
