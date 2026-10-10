import { useCallback, useEffect, useRef, useState } from 'react';
import { unifiedBrainBridge, UnifiedResponse } from '../core/UnifiedBrainBridge';
import { stateBus } from '../core/StateBus';
import { EventBus } from '../core/EventBus';

const CHAT_TIMEOUT_MS = 30_000;
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('CHAT_TIMEOUT')), ms);
  promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
});

export function useTwinBrain(initialUserId = '', initialLang = 'ar') {
  const [isThinking, setIsThinking] = useState(false);
  const bridgeRef = useRef(unifiedBrainBridge);
  const requestRef = useRef(0);

  useEffect(() => {
    bridgeRef.current.setUserId(initialUserId);
    bridgeRef.current.setLang(initialLang);
  }, [initialUserId, initialLang]);

  const sendMessage = useCallback(async (message: string): Promise<UnifiedResponse> => {
    const requestId = ++requestRef.current;
    const clean = String(message ?? '').trim();
    if (!clean) throw new Error('MESSAGE_EMPTY');
    setIsThinking(true);
    EventBus.emit('AI_START_THINKING', { intent: clean, confidence: 0.8 });
    stateBus.patch({ thinking: true, focus: 0.8 });
    try {
      const response = await withTimeout(bridgeRef.current.process(clean), CHAT_TIMEOUT_MS);
      if (requestId === requestRef.current && response) stateBus.updateFromUnifiedResponse(response);
      return response;
    } catch (error: any) {
      if (error?.message === 'CHAT_TIMEOUT') throw new Error('انتهت مهلة الاستجابة. حاول مرة أخرى.');
      throw error;
    } finally {
      if (requestId === requestRef.current) {
        setIsThinking(false);
        stateBus.patch({ thinking: false });
        EventBus.emit('AI_FINISH_THINKING', {});
      }
    }
  }, []);

  return { isThinking, sendMessage };
}
