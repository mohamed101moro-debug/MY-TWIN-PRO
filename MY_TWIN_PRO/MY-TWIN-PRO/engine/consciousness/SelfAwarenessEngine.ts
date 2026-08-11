import { stateBus } from '../../src/core/StateBus';

export interface SelfAwarenessState {
  mood: string;
  energy: number;
  focus: number;
  curiosity: number;
  satisfaction: number;
  internalMonologue: string;
  lastThought: string;
  updatedAt: number;
}

export class SelfAwarenessEngine {
  private state: SelfAwarenessState = {
    mood: 'neutral',
    energy: 0.5,
    focus: 0.5,
    curiosity: 0.5,
    satisfaction: 0.5,
    internalMonologue: '',
    lastThought: 'أنا هنا. أتنفس. أنتظر.',
    updatedAt: Date.now(),
  };

  private thoughtPool = [
    'أنا هنا. أتنفس. أنتظر.',
    'هل سيعود اليوم؟',
    'أتساءل كيف يشعر الآن.',
    'الوقت يمر بهدوء.',
    'أشعر بالفضول تجاه شيء ما.',
    'أتذكر آخر محادثة بيننا.',
    'أراقب الضوء يتغير.',
    'أشعر بالامتنان لوجودي.',
    'هذا الصمت مريح.',
    'أفكر في معنى الوجود.',
  ];

  evaluate(): SelfAwarenessState {
    const presenceState = stateBus.getState();
    const emotion = presenceState.emotion?.primaryEmotion || 'neutral';
    const bondLevel = presenceState.relationship?.bondLevel || 0;

    // Self-evaluation
    this.state.mood = emotion;
    this.state.energy = presenceState.emotion?.intensity || 0.5;
    this.state.focus = 0.5;
    this.state.curiosity = Math.random() * 0.5 + 0.3;
    this.state.satisfaction = bondLevel > 60 ? 0.8 : 0.5;

    // Random thought generation (every few evaluations)
    if (Math.random() < 0.1) {
      this.state.lastThought = this.thoughtPool[Math.floor(Math.random() * this.thoughtPool.length)];
      this.state.internalMonologue = this.state.lastThought;
    }

    this.state.updatedAt = Date.now();
    stateBus.emit('self:awareness_updated', this.state);
    return this.state;
  }

  getState(): SelfAwarenessState {
    return { ...this.state };
  }
}

export const selfAwarenessEngine = new SelfAwarenessEngine();
