import { useState, useCallback, useRef } from 'react';
import { unifiedBrainBridge, UnifiedResponse, PerceptionData } from '../core/UnifiedBrainBridge';
import { perceptionEngine } from '../../engine/perception/PerceptionEngine';
import { unifiedPerceptionEngine } from '../../engine/perception/UnifiedPerceptionEngine';
import { devicePresenceEngine } from '../../engine/device/DevicePresenceEngine';
import { sharedPresence } from '../../engine/vision/VisionBridge';
import { presenceEngine } from '../../engine/presence/PresenceEngine';
import { stateBus } from '../core/StateBus';
import { EventBus } from '../core/EventBus';
import { useTwinStore } from '../../store/useTwinStore';
/** المنسق النحيف: حواس → خلفية → جسد. المسار الوحيد للدردشة. */
export function useTwinBrain(initialUserId: string = '', initialLang: string = 'ar') {
  const [isThinking, setIsThinking] = useState(false);
  const bridgeRef = useRef(unifiedBrainBridge);
  const tier = useTwinStore(s => s.tier) || 'free';
  bridgeRef.current.setUserId(initialUserId); bridgeRef.current.setLang(initialLang);
  const sendMessage = useCallback(async (message: string): Promise<UnifiedResponse> => {
    setIsThinking(true);
    EventBus.emit('AI_START_THINKING', { intent: message, confidence: 0.8 });
    stateBus.patch({ thinking: true, focus: 0.8 });
    try {
      const perception = perceptionEngine.analyze(message);
      await unifiedPerceptionEngine.evaluate();
      const sensors = devicePresenceEngine.getSensors();
      const device_info = {
        battery_level: sensors.deviceBattery, device_type: 'phone', os: 'expo',
        weather: sensors.weatherCondition, is_night: sensors.isNightTime, user_walking: sensors.userWalking,
        audio_level: sensors.audioLevel, light_level: sensors.lightLevel,
        place: sharedPresence.place || undefined, vision_summary: sharedPresence.vision_summary || undefined,
        contextual_prompt: unifiedPerceptionEngine.getContextualPrompt(),
      };
      const perceptionData: PerceptionData = { typingSpeed: perception.typingSpeed, messageLength: message.length, absenceDurationMinutes: perception.absenceDuration, timeOfDay: perception.timeOfDay, userState: perception.userState };
      const response = await bridgeRef.current.process(message, perceptionData, tier, device_info);
      if (response) {
        (stateBus as any).updateFromUnifiedResponse?.(response);
        if (response.twin_emotional_state) presenceEngine.setEmotion(response.twin_emotional_state.current_emotion || 'neutral', response.twin_emotional_state.intensity || 0.5);
        const expr = (response as any).expression_intent;
        if (expr) {
          if ((expr.smile || 0) > 0.4) stateBus.patch({ connection: Math.min(1, stateBus.getState().connection + 0.12) });
          if ((expr.concern || 0) > 0.4) stateBus.patch({ emotionValence: -0.35 * expr.concern });
        }
      }
      return response;
    } finally {
      setIsThinking(false);
      stateBus.patch({ thinking: false });
      EventBus.emit('AI_FINISH_THINKING', {});
    }
  }, [tier]);
  return { isThinking, sendMessage };
}
