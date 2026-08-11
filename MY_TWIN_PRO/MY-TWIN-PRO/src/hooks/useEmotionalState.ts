import { useEffect, useState } from 'react';
import { stateBus, STATE_EVENTS } from '../core/StateBus';
import { useAppTheme } from '../../engine/colors';

interface EmotionalInfo {
  emotion: string;
  primaryEmotion: string;
  intensity: number;
  valence: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  haloColor: string;
  glowWarmth: number;
  isSpeaking: boolean;
  isListening: boolean;
}

const EMOTION_HALO_COLORS: Record<string, string> = {
  joy: '#FFD700', sadness: '#4A90E2', calm: '#7C3AED',
  love: '#E91E63', anger: '#FF3B30', fear: '#9C27B0',
  neutral: '#A090C0', curious: '#5BA0B0', focused: '#6090C0',
  inspired: '#C8A0D0', concerned: '#C09090', happy: '#FFC107',
};

// القيم الافتراضية من StateBus (المصدر الوحيد للحقيقة)
function getDefaultInfo(): EmotionalInfo {
  const currentState = stateBus.getState();
  return {
    emotion: currentState.emotion.primaryEmotion,
    primaryEmotion: currentState.emotion.primaryEmotion,
    intensity: currentState.emotion.intensity,
    valence: currentState.emotion.valence,
    confidence: currentState.emotion.confidence,
    haloColor: EMOTION_HALO_COLORS[currentState.emotion.primaryEmotion] || EMOTION_HALO_COLORS.neutral,
    glowWarmth: currentState.emotion.valence === 'positive' ? 0.7 : currentState.emotion.valence === 'negative' ? 0.3 : 0.5,
    isSpeaking: false,
    isListening: true,
  };
}

export function useEmotionalState(): EmotionalInfo {
  const [info, setInfo] = useState<EmotionalInfo>(getDefaultInfo);

  useEffect(() => {
    // المسار 1: StateBus.subscribeTo — يستمع لتغيرات emotional state الكاملة
    const unsub1 = stateBus.subscribeTo(
      (s) => s.emotion,
      (emotion) => {
        setInfo(prev => ({
          ...prev,
          emotion: emotion.primaryEmotion,
          primaryEmotion: emotion.primaryEmotion,
          intensity: emotion.intensity,
          valence: emotion.valence,
          confidence: emotion.confidence,
          haloColor: EMOTION_HALO_COLORS[emotion.primaryEmotion] || EMOTION_HALO_COLORS.neutral,
          glowWarmth: emotion.valence === 'positive' ? 0.7 : emotion.valence === 'negative' ? 0.3 : 0.5,
        }));
      }
    );

    // المسار 2: stateBus.on EMOTION_CHANGED — يستمع لأحداث تغير المشاعر المباشرة
    const unsub2 = stateBus.on(STATE_EVENTS.EMOTION_CHANGED, (_event: string, data: any) => {
      const emotionName = data?.to || data?.emotion || 'neutral';
      const intensityVal = data?.intensity || 0.5;
      setInfo(prev => ({
        ...prev,
        emotion: emotionName,
        primaryEmotion: emotionName,
        intensity: intensityVal,
        haloColor: EMOTION_HALO_COLORS[emotionName] || EMOTION_HALO_COLORS.neutral,
        isSpeaking: emotionName === 'joy' || emotionName === 'anger',
        isListening: emotionName === 'neutral' || emotionName === 'calm' || emotionName === 'curious',
      }));
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  return info;
}
