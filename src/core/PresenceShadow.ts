import { stateBus } from './StateBus';

export interface ShadowState {
  intensity: number;
  radius: number;
  color: string;
  offsetX: number;
  offsetY: number;
  pulsePhase: number;
}

export class PresenceShadow {
  private state: ShadowState = {
    intensity: 0.15,
    radius: 120,
    color: '#A855F7',
    offsetX: 0,
    offsetY: 0,
    pulsePhase: 0,
  };

  private animationId: ReturnType<typeof setInterval> | null = null;

  start(): void {
    this.animationId = setInterval(() => {
      this.update();
      stateBus.emit('shadow:updated', this.state);
    }, 50);
  }

  stop(): void {
    if (this.animationId) { clearInterval(this.animationId); this.animationId = null; }
  }

  private update(): void {
    const presenceState = (stateBus as any).getState?.() || {};
    const emotion = presenceState.emotion?.primaryEmotion || 'neutral';
    const energy = presenceState.emotion?.intensity || 0.5;
    const focus = presenceState.focusLevel || 0.5;

    const emotionColors: Record<string, string> = {
      joy: '#F59E0B', sadness: '#3B82F6', calm: '#10B981', love: '#EC4899',
      anger: '#EF4444', fear: '#A78BFA', neutral: '#A855F7',
    };
    this.state.color = emotionColors[emotion] || '#A855F7';
    this.state.intensity = 0.1 + energy * 0.2;
    this.state.radius = 100 + energy * 60;
    this.state.offsetX = focus > 0.7 ? 10 : Math.sin(Date.now() / 5000) * 5;
    this.state.offsetY = focus > 0.7 ? -5 : Math.cos(Date.now() / 7000) * 3;
    this.state.pulsePhase = (Math.sin(Date.now() / 3000) + 1) / 2;
  }

  getState(): ShadowState { return { ...this.state }; }
}

export const presenceShadow = new PresenceShadow();
