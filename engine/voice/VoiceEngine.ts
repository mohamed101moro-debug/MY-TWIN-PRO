import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import { apiPost } from '../../lib/httpClient';
import { stateBus } from '../../src/core/StateBus';
import { EventBus } from '../../src/core/EventBus';
export class VoiceEngine {
  private isActive = false;
  private isSpeaking = false;
  private sound: Audio.Sound | null = null;
  private speechWatchdog: ReturnType<typeof setTimeout> | null = null;
  private speechRun = 0;
  start(): void { if (this.isActive) return; this.isActive = true; }
  stop(): void { this.isActive = false; this.stopSpeaking(); }
  speak(text: string, emotion: string = 'neutral'): void {
    if (!this.isActive || !text) return;
    // Invalidate prior async TTS work before starting a new utterance.
    const run = ++this.speechRun;
    this.isSpeaking = true;
    Speech.stop();
    this._stopSound();
    if (this.speechWatchdog) clearTimeout(this.speechWatchdog);
    // Bound a stalled network/TTS operation so visual speaking state cannot remain stuck forever.
    this.speechWatchdog = setTimeout(() => { if (run === this.speechRun) void this._onDone(run, null); }, 120000);
    stateBus.update({ interfaceState: 'speaking', presenceLevel: 4, avatar: { ...stateBus.getState().avatar, expression: emotion, eyesOpen: true, gazeTarget: 'user' } });
    stateBus.emit('presence:state_updated', { isSpeaking: true, isListening: false, isThinking: false, emotion });
    EventBus.emit('VOICE_SPEAKING_START', { text });
    void this._speak(text, emotion, run);
  }
  /** ✅ 1) صوت عصبي عربي (edge-tts) ← 2) احتياط: صوت النظام */
  private isCurrentRun(run: number): boolean { return this.isActive && this.isSpeaking && run === this.speechRun; }
  private async _speak(text: string, emotion: string, run: number): Promise<void> {
    const rate = emotion === 'joy' ? 1.05 : emotion === 'sadness' ? 0.85 : emotion === 'anger' ? 1.05 : 0.95;
    try {
      const res: any = await apiPost('/api/tts', { text: text.slice(0, 800), language: 'ar', gender: 'female' });
      if (!this.isCurrentRun(run)) return;
      if (res?.audio_base64) {
        const file = FileSystem.cacheDirectory + `tts_${Date.now()}.mp3`;
        await FileSystem.writeAsStringAsync(file, res.audio_base64, { encoding: FileSystem.EncodingType.Base64 });
        if (!this.isCurrentRun(run)) { try { await FileSystem.deleteAsync(file, { idempotent: true }); } catch {} return; }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync({ uri: file }, { shouldPlay: true });
        if (!this.isCurrentRun(run)) { try { await sound.unloadAsync(); } catch {} try { await FileSystem.deleteAsync(file, { idempotent: true }); } catch {} return; }
        this.sound = sound;
        try { await sound.setRateAsync(rate, false); } catch {}
        sound.setOnPlaybackStatusUpdate((st: any) => {
          if (st.isLoaded && st.didJustFinish) { void this._onDone(run, file); }
        });
        return;
      }
    } catch {}
    if (!this.isCurrentRun(run)) return;
    const pitch = emotion === 'joy' ? 1.2 : emotion === 'sadness' ? 0.8 : 1.0;
    Speech.speak(text, {
      language: 'ar',
      pitch,
      rate,
      onDone: () => { void this._onDone(run, null); },
      onError: () => { void this._onDone(run, null); },
    });
  }
  private async _onDone(run: number, file: string | null): Promise<void> {
    if (!this.isCurrentRun(run)) return;
    this.isSpeaking = false;
    this.speechRun += 1;
    if (this.speechWatchdog) clearTimeout(this.speechWatchdog);
    this.speechWatchdog = null;
    Speech.stop();
    this._stopSound();
    if (file) { try { await FileSystem.deleteAsync(file, { idempotent: true }); } catch {} }
    stateBus.update({ interfaceState: 'twin', presenceLevel: 1 });
    stateBus.emit('presence:state_updated', { isSpeaking: false, isListening: false, isThinking: false });
    EventBus.emit('VOICE_SPEAKING_END', {});
  }
  private _stopSound(): void { if (this.sound) { try { this.sound.unloadAsync(); } catch {} this.sound = null; } }
  stopSpeaking(): void {
    Speech.stop(); this._stopSound();
    if (this.speechWatchdog) clearTimeout(this.speechWatchdog);
    this.speechWatchdog = null;
    if (this.isSpeaking) { this.isSpeaking = false; this.speechRun += 1; stateBus.update({ interfaceState: 'twin', presenceLevel: 1 }); EventBus.emit('VOICE_SPEAKING_END', {}); }
  }
  isSpeakingNow(): boolean { return this.isSpeaking; }
}
export const voiceEngine = new VoiceEngine();
