import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearCredentialStorage } from './credentialStore';
import * as Speech from 'expo-speech';
import { useAwarenessStore } from '../store/useAwarenessStore';
import { useCapabilityStore } from '../store/useCapabilityStore';
import { useConversationStore } from '../store/useConversationStore';
import { useCreditsStore } from '../store/useCreditsStore';
import { useProjectStore } from '../store/useProjectStore';
import { useRelationshipStore } from '../store/useRelationshipStore';
import { useTwinCoreStore } from '../store/useTwinCoreStore';
import { useTwinState } from '../engine/core/TwinState';
import { voiceCallManager } from '../engine/voice/VoiceCallManager';
import { subscriptionService } from '../src/services/SubscriptionService';
import { economyEngine } from '../src/services/EconomyEngine';
import { stateBus } from '../src/core/StateBus';
import { unifiedBrainBridge } from '../src/core/UnifiedBrainBridge';
import { resetSharedPresence } from '../engine/vision/VisionBridge';
import { clearOfflineSessionData } from './offlineService';
import { cancelPendingRequests } from './httpClient';
import { bootstrapCoordinator } from '../src/core/BootstrapCoordinator';

const AUTH_KEYS = ['mytwin-user'];
const SESSION_KEYS = [
  'mytwin-core-v2',
  'mytwin-relationship-v2',
  'mytwin-awareness-v2',
  'mytwin-credits-v2',
  'mytwin-projects-v2',
  'mytwin_soul_points',
  'mytwin.lifecycle_evidence.v1',
  'ritual_day',
];

/**
 * Remove all local user-bound state before logout or account replacement.
 * Any credential-storage failure is surfaced to the caller; logout must not report success.
 */
export async function clearLocalSessionState(): Promise<void> {
  let previousUserId: string | null = null;
  try { previousUserId = await AsyncStorage.getItem('mytwin-user'); } catch {}
  let credentialRemovalError: unknown;
  try {
    await clearCredentialStorage();
  } catch (error) {
    credentialRemovalError = error;
  }
  try {
    await AsyncStorage.multiRemove(AUTH_KEYS);
  } catch (error) {
    credentialRemovalError = credentialRemovalError || error;
  }

  // Invalidate active fetches before any of their results can mutate the next session.
  cancelPendingRequests();
  bootstrapCoordinator.stop();
  voiceCallManager.endCall();
  try { await Speech.stop(); } catch {}

  unifiedBrainBridge.clearSession();
  resetSharedPresence();
  subscriptionService.resetSession();
  await economyEngine.clearSession(previousUserId || undefined);
  stateBus.reset();
  useTwinState.setState({
    consciousnessMode: 'listening',
    emotion: 'neutral',
    thinkingStage: 'idle',
    presenceLevel: 'aware',
    awarenessLevel: 'Aware',
    attention: 80,
    confidence: 70,
    bondLevel: 0,
    energy: 80,
    isThinking: false,
    isSpeaking: false,
    isListening: false,
    isProcessing: false,
    isSearchingMemory: false,
  });

  useTwinCoreStore.getState().reset();
  useCapabilityStore.getState().resetSession();
  useConversationStore.getState().resetSession();
  useRelationshipStore.getState().reset();
  useAwarenessStore.getState().reset();
  useCreditsStore.getState().resetForSession();
  useProjectStore.getState().clearProjects();

  await clearOfflineSessionData();
  try {
    await AsyncStorage.multiRemove(SESSION_KEYS);
  } catch (error) {
    credentialRemovalError = credentialRemovalError || error;
  }

  if (credentialRemovalError) {
    throw new Error('تعذر مسح بيانات الجلسة بأمان؛ أعد المحاولة قبل اعتبار تسجيل الخروج مكتملاً.');
  }
}
