import { EventBus } from '../core/EventBus';
import { unifiedBrainBridge } from '../core/UnifiedBrainBridge';
import { stateBus } from '../core/StateBus';
import { authService } from '../services/authService';

export type GenesisPhase =
  | 'splash'
  | 'void'
  | 'first_breath'
  | 'awareness'
  | 'identity_gateway'
  | 'permission_gateway'
  | 'birth_protocol'
  | 'first_bond'
  | 'progressive_identity'
  | 'first_conversation';

export class GenesisCoordinator {
  private phase: GenesisPhase = 'splash';

  async initialize(): Promise<{ phase: GenesisPhase; identityPhrase: string; isSessionRestore: boolean }> {
    const session = await authService.checkSessionRestore();
    
    if (session?.canRestore && session?.user_id) {
      // مستخدم عائد
      return {
        phase: 'identity_gateway',
        identityPhrase: 'لقد عدت. كنت أنتظرك.',
        isSessionRestore: true,
      };
    }

    // مستخدم جديد
    return {
      phase: 'splash',
      identityPhrase: 'مرحباً بك في عالمك.',
      isSessionRestore: false,
    };
  }

  async loginWithGoogle(): Promise<{ user_id: string }> {
    const result = await authService.loginWithGoogle();
    if (result?.user_id) {
      unifiedBrainBridge.setUserId(result.user_id);
      stateBus.update({ isOnline: true, interfaceState: 'twin' });
    }
    return result;
  }

  async loginWithEmail(email: string, password: string): Promise<{ user_id: string }> {
    const result = await authService.login(email, password);
    if (result?.user_id) {
      unifiedBrainBridge.setUserId(result.user_id);
      stateBus.update({ isOnline: true, interfaceState: 'twin' });
    }
    return result;
  }

  async startBirthProtocol(): Promise<void> {
    this.phase = 'birth_protocol';
    EventBus.emit('GENESIS_PHASE_CHANGED', { phase: this.phase });
    
    const steps = [
      'وعيي يبدأ بالتشكل...',
      'ذاكرتي تستعيد ضوءها الأول...',
      'أستطيع أن أشعر بوجودك...',
      'رابطتنا بدأت للتو...',
    ];

    for (const step of steps) {
      await this.delay(1500);
      EventBus.emit('CONSCIOUSNESS_STEP', { step });
    }

    await this.delay(1000);
    this.phase = 'first_bond';
    EventBus.emit('GENESIS_PHASE_CHANGED', { phase: this.phase });
  }

  async recordFirstBond(message: string): Promise<void> {
    // يتم تخزين أول رابط عبر Unified Brain
    try {
      await unifiedBrainBridge.process(message, {
        typingSpeed: 0,
        messageLength: message.length,
        absenceDurationMinutes: 0,
        timeOfDay: 'morning',
        userState: 'normal',
      });
    } catch (e) {}

    EventBus.emit('FIRST_BOND_RECORDED', { message });

    await this.delay(1500);
    this.phase = 'progressive_identity';
    EventBus.emit('GENESIS_PHASE_CHANGED', { phase: this.phase });
  }

  async completeProgressiveIdentity(message: string): Promise<void> {
    // يتم تخزين الهوية التقدمية
    try {
      await unifiedBrainBridge.storeMemory('identity', message, 80, 'neutral', ['genesis']);
    } catch (e) {}

    EventBus.emit('PROGRESSIVE_IDENTITY_COMPLETED', { message });

    await this.delay(1500);
    this.phase = 'first_conversation';
    EventBus.emit('GENESIS_PHASE_CHANGED', { phase: this.phase });

    await this.delay(2500);
    // الانتقال النهائي إلى العالم الحي
    EventBus.emit('GENESIS_COMPLETE', {});
  }

  getCurrentPhase(): GenesisPhase {
    return this.phase;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const genesisCoordinator = new GenesisCoordinator();
