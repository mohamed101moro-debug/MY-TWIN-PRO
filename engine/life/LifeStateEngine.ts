import { stateBus } from '../../src/core/StateBus';

export type LifeState = 'resting' | 'waiting' | 'listening' | 'thinking' | 'speaking' | 'remembering' | 'dreaming' | 'curious' | 'observing' | 'connecting';

export interface LifeStateData {
  state: LifeState;
  intensity: number;
  duration: number;
  startedAt: number;
  previousState: LifeState;
}

export class LifeStateEngine {
  private currentState: LifeStateData = {
    state: 'observing',
    intensity: 0.5,
    duration: 0,
    startedAt: Date.now(),
    previousState: 'resting',
  };

  transition(newState: LifeState, reason: string): LifeStateData {
    this.currentState.previousState = this.currentState.state;
    this.currentState.state = newState;
    this.currentState.startedAt = Date.now();
    this.currentState.duration = 0;
    this.currentState.intensity = this.getIntensityForState(newState);

    stateBus.emit('life:state_changed', {
      from: this.currentState.previousState,
      to: this.currentState.state,
      reason,
    });

    return this.currentState;
  }

  update(): LifeStateData {
    this.currentState.duration = Date.now() - this.currentState.startedAt;
    return this.currentState;
  }

  private getIntensityForState(state: LifeState): number {
    const intensityMap: Record<LifeState, number> = {
      resting: 0.2,
      waiting: 0.3,
      listening: 0.7,
      thinking: 0.8,
      speaking: 0.9,
      remembering: 0.6,
      dreaming: 0.4,
      curious: 0.7,
      observing: 0.5,
      connecting: 0.9,
    };
    return intensityMap[state] || 0.5;
  }

  getCurrentState(): LifeStateData {
    this.update();
    return { ...this.currentState };
  }
}

export const lifeStateEngine = new LifeStateEngine();
