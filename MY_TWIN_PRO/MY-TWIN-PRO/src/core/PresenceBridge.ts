import { AppState, AppStateStatus } from 'react-native';
import { EventBus } from './EventBus';
import { stateBus } from './StateBus';
import { presenceEngine } from '../../engine/presence/PresenceEngine';
import { presenceClient } from './PresenceClient';
import { voiceEngine } from '../../engine/voice/VoiceEngine';
export { presenceEngine };

class PresenceBridge {
  private unsubs: Array<() => void> = [];
  private appStateSub: { remove: () => void } | null = null;
  private touchTimer: ReturnType<typeof setTimeout> | null = null;
  private active = false;

  start(): void {
    if (this.active) return;
    this.active = true;
    presenceEngine.start();
    void presenceClient.start();
    this.appStateSub = AppState.addEventListener('change', (state) => this.handleAppState(state));
    this.unsubs.push(EventBus.on('AI_START_THINKING', () => stateBus.patch({ thinking: true, focus: Math.max(Number(stateBus.getState().focus ?? 0.5), 0.72) })));
    this.unsubs.push(EventBus.on('AI_FINISH_THINKING', () => stateBus.patch({ thinking: false })));
    this.unsubs.push(EventBus.on('MEMORY_SURFACED', () => {
      // Memory is a backend cognitive fact. The client only renders its echo;
      // it must not mutate curiosity, emotion, bond, or memory authority.
      presenceEngine.triggerMemoryEcho();
    }));
    this.unsubs.push(EventBus.on('MEMORY_CREATED', () => {
      // Presentation-only event. Canonical memory state is persisted server-side.
    }));
    // VoiceEngine owns real TTS lifecycle; project its actual callbacks into the canonical presence bus.
    this.unsubs.push(EventBus.on('VOICE_SPEAKING_START', () => stateBus.patch({ speaking: true, listening: false })));
    this.unsubs.push(EventBus.on('VOICE_SPEAKING_END', () => stateBus.patch({ speaking: false })));
    this.unsubs.push(EventBus.on('VOICE_LISTENING_START', () => stateBus.patch({ listening: true, speaking: false })));
    this.unsubs.push(EventBus.on('VOICE_LISTENING_END', () => stateBus.patch({ listening: false })));
  }

  private handleAppState(next: AppStateStatus): void {
    if (!this.active) return;
    // `inactive` is a transient iOS state (Control Center, notification shade,
    // interruptions). Keep the runtime alive; only suspend on actual background.
    if (next === 'active') {
      presenceEngine.start(); void presenceClient.start();
    } else if (next === 'background') {
        // Backgrounding is a real interruption boundary: stop active media/recording and
      // let VoiceEngine emit lifecycle END events before suspending presence sensors.
      voiceEngine.stopSpeaking();
      void voiceEngine.stopListening();
      presenceClient.stop(); presenceEngine.stop();
      stateBus.patch({ thinking: false, listening: false, speaking: false });
    }
  }

  touch(): void {
    stateBus.patch({ touch: 1 });
    presenceEngine.addMicroExpression('head_nod', 0.35);
    if (this.touchTimer) clearTimeout(this.touchTimer);
    this.touchTimer = setTimeout(() => stateBus.patch({ touch: 0 }), 1200);
  }

  /** @deprecated Speaking state must come from VoiceEngine lifecycle events, never a guessed duration. */
  speak(_durationMs?: number): void { /* intentionally inert: no synthetic speech state */ }
  setGaze(x: number, y: number): void { stateBus.patch({ gazeX: Math.max(-1, Math.min(1, Number(x) || 0)), gazeY: Math.max(-1, Math.min(1, Number(y) || 0)) }); }

  stop(): void {
    this.active = false;
    this.appStateSub?.remove(); this.appStateSub = null;
    this.unsubs.forEach((u) => { try { u(); } catch {} }); this.unsubs = [];
    if (this.touchTimer) clearTimeout(this.touchTimer); this.touchTimer = null;
    presenceClient.stop(); presenceEngine.stop();
  }
}
export const presenceBridge = new PresenceBridge();
