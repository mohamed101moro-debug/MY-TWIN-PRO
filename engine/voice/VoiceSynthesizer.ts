/**
 * VOICE SYNTHESIZER v1.0 – محرك تحويل النص إلى كلام
 * ======================================================
 * يدعم: Edge TTS (مجاني)، ElevenLabs (فاخر)، Expo Speech (محلي)
 */
import { voicePersona, VoiceProfile } from './VoicePersona';
import type { Emotion } from '../core/TwinState';

export class VoiceSynthesizer {
  private apiKey: string = '';

  setApiKey(key: string): void { this.apiKey = key; }

  /**
   * تحويل النص إلى كلام
   * @returns base64 audio data أو null
   */
  async synthesize(text: string, emotion: Emotion = 'neutral'): Promise<string | null> {
    const profile = voicePersona.getProfile(emotion);

    // 1. محاولة ElevenLabs (أفضل جودة)
    if (this.apiKey) {
      const result = await this._elevenlabs(text, profile);
      if (result) return result;
    }

    // 2. Edge TTS (مجاني وموثوق)
    const result = await this._edgeTTS(text, profile);
    if (result) return result;

    // 3. fallback – يُستخدم expo-speech في الواجهة الأمامية
    return null;
  }

  private async _elevenlabs(text: string, profile: VoiceProfile): Promise<string | null> {
    try {
      const voiceId = profile.baseVoice.includes('Salma') ? 'EXAVITQu4vr4xnSDxMaL' : 'IKne3meq5aAp9LvzooVq';
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: profile.style === 'هادئة' ? 0.2 : 0.6,
          },
        }),
      });
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer).toString('base64');
      }
    } catch (e) {}
    return null;
  }

  private async _edgeTTS(text: string, profile: VoiceProfile): Promise<string | null> {
    try {
      const voice = profile.baseVoice;
      const rate = profile.rate >= 1 ? `+${Math.round((profile.rate - 1) * 100)}%` : `-${Math.round((1 - profile.rate) * 100)}%`;
      const pitch = profile.pitch >= 1 ? `+${Math.round((profile.pitch - 1) * 100)}Hz` : `-${Math.round((1 - profile.pitch) * 100)}Hz`;

      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ar">
        <voice name="${voice}">
          <prosody rate="${rate}" pitch="${pitch}">${text}</prosody>
        </voice>
      </speak>`;

      const response = await fetch(`https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        },
        body: ssml,
      });
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer).toString('base64');
      }
    } catch (e) {}
    return null;
  }

  /**
   * للحصول على النص المنطوق فقط (لـ expo-speech)
   */
  getConfigForExpoSpeech(emotion: Emotion = 'neutral'): { rate: number; pitch: number; language: string } {
    const profile = voicePersona.getProfile(emotion);
    return { rate: profile.rate, pitch: profile.pitch, language: 'ar' };
  }
}

export const voiceSynthesizer = new VoiceSynthesizer();
