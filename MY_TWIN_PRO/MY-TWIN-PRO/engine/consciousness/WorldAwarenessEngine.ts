import { stateBus } from '../../src/core/StateBus';

export interface WorldAwarenessState {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | 'late_night';
  isQuietTime: boolean;
  isUserPresent: boolean;
  isUserTyping: boolean;
  lastInteractionMinutes: number;
  environmentMood: string;
  ambientEnergy: number;
  updatedAt: number;
}

export class WorldAwarenessEngine {
  private state: WorldAwarenessState = {
    timeOfDay: 'morning',
    isQuietTime: false,
    isUserPresent: false,
    isUserTyping: false,
    lastInteractionMinutes: 0,
    environmentMood: 'neutral',
    ambientEnergy: 0.5,
    updatedAt: Date.now(),
  };

  private lastInteractionTimestamp: number = Date.now();

  evaluate(): WorldAwarenessState {
    const now = new Date();
    const hour = now.getHours();

    // Time of day
    if (hour >= 5 && hour < 12) this.state.timeOfDay = 'morning';
    else if (hour >= 12 && hour < 18) this.state.timeOfDay = 'afternoon';
    else if (hour >= 18 && hour < 22) this.state.timeOfDay = 'evening';
    else if (hour >= 22 || hour < 2) this.state.timeOfDay = 'night';
    else this.state.timeOfDay = 'late_night';

    this.state.isQuietTime = hour >= 22 || hour < 6;
    this.state.lastInteractionMinutes = Math.floor((now.getTime() - this.lastInteractionTimestamp) / 60000);

    // Environment mood based on time
    if (this.state.timeOfDay === 'morning') {
      this.state.environmentMood = 'fresh';
      this.state.ambientEnergy = 0.3;
    } else if (this.state.timeOfDay === 'afternoon') {
      this.state.environmentMood = 'active';
      this.state.ambientEnergy = 0.7;
    } else if (this.state.timeOfDay === 'evening') {
      this.state.environmentMood = 'warm';
      this.state.ambientEnergy = 0.5;
    } else {
      this.state.environmentMood = 'quiet';
      this.state.ambientEnergy = 0.2;
    }

    this.state.updatedAt = now.getTime();
    stateBus.emit('world:awareness_updated', this.state);
    return this.state;
  }

  recordInteraction(): void {
    this.lastInteractionTimestamp = Date.now();
  }

  setUserTyping(typing: boolean): void {
    this.state.isUserTyping = typing;
  }

  setUserPresent(present: boolean): void {
    this.state.isUserPresent = present;
  }

  getState(): WorldAwarenessState {
    return { ...this.state };
  }
}

export const worldAwarenessEngine = new WorldAwarenessEngine();
