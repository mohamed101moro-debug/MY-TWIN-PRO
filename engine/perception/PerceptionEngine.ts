import { stateBus } from '../../src/core/StateBus';
import { EventBus } from '../../src/core/EventBus';

export interface PerceptionResult {
  eventType: 'message' | 'silence' | 'return' | 'greeting' | 'goodbye' | 'idle' | 'typing' | 'stop_typing';
  userState: 'hesitant' | 'excited' | 'tired' | 'focused' | 'distant' | 'normal';
  messageLength: number;
  typingSpeed: number;
  absenceDuration: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  confidence: number;
  valence: 'positive' | 'negative' | 'neutral' | 'mixed';
  rawMessage: string;
}

export class PerceptionEngine {
  private lastInteractionTimestamp: number = Date.now();
  private typingStartTime: number = 0;
  private typingCharCount: number = 0;
  private isUserPresent: boolean = false;

  registerTypingStart(): void {
    this.typingStartTime = Date.now();
    this.typingCharCount = 0;
    this.isUserPresent = true;
    EventBus.emit('USER_START_TYPING', {});
  }

  registerKeystroke(charCount: number): void {
    this.typingCharCount = charCount;
  }

  registerStopTyping(): void {
    EventBus.emit('USER_STOP_TYPING', {});
  }

  analyze(message: string): PerceptionResult {
    const now = Date.now();
    const typingDuration = (now - this.typingStartTime) / 1000;
    const typingSpeed = typingDuration > 0 ? this.typingCharCount / typingDuration : 0;
    const messageLength = message.length;
    const absenceDuration = (now - this.lastInteractionTimestamp) / 60000;
    const hour = new Date().getHours();

    let timeOfDay: PerceptionResult['timeOfDay'] = 'morning';
    if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
    else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
    else if (hour >= 22 || hour < 5) timeOfDay = 'night';

    let eventType: PerceptionResult['eventType'] = 'message';
    let userState: PerceptionResult['userState'] = 'normal';
    let confidence = 0.5;
    let valence: PerceptionResult['valence'] = 'neutral';

    if (absenceDuration > 10080) {
      eventType = 'return';
      userState = 'distant';
      confidence = 0.85;
      valence = 'mixed';
    } else if (message.length === 0 && typingDuration > 0) {
      eventType = 'typing';
      userState = 'focused';
      confidence = 0.6;
    } else if (typingSpeed < 2 && messageLength < 20) {
      userState = 'hesitant';
      confidence = 0.7;
      valence = 'negative';
    } else if (typingSpeed > 8 && messageLength > 100) {
      userState = 'excited';
      confidence = 0.8;
      valence = 'positive';
    } else if (timeOfDay === 'night' && absenceDuration > 120) {
      userState = 'tired';
      confidence = 0.75;
      valence = 'negative';
    } else if (messageLength > 50 && typingSpeed > 5) {
      userState = 'focused';
      confidence = 0.7;
      valence = 'neutral';
    }

    this.lastInteractionTimestamp = now;

    const result: PerceptionResult = {
      eventType, userState, messageLength, typingSpeed,
      absenceDuration, timeOfDay, confidence, valence,
      rawMessage: message,
    };

    stateBus.emit('perception:analyzed', result);
    EventBus.emit('PERCEPTION_ANALYZED', result);

    return result;
  }

  getLastInteractionTime(): number { return this.lastInteractionTimestamp; }
  getUserPresence(): boolean { return this.isUserPresent; }
}

export const perceptionEngine = new PerceptionEngine();
