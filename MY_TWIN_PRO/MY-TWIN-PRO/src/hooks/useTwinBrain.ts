import { useState, useCallback, useRef } from 'react';
import { unifiedBrainBridge, UnifiedResponse, PerceptionData } from '../core/UnifiedBrainBridge';
import { perceptionEngine } from '../../engine/perception/PerceptionEngine';
import { unifiedPerceptionEngine } from '../../engine/perception/UnifiedPerceptionEngine';
import { presenceBridge } from '../core/PresenceBridge';
import { presenceEngine } from '../../engine/presence/PresenceEngine';
import { voiceEngine } from '../../engine/voice/VoiceEngine';
import { lifeStateEngine } from '../../engine/life/LifeStateEngine';
import { devicePresenceEngine } from '../../engine/device/DevicePresenceEngine';
import { stateBus } from '../core/StateBus';
import { EventBus } from '../core/EventBus';
import { useTwinStore } from '../../store/useTwinStore';
export interface ThinkingPhase { phase: string; progress: number; label: string; }
export interface BrainResponse { reply: string; provider: string; emotion: string; thinkingPhases: ThinkingPhase[]; memoryStored: boolean; relationshipDelta: number; }
const PHASE_LABELS: Record<string, { ar: string; en: string }> = {
  perceive: { ar: 'أشعر بوجودك...', en: 'I sense your presence...' },
  context: { ar: 'أفهم السياق...', en: 'Understanding context...' },
  remember: { ar: 'أتذكر...', en: 'Remembering...' },
  relate: { ar: 'أفهم علاقتنا...', en: 'Understanding our bond...' },
  respond: { ar: 'أستجيب...', en: 'Responding...' },
};
/** ✅ SSA-001: الواجهة جسد نحيف — الحواس تجمع، الخلفية تفكر، stateBus يشعر. */
export function useTwinBrain(initialUserId: string = '', initialLang: string = 'ar') {
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingPhase, setThinkingPhase] = useState<ThinkingPhase | null>(null);
  const [streamedText, setStreamedText] = useState('');
  const bridgeRef = useRef(unifiedBrainBridge);
  const tier = useTwinStore(s => s.tier) || 'free';
  bridgeRef.current.setUserId(initialUserId);
  bridgeRef.current.setLang(initialLang);
  const emitPhase = (phase: string, progress: number, lang: string) => {
    const labels = PHASE_LABELS[phase] || PHASE_LABELS.perceive;
    setThinkingPhase({ phase, progress, label: lang === 'ar' ? labels.ar : labels.en });
    EventBus.emit('AI_COGNITIVE_PHASE', { phase, progress });
  };
  const send = useCallback(async (message: string): Promise<BrainResponse> => {
    setIsThinking(true);
    const lang = initialLang;
    emitPhase('perceive', 0.05, lang);
    // حواس محلية فقط (تحليل كتابة + مستشعرات) — لا بناء سياق محلي
    const perception = perceptionEngine.analyze(message);
    if (devicePresenceEngine.isActive) {
      const sensors = devicePresenceEngine.getSensors();
      if (sensors.faceDetected) stateBus.update({ avatar: { ...stateBus.getState().avatar, gazeTarget: 'user' } });
    }
    await new Promise(r => setTimeout(r, 120));
    emitPhase('context', 0.15, lang);
    await unifiedPerceptionEngine.evaluate();
    const contextualPrompt = unifiedPerceptionEngine.getContextualPrompt();
    emitPhase('remember', 0.3, lang);
    emitPhase('relate', 0.45, lang);
    emitPhase('respond', 0.9, lang);
    EventBus.emit('AI_START_THINKING', { intent: message, confidence: 0.8 });
    try {
      const perceptionData: PerceptionData = {
        typingSpeed: perception.typingSpeed,
        messageLength: message.length,
        absenceDurationMinutes: perception.absenceDuration,
        timeOfDay: perception.timeOfDay,
        userState: perception.userState,
      };
      const sensors = devicePresenceEngine.getSensors();
      const device_info = {
        battery_level: sensors.deviceBattery,
        device_type: 'phone',
        os: 'expo',
        weather: sensors.weatherCondition,
        is_night: sensors.isNightTime,
        user_walking: sensors.userWalking,
        contextual_prompt: contextualPrompt,
      };
      const response: UnifiedResponse = await bridgeRef.current.process(message, perceptionData, tier, device_info);
      if (response) {
        stateBus.updateFromUnifiedResponse(response);
        if (response.twin_emotional_state) {
          presenceEngine.setEmotion(
            response.twin_emotional_state.current_emotion || 'neutral',
            response.twin_emotional_state.intensity || 0.5,
          );
        }
        if (response.memory_surfaced) {
          stateBus.patch({ memoryLevel: 0.85 });
          EventBus.emit('MEMORY_SURFACED', { emotion: response.twin_emotional_state?.current_emotion });
          EventBus.emit('MEMORY_CREATED', { memoryId: response.memory_surfaced.id, layer: 'context' });
        }
        const expr = (response as any).expression_intent;
        if (expr) {
          if ((expr.smile || 0) > 0.4) stateBus.patch({ connection: Math.min(1, stateBus.getState().connection + 0.12) });
          if ((expr.concern || 0) > 0.4) stateBus.patch({ emotionValence: -0.35 * expr.concern });
          if ((expr.pause || 0) > 0) await new Promise(r => setTimeout(r, Math.min(expr.pause * 800, 1200)));
        }
      }
      if (response.reply) {
        const phases: ThinkingPhase[] = [
          { phase: 'observe', progress: 0.1, label: PHASE_LABELS.perceive[lang === 'ar' ? 'ar' : 'en'] },
          { phase: 'understand', progress: 0.4, label: PHASE_LABELS.context[lang === 'ar' ? 'ar' : 'en'] },
          { phase: 'recall', progress: 0.6, label: PHASE_LABELS.remember[lang === 'ar' ? 'ar' : 'en'] },
          { phase: 'reason', progress: 0.8, label: PHASE_LABELS.relate[lang === 'ar' ? 'ar' : 'en'] },
          { phase: 'respond', progress: 1.0, label: PHASE_LABELS.respond[lang === 'ar' ? 'ar' : 'en'] },
        ];
        EventBus.emit('AI_FINISH_THINKING', { response: response.reply, confidence: 0.9 });
        try { voiceEngine.speak(response.reply, response.emotion); presenceBridge.speak(4000); } catch (e) {}
        return { reply: response.reply, provider: 'unified_brain', emotion: response.twin_emotional_state?.current_emotion || 'neutral', thinkingPhases: phases, memoryStored: !!response.memory_surfaced, relationshipDelta: response.twin_state_update?.bond_delta || 0 };
      }
      return { reply: '', provider: 'consciousness', emotion: 'neutral', thinkingPhases: [], memoryStored: false, relationshipDelta: 0 };
    } catch (error) {
      EventBus.emit('AI_FINISH_THINKING', { response: '', confidence: 0 });
      throw error;
    } finally {
      setIsThinking(false);
      setThinkingPhase(null);
      lifeStateEngine.transition('observing', 'finished responding');
    }
  }, [initialLang, tier]);
  const stream = useCallback(async (message: string): Promise<void> => {
    setIsThinking(true);
    setStreamedText('');
    const response = await send(message);
    if (response.reply) {
      for (let i = 0; i < response.reply.length; i++) {
        setStreamedText(response.reply.substring(0, i + 1));
        await new Promise(r => setTimeout(r, 15));
      }
    }
    setIsThinking(false);
  }, [send]);
  const setUserId = useCallback((userId: string) => { bridgeRef.current.setUserId(userId); }, []);
  const setLang = useCallback((lang: string) => { bridgeRef.current.setLang(lang); }, []);
  return { isThinking, thinkingPhase, streamedText, sendMessage: send, streamMessage: stream, setUserId, setLang };
}
