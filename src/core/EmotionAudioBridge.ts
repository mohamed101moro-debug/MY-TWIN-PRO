import { stateBus } from './StateBus';
import { audioMixer } from './AudioMixer';

const EMOTION_CONTEXT_MAP: Record<string, string> = {
  joy: 'celebration',
  sadness: 'silence',
  anger: 'thinking',
  fear: 'silence',
  love: 'conversation',
  neutral: 'default',
  curious: 'study',
  focused: 'study',
  inspired: 'celebration',
  concerned: 'silence',
  happy: 'celebration',
};

export class EmotionAudioBridge {
  private unsubscribe: (() => void) | null = null;
  private currentEmotion = 'neutral';

  start(): void {
    this.stop();
    this.currentEmotion = stateBus.getState().emotion?.primaryEmotion || 'neutral';
    this.unsubscribe = stateBus.subscribe((state, changed = []) => {
      if (!changed.includes('emotion')) return;
      const emotion = state.emotion?.primaryEmotion || 'neutral';
      if (emotion === this.currentEmotion) return;
      this.currentEmotion = emotion;
      audioMixer.setContext(EMOTION_CONTEXT_MAP[emotion] || 'default');
    });
  }

  stop(): void { if (this.unsubscribe) { this.unsubscribe(); this.unsubscribe = null; } }
}

export const emotionAudioBridge = new EmotionAudioBridge();
