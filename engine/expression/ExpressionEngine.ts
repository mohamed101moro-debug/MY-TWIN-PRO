import { stateBus } from '../../src/core/StateBus';

export interface ExpressionState {
  emotion: string;
  intensity: number;
  tone: string;
  silenceMs: number;
  energy: number;
}

export class ExpressionEngine {
  private currentExpression: ExpressionState = {
    emotion: 'neutral',
    intensity: 0.5,
    tone: 'neutral',
    silenceMs: 0,
    energy: 0.7,
  };

  updateFromResponse(response: any): void {
    if (response?.twin_emotional_state) {
      this.currentExpression = {
        emotion: response.twin_emotional_state.real_emotion || 'neutral',
        intensity: response.twin_emotional_state.intensity || 0.5,
        tone: response.behavior?.tone || 'neutral',
        silenceMs: response.behavior?.silence_before_speaking_ms || 0,
        energy: response.presence_state?.energy || 0.7,
      };
    }
  }

  getCurrentExpression(): ExpressionState {
    return this.currentExpression;
  }

  getEmotionColor(): string {
    const colors: Record<string, string> = {
      joy: '#F59E0B', sadness: '#3B82F6', fear: '#A78BFA',
      anger: '#EF4444', love: '#EC4899', neutral: '#A855F7',
    };
    return colors[this.currentExpression.emotion] || '#A855F7';
  }

  evaluate(state: any): any {
    return {
      emotion: this.currentExpression.emotion,
      intensity: this.currentExpression.intensity,
      tone: this.currentExpression.tone,
      energy: this.currentExpression.energy,
    };
  }
}

export const expressionEngine = new ExpressionEngine();
