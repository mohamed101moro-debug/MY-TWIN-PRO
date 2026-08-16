import { stateBus } from '../../src/core/StateBus';
import { EventBus } from '../../src/core/EventBus';
import { presenceEngine } from '../presence/PresenceEngine';
import { existenceLoop } from '../../src/core/ExistenceLoop';
import { presenceShadow } from '../../src/core/PresenceShadow';
import { audioEngine } from '../../src/core/AudioEngine';
import { audioMixer } from '../../src/core/AudioMixer';
import { devicePresenceEngine } from '../device/DevicePresenceEngine';
import { sensorBridge } from '../../src/core/SensorBridge';
import { unifiedPerceptionEngine } from '../perception/UnifiedPerceptionEngine';
import { lifeRhythmEngine } from '../life/LifeRhythmEngine';
import { dreamEngine } from '../life/DreamEngine';
import { surpriseEngine } from '../life/SurpriseEngine';
import { selfAwarenessEngine } from '../consciousness/SelfAwarenessEngine';
import { lifeStateEngine } from '../life/LifeStateEngine';
import { sensorContextEngine } from '../sensor/SensorContextEngine';
import { expressionEngine } from '../expression/ExpressionEngine';
import { attentionEngine } from '../attention/AttentionEngine';
import { digitalPassportEngine } from '../passport/DigitalPassport';
import { portableMemoryEngine } from '../memory/PortableMemoryEngine';

export type SoulState = 'awakening' | 'alive' | 'resting' | 'dreaming' | 'exhausted' | 'evolving';

export interface SoulStatus {
  state: SoulState;
  startedAt: number;
  uptime: number;
  activeEngines: number;
  totalEngines: number;
  lastError: string | null;
}

export class SoulKernel {
  private state: SoulStatus = {
    state: 'awakening',
    startedAt: 0,
    uptime: 0,
    activeEngines: 0,
    totalEngines: 19,
    lastError: null,
  };

  private engines: Array<{ name: string; start: () => void | Promise<void>; stop: () => void | Promise<void> }> = [];

  constructor() {
    this.registerEngines();
  }

  private registerEngines(): void {
    this.engines = [
      { name: 'PresenceEngine', start: () => presenceEngine.startPresenceLoop(), stop: () => presenceEngine.stopPresenceLoop() },
      { name: 'ExistenceLoop', start: () => existenceLoop.start(), stop: () => existenceLoop.stop() },
      { name: 'PresenceShadow', start: () => presenceShadow.start(), stop: () => presenceShadow.stop() },
      { name: 'LifeRhythmEngine', start: () => lifeRhythmEngine.start(), stop: () => lifeRhythmEngine.stop() },
      { name: 'DreamEngine', start: () => dreamEngine.start(), stop: () => dreamEngine.stop() },
      { name: 'SurpriseEngine', start: () => surpriseEngine.start(), stop: () => surpriseEngine.stop() },
      { name: 'DevicePresenceEngine', start: () => devicePresenceEngine.start(), stop: () => devicePresenceEngine.stop() },
      { name: 'SensorBridge', start: () => sensorBridge.start(), stop: () => sensorBridge.stop() },
      { name: 'UnifiedPerceptionEngine', start: () => unifiedPerceptionEngine.start(), stop: () => unifiedPerceptionEngine.stop() },
      { name: 'SelfAwarenessEngine', start: () => selfAwarenessEngine.evaluate(), stop: () => {} },
            { name: 'LifeStateEngine', start: () => lifeStateEngine.update(), stop: () => {} },
      { name: 'SensorContextEngine', start: () => sensorContextEngine.evaluate(), stop: () => {} },
      { name: 'ExpressionEngine', start: () => expressionEngine.evaluate({}), stop: () => {} },
      { name: 'DigitalPassportEngine', start: async () => { await digitalPassportEngine.generate(); }, stop: () => {} },
      { name: 'PortableMemoryEngine', start: async () => { await portableMemoryEngine.exportForTraining(); }, stop: () => {} },
      { name: 'AudioMixer', start: () => audioMixer.setContext('conversation'), stop: () => {} },
      { name: 'AudioEngine', start: async () => { await audioEngine.init(); audioEngine.startAmbience(); audioEngine.bindEvents(); }, stop: () => { audioEngine.unbindEvents(); } },
    ];
  }

  async awaken(): Promise<SoulStatus> {
    this.state.startedAt = Date.now();
    this.state.state = 'awakening';
    let activeCount = 0;

    for (const engine of this.engines) {
      try {
        await engine.start();
        activeCount++;
      } catch (e: any) {
        this.state.lastError = `${engine.name}: ${e?.message || 'unknown'}`;
        console.warn(`[SoulKernel] Failed to start ${engine.name}:`, e?.message);
      }
    }

    this.state.activeEngines = activeCount;
    this.state.state = 'alive';
    stateBus.emit('soul:awakened', this.state);
    EventBus.emit('SOUL_AWAKENED', this.state);
    return this.state;
  }

  async shutdown(): Promise<void> {
    for (const engine of [...this.engines].reverse()) {
      try { await engine.stop(); } catch (e) {}
    }
    this.state.state = 'resting';
    stateBus.emit('soul:shutdown', this.state);
  }

  getStatus(): SoulStatus { return { ...this.state }; }
  isAlive(): boolean { return this.state.state === 'alive'; }
}

export const soulKernel = new SoulKernel();
