import { EventBus } from '../core/EventBus';
import { StateBus } from '../core/StateBus';
import { audioEngine } from '../core/AudioEngine';
import { livingPresenceCoordinator } from '../core/LivingPresenceCoordinator';

export type DailyState =
  | 'morning' | 'idle' | 'conversation' | 'thinking' | 'remembering'
  | 'workspace' | 'code_lab' | 'business' | 'content_creator' | 'dream'
  | 'celebration' | 'silence' | 'goodbye';

interface TimeContext {
  hour: number;
  isMorning: boolean;
  isAfternoon: boolean;
  isEvening: boolean;
  isNight: boolean;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
}

interface LivingPreset {
  bgGradient: string[];
  particleColor: string;
  particleSpeed: number;
  particleCount: number;
  breathDuration: number;
  audioTrack: string;
  audioVolume: number;
  eyesOpen: boolean;
  expression: 'neutral' | 'warm' | 'focused' | 'concerned' | 'joyful';
  gazeTarget: 'user' | 'internal' | 'none';
  glowColor: string;
  glowIntensity: number;
  shouldSpeak: boolean;
  suggestedPhrase: string;
}

export class DailyLifeController {
  private currentState: DailyState = 'idle';
  private timeContext: TimeContext;
  private lastInteraction: number = Date.now();
  private isActive: boolean = false;
  private unsubscribers: Array<() => void> = [];
  private rhythm: { studyHours: number[]; activeDays: number[]; avgSessionDuration: number } = { studyHours: [], activeDays: [], avgSessionDuration: 0 };

  constructor() {
    this.timeContext = this.buildTimeContext();
  }

  start(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.timeContext = this.buildTimeContext();
    this.currentState = this.determineInitialState();
    this.applyState(this.currentState);
    this.bindEvents();

    const interval = setInterval(() => {
      this.timeContext = this.buildTimeContext();
      this.checkIdleTransition();
    livingPresenceCoordinator.getAnticipationLevel();
      this.updateRhythm();
    }, 30000);

    this.unsubscribers.push(() => clearInterval(interval));
    console.log(`[DailyLife] ✨ بدأ اليوم: ${this.currentState}`);
  }

  stop(): void {
    this.isActive = false;
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.transitionTo('goodbye');
  }

  getCurrentState(): DailyState { return this.currentState; }

  private determineInitialState(): DailyState {
    const { isMorning, isNight } = this.timeContext;
    if (isMorning) return 'morning';
    if (isNight) return 'idle';
    return 'idle';
  }

  private checkIdleTransition(): void {
    const elapsed = Date.now() - this.lastInteraction;
    const minutes = elapsed / 60000;
    if (this.currentState === 'conversation' && minutes > 2) this.transitionTo('idle');
    else if (this.currentState === 'thinking' && minutes > 1) this.transitionTo('idle');
  }

  private transitionTo(state: DailyState): void {
    if (this.currentState === state) return;
    const previous = this.currentState;
    this.currentState = state;
    this.applyState(state);
    EventBus.emit('DAILY_STATE_CHANGED', { from: previous, to: state });
  }

  private applyState(state: DailyState): void {
    const preset = this.getPreset(state);
    StateBus.update({
      spaceEnergy: state === 'morning' ? 'serene' : state === 'celebration' ? 'energetic' : state === 'silence' ? 'tranquil' : 'warm',
    });
    if (preset.audioTrack) audioEngine.play(preset.audioTrack);
    StateBus.update({
      avatar: {
        ...StateBus.select(s => s.avatar),
        eyesOpen: preset.eyesOpen,
        expression: preset.expression,
        gazeTarget: preset.gazeTarget,
      },
    });
    EventBus.emit('LIVING_STATE_APPLIED', { state, preset: { glowColor: preset.glowColor, glowIntensity: preset.glowIntensity, breathDuration: preset.breathDuration, particleColor: preset.particleColor, particleSpeed: preset.particleSpeed } });
    if (state === 'morning' && preset.shouldSpeak && preset.suggestedPhrase) {
      setTimeout(() => EventBus.emit('TWIN_SPEAK', { phrase: preset.suggestedPhrase, tone: 'gentle' }), 2000);
    }
    console.log(`[DailyLife] 🎨 ${state}: glow=${preset.glowColor}, audio=${preset.audioTrack}`);
  }

  private getPreset(state: DailyState): LivingPreset {
    const presets: Record<string, LivingPreset> = {
      morning: { bgGradient: ['#0A1A2A', '#0D1F35', '#081828'], particleColor: '#6BA4D0', particleSpeed: 8000, particleCount: 10, breathDuration: 6000, audioTrack: 'ambience_space', audioVolume: 0.10, eyesOpen: true, expression: 'warm', gazeTarget: 'user', glowColor: '#6BA4D0', glowIntensity: 0.25, shouldSpeak: true, suggestedPhrase: 'صباح الخير.' },
      idle: { bgGradient: ['#0A0A14', '#0C0C18', '#080810'], particleColor: '#B8A0D0', particleSpeed: 12000, particleCount: 6, breathDuration: 8000, audioTrack: 'breathing_loop', audioVolume: 0.05, eyesOpen: true, expression: 'neutral', gazeTarget: 'none', glowColor: '#B8A0D0', glowIntensity: 0.15, shouldSpeak: false, suggestedPhrase: '' },
      conversation: { bgGradient: ['#0A0A14', '#0C0C18', '#080810'], particleColor: '#C8B0E0', particleSpeed: 6000, particleCount: 12, breathDuration: 5000, audioTrack: '', audioVolume: 0, eyesOpen: true, expression: 'warm', gazeTarget: 'user', glowColor: '#D0C0E8', glowIntensity: 0.35, shouldSpeak: false, suggestedPhrase: '' },
      thinking: { bgGradient: ['#080810', '#0A0A18', '#060810'], particleColor: '#8090C0', particleSpeed: 15000, particleCount: 4, breathDuration: 10000, audioTrack: 'neural_hum', audioVolume: 0.05, eyesOpen: true, expression: 'focused', gazeTarget: 'internal', glowColor: '#8090C0', glowIntensity: 0.12, shouldSpeak: false, suggestedPhrase: '' },
      remembering: { bgGradient: ['#0A0818', '#0C0A1A', '#080618'], particleColor: '#C8A0D0', particleSpeed: 9000, particleCount: 8, breathDuration: 7000, audioTrack: 'memory_whisper', audioVolume: 0.08, eyesOpen: true, expression: 'warm', gazeTarget: 'internal', glowColor: '#C8A0D0', glowIntensity: 0.28, shouldSpeak: false, suggestedPhrase: '' },
      workspace: { bgGradient: ['#080A18', '#0A0C1A', '#060818'], particleColor: '#6090C0', particleSpeed: 10000, particleCount: 14, breathDuration: 5500, audioTrack: '', audioVolume: 0, eyesOpen: true, expression: 'focused', gazeTarget: 'user', glowColor: '#6090C0', glowIntensity: 0.30, shouldSpeak: false, suggestedPhrase: '' },
      code_lab: { bgGradient: ['#0A0F14', '#0C1218', '#060A0E'], particleColor: '#00BCD4', particleSpeed: 7000, particleCount: 12, breathDuration: 5000, audioTrack: 'neural_hum', audioVolume: 0.06, eyesOpen: true, expression: 'focused', gazeTarget: 'user', glowColor: '#00BCD4', glowIntensity: 0.30, shouldSpeak: false, suggestedPhrase: '' },
      business: { bgGradient: ['#0A0A0A', '#0F0F0F', '#080808'], particleColor: '#D4A574', particleSpeed: 9000, particleCount: 8, breathDuration: 5500, audioTrack: 'ambience_space', audioVolume: 0.07, eyesOpen: true, expression: 'focused', gazeTarget: 'user', glowColor: '#D4A574', glowIntensity: 0.25, shouldSpeak: false, suggestedPhrase: '' },
      content_creator: { bgGradient: ['#0F0A14', '#120C18', '#0A0610'], particleColor: '#D0A0E0', particleSpeed: 6500, particleCount: 14, breathDuration: 4800, audioTrack: 'ambience_space', audioVolume: 0.08, eyesOpen: true, expression: 'warm', gazeTarget: 'user', glowColor: '#D0A0E0', glowIntensity: 0.30, shouldSpeak: false, suggestedPhrase: '' },
      dream: { bgGradient: ['#0A0818', '#0C0A1E', '#060414'], particleColor: '#8B5CF6', particleSpeed: 11000, particleCount: 6, breathDuration: 7000, audioTrack: 'ambience_space', audioVolume: 0.06, eyesOpen: true, expression: 'warm', gazeTarget: 'internal', glowColor: '#8B5CF6', glowIntensity: 0.20, shouldSpeak: false, suggestedPhrase: '' },
      celebration: { bgGradient: ['#100820', '#180A28', '#0C0618'], particleColor: '#F0C0D0', particleSpeed: 4000, particleCount: 20, breathDuration: 4000, audioTrack: 'milestone', audioVolume: 0.20, eyesOpen: true, expression: 'joyful', gazeTarget: 'user', glowColor: '#F0C0D0', glowIntensity: 0.50, shouldSpeak: true, suggestedPhrase: '' },
      silence: { bgGradient: ['#080808', '#0A0A0A', '#060606'], particleColor: '#606060', particleSpeed: 20000, particleCount: 2, breathDuration: 12000, audioTrack: 'silence_room', audioVolume: 0.04, eyesOpen: false, expression: 'neutral', gazeTarget: 'none', glowColor: '#404040', glowIntensity: 0.05, shouldSpeak: false, suggestedPhrase: '' },
      goodbye: { bgGradient: ['#050508', '#060608', '#040408'], particleColor: '#404060', particleSpeed: 25000, particleCount: 1, breathDuration: 15000, audioTrack: '', audioVolume: 0, eyesOpen: false, expression: 'neutral', gazeTarget: 'none', glowColor: '#303040', glowIntensity: 0.02, shouldSpeak: false, suggestedPhrase: '' },
    };
    return presets[state] || presets.idle;
  }

  private buildTimeContext(): TimeContext {
    const hour = new Date().getHours();
    const month = new Date().getMonth();
    let season: TimeContext['season'] = 'spring';
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'autumn';
    else season = 'winter';
    return { hour, isMorning: hour >= 5 && hour < 12, isAfternoon: hour >= 12 && hour < 18, isEvening: hour >= 18 && hour < 22, isNight: hour >= 22 || hour < 5, season };
  }

  private bindEvents(): void {
    this.unsubscribers.push(
      EventBus.on('USER_SEND_MESSAGE', () => { this.lastInteraction = Date.now(); this.transitionTo('conversation'); }),
      EventBus.on('AI_START_THINKING', () => this.transitionTo('thinking')),
      EventBus.on('AI_FINISH_THINKING', () => { this.lastInteraction = Date.now(); this.transitionTo('conversation'); }),
      EventBus.on('MEMORY_SURFACED', () => { this.transitionTo('remembering'); setTimeout(() => { if (this.currentState === 'remembering') this.transitionTo('idle'); }, 4000); }),
      EventBus.on('WORKSPACE_TRANSFORM_START', () => this.transitionTo('workspace')),
      EventBus.on('SIGNATURE_MOMENT', () => { this.transitionTo('celebration'); setTimeout(() => { if (this.currentState === 'celebration') this.transitionTo('idle'); }, 6000); }),
      EventBus.on('SILENCE_START', () => this.transitionTo('silence')),
      EventBus.on('SILENCE_END', () => this.transitionTo('idle')),
      EventBus.on('APP_BACKGROUND', () => this.transitionTo('goodbye')),
      EventBus.on('APP_FOREGROUND', () => { this.lastInteraction = Date.now(); this.timeContext = this.buildTimeContext(); this.transitionTo(this.determineInitialState()); }),
      EventBus.on('CAPABILITY_ACTIVATED', (payload: any) => { 
        if (payload?.capability === 'code_lab') this.transitionTo('code_lab'); 
        if (payload?.capability === 'business') this.transitionTo('business'); 
        if (payload?.capability === 'content_creator') this.transitionTo('content_creator');
        if (payload?.capability === 'dream') this.transitionTo('dream');
      }),
    );
  }

  private updateRhythm(): void {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    if (this.currentState === 'workspace' || this.currentState === 'conversation') {
      if (!this.rhythm.studyHours.includes(hour)) this.rhythm.studyHours.push(hour);
      if (!this.rhythm.activeDays.includes(day)) this.rhythm.activeDays.push(day);
    }
  }

  getLifeRhythm() { return { ...this.rhythm }; }
}

export const dailyLifeController = new DailyLifeController();
