import { EventBus } from './EventBus';
import { StateBus } from './StateBus';
import { audioMixer } from './AudioMixer';

export type ConversationMode = 'silent' | 'voice' | 'living';

export class ConversationModeController {
  private currentMode: ConversationMode = 'silent';
  private voiceEnabled: boolean = false;
  private sttEnabled: boolean = false;

  constructor() {
    this.currentMode = 'silent';
    this.bindEvents();
  }

  /** التبديل بين الأوضاع */
  setMode(mode: ConversationMode): void {
    if (this.currentMode === mode) return;
    const previous = this.currentMode;
    this.currentMode = mode;

    switch (mode) {
      case 'silent':
        this.voiceEnabled = false;
        this.sttEnabled = false;
        audioMixer.setContext('silence');
        StateBus.update({ spaceEnergy: 'tranquil' });
        break;
      case 'voice':
        this.voiceEnabled = true;
        this.sttEnabled = true;
        audioMixer.setContext('conversation');
        StateBus.update({ spaceEnergy: 'warm' });
        break;
      case 'living':
        this.voiceEnabled = true;
        this.sttEnabled = true;
        audioMixer.setContext('conversation');
        StateBus.update({ spaceEnergy: 'energetic' });
        break;
    }

    EventBus.emit('CONVERSATION_MODE_CHANGED', {
      from: previous,
      to: mode,
      voiceEnabled: this.voiceEnabled,
      sttEnabled: this.sttEnabled,
    });
  }

  /** الوضع الحالي */
  getMode(): ConversationMode { return this.currentMode; }

  /** هل الصوت مفعل؟ */
  isVoiceEnabled(): boolean { return this.voiceEnabled; }

  /** هل الاستماع مفعل؟ */
  isSTTEnabled(): boolean { return this.sttEnabled; }

  private bindEvents(): void {
    EventBus.on('USER_SETTINGS_UPDATED', (payload: any) => {
      if (payload?.voiceEnabled !== undefined) {
        this.voiceEnabled = payload.voiceEnabled;
        if (!this.voiceEnabled && this.currentMode !== 'silent') {
          this.setMode('silent');
        }
      }
    });
  }
}

export const conversationModeController = new ConversationModeController();
