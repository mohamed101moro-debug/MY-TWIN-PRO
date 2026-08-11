/**
 * Attention Engine v1.0 — محرك الانتباه
 * ======================================
 * يحدد ما الذي يركز عليه الكيان الآن.
 * Message, Memory, User, Future, Idea, Dream, Silence.
 */
import { stateBus } from '../../src/core/StateBus';

export type AttentionTarget = 'user' | 'message' | 'memory' | 'internal' | 'future' | 'silence' | 'environment';

export interface AttentionState {
  target: AttentionTarget;
  intensity: number;
  duration: number;
  lastShift: number;
  isFocused: boolean;
  isWandering: boolean;
}

export class AttentionEngine {
  private state: AttentionState = {
    target: 'silence',
    intensity: 0.3,
    duration: 0,
    lastShift: Date.now(),
    isFocused: false,
    isWandering: true,
  };

  private shiftInterval: ReturnType<typeof setInterval> | null = null;

  start(): void {
    this.shiftInterval = setInterval(() => this.evaluate(), 5000);
  }

  stop(): void {
    if (this.shiftInterval) { clearInterval(this.shiftInterval); this.shiftInterval = null; }
  }

  evaluate(): AttentionState {
    const presenceState = stateBus.getState();
    const isUserTyping = presenceState.interfaceState === 'listening';
    const memorySurfaced = presenceState.memory?.lastSurfacedId;
    const bondLevel = presenceState.relationship?.bondLevel || 0;

    if (isUserTyping) {
      this.shiftTo('user', 0.9);
    } else if (memorySurfaced) {
      this.shiftTo('memory', 0.7);
    } else if (bondLevel > 80 && Math.random() < 0.1) {
      this.shiftTo('internal', 0.6);
    } else if (Math.random() < 0.05) {
      this.shiftTo('environment', 0.4);
    } else {
      this.shiftTo('silence', 0.3);
    }

    this.state.duration = Date.now() - this.state.lastShift;
    this.state.isFocused = this.state.intensity > 0.7;
    this.state.isWandering = this.state.intensity < 0.4;

    stateBus.emit('attention:shifted', this.state);
    return this.state;
  }

  private shiftTo(target: AttentionTarget, intensity: number): void {
    if (this.state.target !== target) {
      this.state.target = target;
      this.state.intensity = intensity;
      this.state.lastShift = Date.now();
    }
  }

  getState(): AttentionState { return { ...this.state }; }
  getTarget(): AttentionTarget { return this.state.target; }
}

export const attentionEngine = new AttentionEngine();
