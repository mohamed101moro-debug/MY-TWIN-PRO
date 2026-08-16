import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import { apiPost } from '../../lib/httpClient';
import { stateBus } from '../../src/core/StateBus';
import { EventBus } from '../../src/core/EventBus';
export class VoiceEngine {
  private isActive = false;
  private isSpeaking = false;
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  start(): void { if (this.isActive) return; this.isActive = true; console.log('[VoiceEngine] 🎤 started'); }
  stop(): void { this.isActive = false; this.stopSpeaking(); this.stopListening(); }
  speak(text: string, emotion: string = 'neutral'): void {
    if (!this.isActive || !text) return;
    this.isSpeaking = true;
    stateBus.update({ interfaceState: 'speaking', presenceLevel: 4, avatar: { ...stateBus.getState().avatar, expression: emotion, eyesOpen: true, gazeTarget: 'user' } });
    stateBus.emit('presence:state_updated', { isSpeaking: true, isListening: false, isThinking: false, emotion });
    EventBus.emit('VOICE_SPEAKING_START', { text });
    this._speak(text, emotion);
  }
  /** ✅ 1) صوت عصبي عربي (edge-tts) ← 2) احتياط: صوت النظام */
  private async _speak(text: string, emotion: string): Promise<void> {
    const rate = emotion === 'joy' ? 1.05 : emotion === 'sadness' ? 0.85 : emotion === 'anger' ? 1.05 : 0.95;
    try {
      const res: any = await apiPost('/api/tts', { text: text.slice(0, 800), language: 'ar', gender: 'female' });
      if (res?.audio_base64) {
        const file = FileSystem.cacheDirectory + `tts_${Date.now()}.mp3`;
        await FileSystem.writeAsStringAsync(file, res.audio_base64, { encoding: FileSystem.EncodingType.Base64 });
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync({ uri: file }, { shouldPlay: true });
        this.sound = sound;
        try { await sound.setRateAsync(rate, false); } catch {}
        sound.setOnPlaybackStatusUpdate((st: any) => {
          if (st.isLoaded && st.didJustFinish) { this._onDone(file); }
        });
        return;
      }
    } catch {}
    const pitch = emotion === 'joy' ? 1.2 : emotion === 'sadness' ? 0.8 : 1.0;
    Speech.speak(text, {
      language: 'ar',
      pitch,
      rate,
      onDone: () => { this._onDone(null); },
      onError: () => { this._onDone(null); },
    });
  }
  private async _onDone(file: string | null): Promise<void> {
    this.isSpeaking = false;
    this._stopSound();
    if (file) { try { await FileSystem.deleteAsync(file, { idempotent: true }); } catch {} }
    stateBus.update({ interfaceState: 'twin', presenceLevel: 1 });
    stateBus.emit('presence:state_updated', { isSpeaking: false, isListening: true, isThinking: false });
    EventBus.emit('VOICE_SPEAKING_END', {});
  }
  private _stopSound(): void { if (this.sound) { try { this.sound.unloadAsync(); } catch {} this.sound = null; } }
  stopSpeaking(): void { Speech.stop(); this._stopSound(); this.isSpeaking = false; }
  async startListening(): Promise<void> {
    if (!this.isActive) return;
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync({ android: { extension: '.m4a', outputFormat: 2, audioEncoder: 3, sampleRate: 44100, numberOfChannels: 2, bitRate: 128000 }, ios: { extension: '.m4a', audioQuality: 0, sampleRate: 44100, numberOfChannels: 2, bitRate: 128000 } } as any);
      await this.recording.startAsync();
      stateBus.update({ interfaceState: 'listening', presenceLevel: 2 });
      stateBus.emit('presence:state_updated', { isSpeaking: false, isListening: true, isThinking: false });
      EventBus.emit('VOICE_LISTENING_START', {});
    } catch (e) { console.warn('[VoiceEngine] listen failed:', e); }
  }
  async stopListening(): Promise<string | null> {
    if (!this.recording) return null;
    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      stateBus.emit('presence:state_updated', { isSpeaking: false, isListening: false, isThinking: true });
      EventBus.emit('VOICE_LISTENING_END', { uri });
      return uri;
    } catch { return null; }
  }
  isSpeakingNow(): boolean { return this.isSpeaking; }
}
export const voiceEngine = new VoiceEngine();
