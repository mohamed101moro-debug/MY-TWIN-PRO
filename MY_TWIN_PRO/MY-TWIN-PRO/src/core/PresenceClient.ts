import { stateBus } from './StateBus';
import { sensorBridge } from './SensorBridge';
import { devicePresenceEngine } from '../../engine/device/DevicePresenceEngine';

const clamp01 = (n: unknown, fallback = 0) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
};

/**
 * S5 Presence Client — device evidence and presentation-state projection only.
 *
 * This is intentionally not a cognitive engine. It owns the physical input
 * adapters and exposes normalized presence evidence to StateBus. It cannot
 * create intentions, meaning, memory, goals, emotion, or actions.
 */
class PresenceClient {
  private projectionTimer: ReturnType<typeof setInterval> | null = null;
  private active = false;
  private lastPresentTs = 0;

  async start(): Promise<void> {
    if (this.active) return;
    this.active = true;
    await sensorBridge.start();
    this.projectNow();
    this.projectionTimer = setInterval(() => this.projectNow(), 250);
  }

  private projectNow(): void {
    if (!this.active) return;
    const sensors = devicePresenceEngine.getSensors();
    const current = stateBus.getState();
    const acc = sensors.accelerometer;
    const magnitude = acc ? Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z) : 1;
    const present = Boolean(sensors.faceDetected);
    if (present) this.lastPresentTs = Date.now();
    const battery = clamp01(sensors.deviceBattery, Number(current.batteryLevel ?? 1));

    stateBus.patch({
      movement: clamp01(Math.abs(magnitude - 1) * 2.2, Number(current.movement ?? 0)),
      proximity: sensors.proximity == null ? Number(current.proximity ?? 0.5) : clamp01(1 - sensors.proximity / 100, Number(current.proximity ?? 0.5)),
      ambientLight: sensors.lightLevel == null ? Number(current.ambientLight ?? 0.5) : clamp01(Math.log10(Math.max(1, sensors.lightLevel) + 1) / 4, Number(current.ambientLight ?? 0.5)),
      userPresent: present || Date.now() - this.lastPresentTs < 20000,
      ...(!current.speaking ? { voiceLevel: clamp01(sensors.audioLevel, Number(current.voiceLevel ?? 0)) } : {}),
      batteryLevel: battery,
      isCharging: Boolean(sensors.isCharging),
      performanceTier: sensors.isBatteryLow ? 0.5 : battery <= 0.5 ? 0.8 : 1,
      night: Boolean(sensors.isNightTime),
      camera: Boolean(sensors.isCameraReady),
    });
  }

  stop(): void {
    this.active = false;
    if (this.projectionTimer) clearInterval(this.projectionTimer);
    this.projectionTimer = null;
    sensorBridge.stop();
  }

  refresh(): void { this.projectNow(); }
}

export const presenceClient = new PresenceClient();
